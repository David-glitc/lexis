import type { SupabaseClient } from "@supabase/supabase-js";
import { toUtcDateKey } from "../utils/utc-date";

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  metadata: Record<string, any>;
  created_at: string;
}

const POINTS_BY_GUESSES: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 25,
  6: 15,
};

export const POINT_VALUES = {
  CHALLENGE_WIN_BONUS: 50,
  DAILY_TIMED_CHALLENGE: 50,
  STREAK_7_DAY_BONUS: 30,
  STREAK_30_DAY_BONUS: 100,
} as const;

export class PointsService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static getPointsForGuesses(guesses: number): number {
    return POINTS_BY_GUESSES[guesses] ?? 0;
  }

  async awardPoints(
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, any> = {}
  ): Promise<{ error: string | null }> {
    try {
      const idempotencyKey =
        typeof metadata.idempotency_key === "string" && metadata.idempotency_key.length > 0
          ? metadata.idempotency_key
          : null;
      if (idempotencyKey) {
        const { data: existingAward } = await this.client
          .from("points_ledger")
          .select("id")
          .eq("user_id", userId)
          .eq("reason", reason)
          .eq("metadata->>idempotency_key", idempotencyKey)
          .limit(1)
          .maybeSingle();
        if (existingAward) {
          return { error: null };
        }
      }

      let adjustedAmount = amount;
      const mode = typeof metadata.mode === "string" ? metadata.mode : "";
      if (mode === "infinite") {
        const todayKey = toUtcDateKey(new Date());
        const { count } = await this.client
          .from("points_ledger")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("reason", "puzzle_win")
          .eq("metadata->>mode", "infinite")
          .gte("created_at", `${todayKey}T00:00:00.000Z`);

        const sameDayInfiniteWins = count ?? 0;
        const weight = sameDayInfiniteWins <= 5 ? 1 : sameDayInfiniteWins <= 12 ? 0.5 : 0.25;
        adjustedAmount = Math.max(1, Math.floor(amount * weight));
      }

      const { error: ledgerError } = await this.client.from("points_ledger").insert({
        user_id: userId,
        amount: adjustedAmount,
        reason,
        metadata: { ...metadata, original_amount: amount, adjusted_amount: adjustedAmount },
        created_at: new Date().toISOString(),
      });

      if (ledgerError) return { error: ledgerError.message };

      const { data: profile } = await this.client
        .from("profiles")
        .select("total_points")
        .eq("id", userId)
        .single();

      const currentPoints = (profile?.total_points as number) ?? 0;

      const { error: updateError } = await this.client
        .from("profiles")
        .update({ total_points: currentPoints + adjustedAmount, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) return { error: updateError.message };

      const { data: allLedgerRows } = await this.client
        .from("points_ledger")
        .select("amount")
        .eq("user_id", userId);
      const canonicalTotalPoints = (allLedgerRows ?? []).reduce(
        (sum, row) => sum + (Number((row as { amount: number }).amount) || 0),
        0
      );
      await this.client
        .from("profiles")
        .update({ total_points: canonicalTotalPoints, updated_at: new Date().toISOString() })
        .eq("id", userId);

      return { error: null };
    } catch {
      return { error: "DB unavailable" };
    }
  }

  async getDailySpeedLeaderboard(dateKey: string, limit = 50): Promise<Array<{
    user_id: string;
    username: string;
    display_name: string;
    attempts: number;
    time_ms: number;
  }>> {
    try {
      const { data } = await this.client
        .from("puzzle_logs")
        .select("user_id, attempts, time_ms, created_at, profiles(username, display_name)")
        .eq("mode", "daily_speed")
        .eq("date_key", dateKey)
        .eq("won", true)
        .order("attempts", { ascending: true })
        .order("time_ms", { ascending: true })
        .order("created_at", { ascending: true });

      if (!data) return [];
      const firstByUser = new Map<string, any>();
      for (const row of data as any[]) {
        if (!firstByUser.has(row.user_id)) firstByUser.set(row.user_id, row);
      }

      return Array.from(firstByUser.values()).slice(0, limit).map((row) => ({
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

  async getInfiniteSpeedLeaderboard(limit = 50): Promise<Array<{
    user_id: string;
    username: string;
    display_name: string;
    weighted_score: number;
    runs: number;
  }>> {
    try {
      const { data } = await this.client
        .from("puzzle_logs")
        .select("user_id, attempts, time_ms, won, profiles(username, display_name)")
        .eq("mode", "speed")
        .eq("won", true)
        .order("created_at", { ascending: false })
        .limit(3000);

      if (!data) return [];
      const byUser = new Map<string, { username: string; display_name: string; weighted_score: number; runs: number }>();

      for (const row of data as any[]) {
        const existing = byUser.get(row.user_id) ?? {
          username: row.profiles?.username ?? "",
          display_name: row.profiles?.display_name ?? "",
          weighted_score: 0,
          runs: 0,
        };
        const base = Math.max(1, 200 - row.attempts * 20 - Math.floor((row.time_ms ?? 0) / 2000));
        const weight = existing.runs < 20 ? 1 : existing.runs < 50 ? 0.5 : 0.2;
        existing.weighted_score += base * weight;
        existing.runs += 1;
        byUser.set(row.user_id, existing);
      }

      return Array.from(byUser.entries())
        .map(([user_id, value]) => ({ user_id, ...value }))
        .sort((a, b) => b.weighted_score - a.weighted_score)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  async getPoints(userId: string): Promise<number> {
    try {
      const { data } = await this.client
        .from("profiles")
        .select("total_points")
        .eq("id", userId)
        .single();

      return (data?.total_points as number) ?? 0;
    } catch {
      return 0;
    }
  }

  async getPointsHistory(userId: string, limit = 50): Promise<PointsLedgerEntry[]> {
    try {
      const { data } = await this.client
        .from("points_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return (data ?? []) as PointsLedgerEntry[];
    } catch {
      return [];
    }
  }

  async getGlobalLeaderboard(
    limit: number,
    offset = 0
  ): Promise<
    Array<{
      id: string;
      username: string;
      display_name: string;
      total_points: number;
      ranking_tier: string;
      avatar_url: string | null;
    }>
  > {
    try {
      const { data } = await this.client
        .from("profiles")
        .select("id, username, display_name, total_points, ranking_tier, avatar_url")
        .order("total_points", { ascending: false })
        .range(offset, offset + limit - 1);

      return (data ?? []) as Array<{
        id: string;
        username: string;
        display_name: string;
        total_points: number;
        ranking_tier: string;
        avatar_url: string | null;
      }>;
    } catch {
      return [];
    }
  }

  async getFriendsLeaderboard(
    userId: string,
    limit: number
  ): Promise<
    Array<{
      id: string;
      username: string;
      display_name: string;
      total_points: number;
      ranking_tier: string;
      avatar_url: string | null;
    }>
  > {
    type LeaderboardEntry = {
      id: string;
      username: string;
      display_name: string;
      total_points: number;
      ranking_tier: string;
      avatar_url: string | null;
    };

    try {
      const { data: sentFriends } = await this.client
        .from("friendships")
        .select("receiver_id")
        .eq("requester_id", userId)
        .eq("status", "accepted");

      const { data: receivedFriends } = await this.client
        .from("friendships")
        .select("requester_id")
        .eq("receiver_id", userId)
        .eq("status", "accepted");

      const friendIds = new Set<string>();
      friendIds.add(userId);
      for (const row of sentFriends ?? []) friendIds.add(row.receiver_id);
      for (const row of receivedFriends ?? []) friendIds.add(row.requester_id);

      const { data } = await this.client
        .from("profiles")
        .select("id, username, display_name, total_points, ranking_tier, avatar_url")
        .in("id", Array.from(friendIds))
        .order("total_points", { ascending: false })
        .limit(limit);

      return (data ?? []) as LeaderboardEntry[];
    } catch {
      return [];
    }
  }

  async getUserRank(userId: string): Promise<number> {
    try {
      const userPoints = await this.getPoints(userId);

      const { count } = await this.client
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("total_points", userPoints);

      return (count ?? 0) + 1;
    } catch {
      return 0;
    }
  }
}
