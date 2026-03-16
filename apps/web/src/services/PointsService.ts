import type { SupabaseClient } from "@supabase/supabase-js";

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
    const { error: ledgerError } = await this.client.from("points_ledger").insert({
      user_id: userId,
      amount,
      reason,
      metadata,
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
      .update({ total_points: currentPoints + amount })
      .eq("id", userId);

    return { error: updateError?.message ?? null };
  }

  async getPoints(userId: string): Promise<number> {
    const { data } = await this.client
      .from("profiles")
      .select("total_points")
      .eq("id", userId)
      .single();

    return (data?.total_points as number) ?? 0;
  }

  async getPointsHistory(userId: string, limit = 50): Promise<PointsLedgerEntry[]> {
    const { data } = await this.client
      .from("points_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []) as PointsLedgerEntry[];
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
  }

  async getUserRank(userId: string): Promise<number> {
    const userPoints = await this.getPoints(userId);

    const { count } = await this.client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("total_points", userPoints);

    return (count ?? 0) + 1;
  }
}
