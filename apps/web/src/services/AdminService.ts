import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "./ProfileService";

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalPuzzlesPlayed: number;
  totalChallenges: number;
  averageWinRate: number;
}

export interface PuzzleLog {
  id: string;
  user_id: string;
  puzzle_word: string;
  attempts: number;
  won: boolean;
  time_ms: number;
  mode: "daily" | "infinite" | "challenge";
  created_at: string;
}

export class AdminService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getAdminStats(): Promise<AdminStats> {
    const [usersRes, puzzlesRes, challengesRes] = await Promise.all([
      this.client.from("profiles").select("id, puzzles_played, win_rate, updated_at"),
      this.client.from("puzzle_logs").select("id", { count: "exact", head: true }),
      this.client.from("challenges").select("id", { count: "exact", head: true })
    ]);

    const users = usersRes.data ?? [];
    const totalUsers = users.length;
    const today = new Date().toISOString().split("T")[0];
    const activeToday = users.filter(
      (u: any) => u.updated_at?.startsWith(today)
    ).length;
    const totalPuzzlesPlayed = users.reduce(
      (sum: number, u: any) => sum + (u.puzzles_played ?? 0),
      0
    );
    const averageWinRate = totalUsers > 0
      ? Math.round(users.reduce((sum: number, u: any) => sum + (u.win_rate ?? 0), 0) / totalUsers)
      : 0;

    return {
      totalUsers,
      activeToday,
      totalPuzzlesPlayed,
      totalChallenges: challengesRes.count ?? 0,
      averageWinRate
    };
  }

  async getUsers(page = 0, limit = 50): Promise<{ users: UserProfile[]; total: number }> {
    const from = page * limit;
    const { data, count, error } = await this.client
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    return {
      users: (data ?? []) as UserProfile[],
      total: count ?? 0
    };
  }

  async searchUsers(query: string): Promise<UserProfile[]> {
    const { data } = await this.client
      .from("profiles")
      .select("*")
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    return (data ?? []) as UserProfile[];
  }

  async getPuzzleLogs(limit = 100): Promise<PuzzleLog[]> {
    const { data } = await this.client
      .from("puzzle_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []) as PuzzleLog[];
  }

  async deleteUser(userId: string): Promise<{ error: string | null }> {
    await this.client.from("friendships")
      .delete()
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    await this.client.from("challenges")
      .delete()
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);

    await this.client.from("puzzle_logs")
      .delete()
      .eq("user_id", userId);

    const { error } = await this.client
      .from("profiles")
      .delete()
      .eq("id", userId);

    return { error: error?.message ?? null };
  }

  async resetUserStats(userId: string): Promise<{ error: string | null }> {
    const { error } = await this.client
      .from("profiles")
      .update({
        puzzles_played: 0,
        puzzles_won: 0,
        win_rate: 0,
        current_streak: 0,
        max_streak: 0,
        average_attempts: 0,
        total_time_ms: 0,
        fastest_solve_ms: 0,
        ranking_tier: "unranked",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    return { error: error?.message ?? null };
  }

  async getSystemHealth(): Promise<{ database: boolean; auth: boolean; storage: boolean }> {
    const checks = await Promise.allSettled([
      this.client.from("profiles").select("id").limit(1),
      this.client.auth.getUser(),
      this.client.storage.listBuckets()
    ]);

    return {
      database: checks[0].status === "fulfilled" && !(checks[0].value as any).error,
      auth: checks[1].status === "fulfilled",
      storage: checks[2].status === "fulfilled" && !(checks[2].value as any).error
    };
  }
}
