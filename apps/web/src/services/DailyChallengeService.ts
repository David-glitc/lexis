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
  0: 90,  // Sunday
  1: 60,  // Monday
  2: 120, // Tuesday
  3: 60,  // Wednesday
  4: 120, // Thursday
  5: 60,  // Friday
  6: 90,  // Saturday
};

export class DailyChallengeService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getTodayChallenge(): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await this.client
      .from("daily_challenges")
      .select("*")
      .eq("date", today)
      .single();

    if (existing) return existing as DailyChallenge;

    const puzzleWord = wordService.getRandomSolution();
    const dayOfWeek = new Date().getUTCDay();
    const timeLimitSeconds = TIME_LIMITS_BY_DAY[dayOfWeek] ?? 90;

    const { data: created, error } = await this.client
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

    if (error || !created) return null;
    return created as DailyChallenge;
  }

  async submitResult(
    userId: string,
    challengeId: string,
    attempts: number,
    timeMs: number,
    won: boolean
  ): Promise<{ withinTimeLimit: boolean; pointsAwarded: number; error: string | null }> {
    const { data: challenge } = await this.client
      .from("daily_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (!challenge) {
      return { withinTimeLimit: false, pointsAwarded: 0, error: "Challenge not found" };
    }

    const timeLimitMs = (challenge as DailyChallenge).time_limit_seconds * 1000;
    const withinTimeLimit = timeMs < timeLimitMs;
    let pointsAwarded = 0;

    if (won && withinTimeLimit) {
      pointsAwarded = (challenge as DailyChallenge).bonus_points;
      const pointsService = new PointsService(this.client);
      const { error: awardError } = await pointsService.awardPoints(
        userId,
        pointsAwarded,
        "daily_timed_challenge",
        { challenge_id: challengeId, attempts, time_ms: timeMs }
      );
      if (awardError) {
        return { withinTimeLimit, pointsAwarded: 0, error: awardError };
      }
    }

    const { error: logError } = await this.client.from("puzzle_logs").insert({
      user_id: userId,
      puzzle_word: (challenge as DailyChallenge).puzzle_word,
      mode: "daily_speed",
      attempts,
      time_ms: timeMs,
      won,
      challenge_id: challengeId,
      created_at: new Date().toISOString(),
    });

    return {
      withinTimeLimit,
      pointsAwarded,
      error: logError?.message ?? null,
    };
  }

  async getTodayLeaderboard(
    challengeId: string
  ): Promise<
    Array<{
      user_id: string;
      username: string;
      display_name: string;
      attempts: number;
      time_ms: number;
    }>
  > {
    const { data: challenge } = await this.client
      .from("daily_challenges")
      .select("puzzle_word")
      .eq("id", challengeId)
      .single();

    if (!challenge) return [];

    const { data } = await this.client
      .from("puzzle_logs")
      .select("user_id, attempts, time_ms, profiles(username, display_name)")
      .eq("challenge_id", challengeId)
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
  }
}
