import type { SupabaseClient } from "@supabase/supabase-js";
import { wordService } from "./WordService";
import { PointsService, POINT_VALUES } from "./PointsService";

export interface DailyChallenge {
  id: string;
  date: string;
  puzzle_word: string;
  time_limit_seconds: number;
  bonus_points: number;
  created_at: string;
}

export interface DailyChallengeResult {
  userId: string;
  challengeId: string;
  attempts: number;
  timeMs: number;
  won: boolean;
  withinTimeLimit: boolean;
}

const TIME_LIMITS_BY_DAY: Record<number, number> = {
  0: 90,
  1: 60,
  2: 120,
  3: 60,
  4: 120,
  5: 60,
  6: 90,
};

export class DailyChallengeService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getTodayChallenge(): Promise<DailyChallenge> {
    const today = new Date().toISOString().slice(0, 10);

    try {
      const { data: existing, error: fetchError } = await this.client
        .from("daily_challenges")
        .select("*")
        .eq("date", today)
        .single();

      if (!fetchError && existing) return existing as DailyChallenge;

      const puzzleWord = wordService.getRandomSolution();
      const dayOfWeek = new Date().getUTCDay();
      const timeLimitSeconds = TIME_LIMITS_BY_DAY[dayOfWeek] ?? 90;

      const { data: created, error: insertError } = await this.client
        .from("daily_challenges")
        .insert({
          date: today,
          puzzle_word: puzzleWord,
          time_limit_seconds: timeLimitSeconds,
          bonus_points: POINT_VALUES.DAILY_TIMED_CHALLENGE,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!insertError && created) return created as DailyChallenge;
    } catch {
      // DB unavailable — fall through to local fallback
    }

    return this.createLocalFallback(today);
  }

  private createLocalFallback(today: string): DailyChallenge {
    const dayOfWeek = new Date().getUTCDay();
    return {
      id: `local-${today}`,
      date: today,
      puzzle_word: wordService.getRandomSolution(),
      time_limit_seconds: TIME_LIMITS_BY_DAY[dayOfWeek] ?? 90,
      bonus_points: POINT_VALUES.DAILY_TIMED_CHALLENGE,
      created_at: new Date().toISOString(),
    };
  }

  async submitResult(
    userId: string,
    challengeId: string,
    attempts: number,
    timeMs: number,
    won: boolean
  ): Promise<{ withinTimeLimit: boolean; pointsAwarded: number; error: string | null }> {
    if (challengeId.startsWith("local-")) {
      return { withinTimeLimit: false, pointsAwarded: 0, error: null };
    }

    try {
      const { data: challenge, error: fetchErr } = await this.client
        .from("daily_challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (fetchErr || !challenge) {
        return { withinTimeLimit: false, pointsAwarded: 0, error: "Challenge not found" };
      }

      const timeLimitMs = (challenge as DailyChallenge).time_limit_seconds * 1000;
      const withinTimeLimit = timeMs < timeLimitMs;
      let pointsAwarded = 0;

      if (won && withinTimeLimit) {
        pointsAwarded = (challenge as DailyChallenge).bonus_points;
        const pointsService = new PointsService(this.client);
        await pointsService.awardPoints(
          userId, pointsAwarded, "daily_timed_challenge",
          { challenge_id: challengeId, attempts, time_ms: timeMs }
        ).catch(() => {});
      }

      await this.client.from("puzzle_logs").insert({
        user_id: userId,
        puzzle_word: (challenge as DailyChallenge).puzzle_word,
        mode: "daily_speed",
        attempts,
        time_ms: timeMs,
        won,
        status: won ? "won" : "lost",
        created_at: new Date().toISOString(),
      });

      return { withinTimeLimit, pointsAwarded, error: null };
    } catch {
      return { withinTimeLimit: false, pointsAwarded: 0, error: null };
    }
  }

  async getTodayLeaderboard(
    challengeId: string
  ): Promise<Array<{
    user_id: string;
    username: string;
    display_name: string;
    attempts: number;
    time_ms: number;
  }>> {
    try {
      const { data: challenge } = await this.client
        .from("daily_challenges")
        .select("puzzle_word")
        .eq("id", challengeId)
        .single();

      if (!challenge) return [];

      const { data } = await this.client
        .from("puzzle_logs")
        .select("user_id, attempts, time_ms, profiles(username, display_name)")
        .eq("mode", "daily_speed")
        .eq("won", true)
        .order("attempts", { ascending: true })
        .order("time_ms", { ascending: true });

      if (!data) return [];

      return (data as any[]).map((row) => ({
        user_id: row.user_id,
        username: row.profiles?.username ?? "",
        display_name: row.profiles?.display_name ?? "",
        attempts: row.attempts,
        time_ms: row.time_ms,
      }));
    } catch {
      return [];
    }
  }
}
