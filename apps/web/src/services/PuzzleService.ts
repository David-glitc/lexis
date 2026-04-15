import type { SupabaseClient } from "@supabase/supabase-js";
import { fromUtcDateKey, toUtcDateKey } from "../utils/utc-date";

export interface PuzzleResult {
  puzzleId: string;
  solution: string;
  attempts: number;
  won: boolean;
  guesses: string[];
  timeMs: number;
}

export interface PuzzleGameState {
  puzzle_id: string;
  guesses: string[];
  attempts: number;
  status: "playing" | "won" | "lost";
  puzzle_word: string;
  mode: string;
  date_key: string | null;
}

export class PuzzleService {
  private client: SupabaseClient;
  private startTime = 0;
  private guesses: string[] = [];
  private currentPuzzleId = "";
  private currentSolution = "";

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  startPuzzle(puzzleId: string, solution: string): void {
    this.startTime = Date.now();
    this.guesses = [];
    this.currentPuzzleId = puzzleId;
    this.currentSolution = solution;
  }

  recordGuess(guess: string): void {
    this.guesses.push(guess.toLowerCase());
  }

  async finishPuzzle(userId: string, won: boolean, mode: string): Promise<PuzzleResult> {
    const timeMs = Date.now() - this.startTime;
    const result: PuzzleResult = {
      puzzleId: this.currentPuzzleId,
      solution: this.currentSolution,
      attempts: this.guesses.length,
      won,
      guesses: [...this.guesses],
      timeMs,
    };

    const dateKey = this.extractDateKey(this.currentPuzzleId);

    try {
      if (timeMs < 1500 || this.guesses.length === 0 || this.guesses.length > 6) {
        await this.client.from("anti_cheat_events").insert({
          user_id: userId,
          session_id: null,
          reason_code: "suspicious_puzzle_finalize",
          detail: {
            mode,
            time_ms: timeMs,
            guesses: this.guesses.length,
            won,
            puzzle_id: this.currentPuzzleId,
          },
        });
      }
      if (dateKey) {
        await this.client.from("puzzle_logs").upsert(
          {
            user_id: userId,
            puzzle_id: this.currentPuzzleId,
            puzzle_word: this.currentSolution,
            attempts: this.guesses.length,
            won,
            time_ms: timeMs,
            mode,
            guesses: this.guesses,
            date_key: dateKey,
            status: won ? "won" : "lost",
          },
          { onConflict: "user_id,date_key", ignoreDuplicates: false }
        );
      } else {
        await this.client.from("puzzle_logs").insert({
          user_id: userId,
          puzzle_id: this.currentPuzzleId,
          puzzle_word: this.currentSolution,
          attempts: this.guesses.length,
          won,
          time_ms: timeMs,
          mode,
          guesses: this.guesses,
          date_key: null,
          status: won ? "won" : "lost",
        });
      }
    } catch {
      // DB unavailable — silently continue
    }

    await this.syncProfileStats(userId).catch(() => {});

    return result;
  }

  async saveDailyState(
    userId: string,
    puzzleId: string,
    dateKey: string,
    guesses: string[],
    attempts: number,
    status: "playing" | "won" | "lost",
    puzzleWord: string,
    mode: string,
  ): Promise<void> {
    try {
      await this.client.from("puzzle_logs").upsert(
        {
          user_id: userId,
          puzzle_id: puzzleId,
          date_key: dateKey,
          guesses,
          attempts,
          status,
          puzzle_word: puzzleWord,
          mode,
          won: status === "won",
          time_ms: Date.now() - this.startTime,
        },
        { onConflict: "user_id,date_key", ignoreDuplicates: false }
      );
    } catch {
      // DB unavailable
    }
  }

  async getDailyState(userId: string, dateKey: string): Promise<PuzzleGameState | null> {
    try {
      const { data, error } = await this.client
        .from("puzzle_logs")
        .select("puzzle_id, guesses, attempts, status, puzzle_word, mode, date_key")
        .eq("user_id", userId)
        .eq("date_key", dateKey)
        .eq("mode", "daily")
        .maybeSingle();

      if (error || !data) return null;

      return {
        puzzle_id: data.puzzle_id,
        guesses: data.guesses ?? [],
        attempts: data.attempts,
        status: data.status,
        puzzle_word: data.puzzle_word,
        mode: data.mode,
        date_key: data.date_key,
      };
    } catch {
      return null;
    }
  }

  async isDailyCompleted(userId: string, dateKey: string): Promise<boolean> {
    try {
      const { count, error } = await this.client
        .from("puzzle_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("date_key", dateKey)
        .in("status", ["won", "lost"]);

      if (error) return false;
      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async getHistory(userId: string, limit = 50): Promise<PuzzleResult[]> {
    try {
      const { data, error } = await this.client
        .from("puzzle_logs")
        .select("puzzle_id, puzzle_word, attempts, won, guesses, time_ms")
        .eq("user_id", userId)
        .in("status", ["won", "lost"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row) => ({
        puzzleId: row.puzzle_id ?? "",
        solution: row.puzzle_word,
        attempts: row.attempts,
        won: row.won,
        guesses: row.guesses ?? [],
        timeMs: row.time_ms ?? 0,
      }));
    } catch {
      return [];
    }
  }

  async getStats(userId: string): Promise<{
    played: number;
    won: number;
    winRate: number;
    streak: number;
    maxStreak: number;
    averageAttempts: number;
  }> {
    const empty = { played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 };
    try {
      const { data, error } = await this.client
        .from("puzzle_logs")
        .select("won, attempts, mode")
        .eq("user_id", userId)
        .in("status", ["won", "lost"])
        .order("created_at", { ascending: true });

      if (error || !data) return empty;

      const rows = data;
      const played = rows.length;
      const wins = rows.filter((r) => r.won).length;
      const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

      let maxStreak = 0;
      let current = 0;
      for (const row of rows) {
        if (row.won) { current++; maxStreak = Math.max(maxStreak, current); }
        else { current = 0; }
      }

      const wonRows = rows.filter((r) => r.won);
      const averageAttempts =
        wonRows.length > 0
          ? Math.round((wonRows.reduce((s, r) => s + r.attempts, 0) / wonRows.length) * 10) / 10
          : 0;

      return { played, won: wins, winRate, streak: current, maxStreak, averageAttempts };
    } catch {
      return empty;
    }
  }

  getDailyPuzzleNumber(): number {
    const epoch = new Date("2026-01-01").getTime();
    return Math.floor((Date.now() - epoch) / 86400000) + 1;
  }

  async getDailyHistory(userId: string): Promise<Array<{ date: string; solved: boolean }>> {
    try {
      const { data, error } = await this.client
        .from("puzzle_logs")
        .select("date_key, status")
        .eq("user_id", userId)
        .eq("mode", "daily")
        .not("date_key", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error || !data) return [];

      return data.map((row) => ({
        date: row.date_key,
        solved: row.status === "won",
      }));
    } catch {
      return [];
    }
  }

  private extractDateKey(puzzleId: string): string | null {
    const match = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
    return match ? match[1] : null;
  }

  private async syncProfileStats(userId: string): Promise<void> {
    const { data: rows, error } = await this.client
      .from("puzzle_logs")
      .select("won, attempts, time_ms, mode, date_key, created_at")
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .order("created_at", { ascending: true });
    if (error || !rows) return;

    const played = rows.length;
    const wonCount = rows.filter((r) => r.won).length;
    const winRate = played > 0 ? Math.round((wonCount / played) * 100) : 0;

    let maxStreak = 0;
    let running = 0;
    for (const row of rows) {
      if (row.won) {
        running += 1;
        if (running > maxStreak) maxStreak = running;
      } else {
        running = 0;
      }
    }

    const wonRows = rows.filter((r) => r.won);
    const averageAttempts = wonRows.length > 0
      ? Math.round((wonRows.reduce((sum, row) => sum + (row.attempts ?? 0), 0) / wonRows.length) * 10) / 10
      : 0;
    const totalTimeMs = rows.reduce((sum, row) => sum + (row.time_ms ?? 0), 0);
    const fastestSolveMs = wonRows.length > 0
      ? Math.min(...wonRows.map((row) => row.time_ms ?? Number.MAX_SAFE_INTEGER))
      : 0;

    const dailyWonDates = new Set(
      rows
        .filter((row) => row.mode === "daily" && row.won && row.date_key)
        .map((row) => row.date_key as string)
    );

    const todayKey = toUtcDateKey(new Date());
    let dailyCurrentStreak = 0;
    let streakCursor = fromUtcDateKey(todayKey);
    while (true) {
      const key = toUtcDateKey(streakCursor);
      if (!dailyWonDates.has(key)) break;
      dailyCurrentStreak += 1;
      streakCursor = new Date(streakCursor.getTime() - 86400000);
    }

    await this.client
      .from("profiles")
      .update({
        puzzles_played: played,
        puzzles_won: wonCount,
        win_rate: winRate,
        current_streak: dailyCurrentStreak,
        max_streak: Math.max(maxStreak, dailyCurrentStreak),
        average_attempts: averageAttempts,
        total_time_ms: totalTimeMs,
        fastest_solve_ms: fastestSolveMs === Number.MAX_SAFE_INTEGER ? 0 : fastestSolveMs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }
}
