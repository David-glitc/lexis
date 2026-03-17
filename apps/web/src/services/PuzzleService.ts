import type { SupabaseClient } from "@supabase/supabase-js";

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
  private supabase: SupabaseClient;
  private startTime: number = 0;
  private guesses: string[] = [];
  private currentPuzzleId = "";
  private currentSolution = "";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
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

  async finishPuzzle(userId: string, won: boolean): Promise<PuzzleResult> {
    const timeMs = Date.now() - this.startTime;
    const result: PuzzleResult = {
      puzzleId: this.currentPuzzleId,
      solution: this.currentSolution,
      attempts: this.guesses.length,
      won,
      guesses: [...this.guesses],
      timeMs,
    };

    const { error } = await this.supabase.from("puzzle_logs").insert({
      user_id: userId,
      puzzle_id: this.currentPuzzleId,
      puzzle_word: this.currentSolution,
      attempts: this.guesses.length,
      won,
      time_ms: timeMs,
      mode: this.currentPuzzleId.startsWith("daily") ? "daily" : "practice",
      guesses: [...this.guesses],
      date_key: this.extractDateKey(this.currentPuzzleId),
      status: won ? "won" : "lost",
    });

    if (error) throw new Error(`Failed to save puzzle log: ${error.message}`);
    return result;
  }

  async saveDailyState(
    userId: string,
    puzzleId: string,
    dateKey: string,
    guesses: string[],
    _rows: unknown[],
    attempts: number,
    status: "playing" | "won" | "lost",
    puzzleWord: string,
    mode: string,
  ): Promise<void> {
    const { error } = await this.supabase.from("puzzle_logs").upsert(
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
      { onConflict: "puzzle_id,user_id" },
    );

    if (error) throw new Error(`Failed to save daily state: ${error.message}`);
  }

  async getDailyState(userId: string, dateKey: string): Promise<PuzzleGameState | null> {
    const { data, error } = await this.supabase
      .from("puzzle_logs")
      .select("puzzle_id, guesses, attempts, status, puzzle_word, mode, date_key")
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .eq("mode", "daily")
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch daily state: ${error.message}`);
    if (!data) return null;

    return {
      puzzle_id: data.puzzle_id,
      guesses: data.guesses ?? [],
      attempts: data.attempts,
      status: data.status,
      puzzle_word: data.puzzle_word,
      mode: data.mode,
      date_key: data.date_key,
    };
  }

  async isDailyCompleted(userId: string, dateKey: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("puzzle_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .in("status", ["won", "lost"]);

    if (error) throw new Error(`Failed to check daily completion: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async getHistory(userId: string, limit = 50): Promise<PuzzleResult[]> {
    const { data, error } = await this.supabase
      .from("puzzle_logs")
      .select("puzzle_id, puzzle_word, attempts, won, guesses, time_ms")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch history: ${error.message}`);

    return (data ?? []).map((row) => ({
      puzzleId: row.puzzle_id,
      solution: row.puzzle_word,
      attempts: row.attempts,
      won: row.won,
      guesses: row.guesses ?? [],
      timeMs: row.time_ms ?? 0,
    }));
  }

  async getStats(userId: string): Promise<{
    played: number;
    won: number;
    winRate: number;
    streak: number;
    maxStreak: number;
    averageAttempts: number;
  }> {
    const { data, error } = await this.supabase
      .from("puzzle_logs")
      .select("won, attempts, mode, date_key")
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch stats: ${error.message}`);

    const rows = data ?? [];
    const played = rows.length;
    const wins = rows.filter((r) => r.won).length;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    let streak = 0;
    let maxStreak = 0;
    let current = 0;
    for (const row of rows.filter((r) => r.mode === "daily")) {
      if (row.won) {
        current++;
        maxStreak = Math.max(maxStreak, current);
      } else {
        current = 0;
      }
    }
    streak = current;

    const wonRows = rows.filter((r) => r.won);
    const averageAttempts =
      wonRows.length > 0
        ? Math.round((wonRows.reduce((s, r) => s + r.attempts, 0) / wonRows.length) * 10) / 10
        : 0;

    return { played, won: wins, winRate, streak, maxStreak, averageAttempts };
  }

  getDailyPuzzleNumber(): number {
    const epoch = new Date("2026-01-01").getTime();
    return Math.floor((Date.now() - epoch) / 86400000) + 1;
  }

  private extractDateKey(puzzleId: string): string | null {
    const match = puzzleId.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
    return match ? match[1] : null;
  }
}
