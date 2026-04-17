import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  ranking_tier: RankingTier;
  total_points: number;
  puzzles_played: number;
  puzzles_won: number;
  win_rate: number;
  current_streak: number;
  max_streak: number;
  average_attempts: number;
  total_time_ms: number;
  fastest_solve_ms: number;
  created_at: string;
  updated_at: string;
}

export type RankingTier =
  | "unranked"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master";

const TIER_THRESHOLDS: { tier: RankingTier; minWins: number }[] = [
  { tier: "master", minWins: 500 },
  { tier: "diamond", minWins: 250 },
  { tier: "platinum", minWins: 100 },
  { tier: "gold", minWins: 50 },
  { tier: "silver", minWins: 20 },
  { tier: "bronze", minWins: 5 },
  { tier: "unranked", minWins: 0 }
];

export class ProfileService {
  private client: SupabaseClient;
  private tableName = "profiles";

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static computeTier(wins: number): RankingTier {
    for (const t of TIER_THRESHOLDS) {
      if (wins >= t.minWins) return t.tier;
    }
    return "unranked";
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }

  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) return null;
    return data as UserProfile;
  }

  async upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
    try {
      const now = new Date().toISOString();
      const payload: Partial<UserProfile> & { id: string; updated_at: string } = {
        ...profile,
        updated_at: now,
        ranking_tier: profile.puzzles_won !== undefined
          ? ProfileService.computeTier(profile.puzzles_won)
          : profile.ranking_tier
      };
      const existing = await this.getProfile(profile.id);
      let data: unknown = null;
      let error: { message?: string } | null = null;

      if (existing) {
        const updateResult = await this.client
          .from(this.tableName)
          .update(payload)
          .eq("id", profile.id)
          .select()
          .single();
        data = updateResult.data;
        error = updateResult.error;
      } else {
        const insertPayload: UserProfile = {
          id: profile.id,
          email: profile.email ?? "",
          username: profile.username ?? null,
          display_name: profile.display_name ?? "Player",
          avatar_url: profile.avatar_url ?? null,
          bio: profile.bio ?? "",
          ranking_tier: (payload.ranking_tier as RankingTier | undefined) ?? "unranked",
          total_points: profile.total_points ?? 0,
          puzzles_played: profile.puzzles_played ?? 0,
          puzzles_won: profile.puzzles_won ?? 0,
          win_rate: profile.win_rate ?? 0,
          current_streak: profile.current_streak ?? 0,
          max_streak: profile.max_streak ?? 0,
          average_attempts: profile.average_attempts ?? 0,
          total_time_ms: profile.total_time_ms ?? 0,
          fastest_solve_ms: profile.fastest_solve_ms ?? 0,
          created_at: profile.created_at ?? now,
          updated_at: now,
        };
        const insertResult = await this.client
          .from(this.tableName)
          .insert(insertPayload)
          .select()
          .single();
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error || !data) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }

  async createProfile(userId: string, email: string, displayName: string): Promise<UserProfile | null> {
    return this.upsertProfile({
      id: userId,
      email,
      username: null,
      display_name: displayName,
      avatar_url: null,
      bio: "",
      ranking_tier: "unranked",
      total_points: 0,
      puzzles_played: 0,
      puzzles_won: 0,
      win_rate: 0,
      current_streak: 0,
      max_streak: 0,
      average_attempts: 0,
      total_time_ms: 0,
      fastest_solve_ms: 0,
      created_at: new Date().toISOString()
    });
  }

  async recordPuzzleResult(
    userId: string,
    won: boolean,
    attempts: number,
    timeMs: number
  ): Promise<UserProfile | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const played = profile.puzzles_played + 1;
    const wonCount = profile.puzzles_won + (won ? 1 : 0);
    const streak = won ? profile.current_streak + 1 : 0;
    const maxStreak = Math.max(profile.max_streak, streak);
    const winRate = played > 0 ? Math.round((wonCount / played) * 100) : 0;
    const totalTime = profile.total_time_ms + timeMs;
    const avgAttempts = wonCount > 0
      ? Math.round(((profile.average_attempts * profile.puzzles_won + attempts) / wonCount) * 10) / 10
      : profile.average_attempts;
    const fastest = won && (profile.fastest_solve_ms === 0 || timeMs < profile.fastest_solve_ms)
      ? timeMs
      : profile.fastest_solve_ms;

    return this.upsertProfile({
      id: userId,
      puzzles_played: played,
      puzzles_won: wonCount,
      win_rate: winRate,
      current_streak: streak,
      max_streak: maxStreak,
      average_attempts: avgAttempts,
      total_time_ms: totalTime,
      fastest_solve_ms: fastest
    });
  }

  async updateDisplayName(userId: string, name: string): Promise<UserProfile | null> {
    return this.upsertProfile({ id: userId, display_name: name });
  }

  async updateBio(userId: string, bio: string): Promise<UserProfile | null> {
    return this.upsertProfile({ id: userId, bio });
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile | null> {
    return this.upsertProfile({ id: userId, avatar_url: avatarUrl });
  }

  async getLeaderboard(limit = 50): Promise<UserProfile[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("puzzles_won", { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data as UserProfile[];
    } catch {
      return [];
    }
  }

  async setUsername(userId: string, username: string): Promise<{ error: string | null }> {
    try {
      const normalized = username.toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
        return { error: "Username must be 3-20 characters, alphanumeric and underscores only" };
      }

      const taken = !(await this.isUsernameAvailable(normalized, userId));
      if (taken) {
        return { error: "Username is already taken" };
      }

      const { error } = await this.client
        .from(this.tableName)
        .update({ username: normalized, updated_at: new Date().toISOString() })
        .eq("id", userId);

      return { error: error?.message ?? null };
    } catch {
      return { error: "Could not update username" };
    }
  }

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("username", username.toLowerCase())
      .single();

    if (error || !data) return null;
    return data as UserProfile;
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("id")
        .eq("username", username.toLowerCase())
        .limit(1);
      if (excludeUserId) {
        query = query.neq("id", excludeUserId);
      }
      const { data } = await query;

      return !data || data.length === 0;
    } catch {
      return false;
    }
  }

  async searchProfiles(query: string, limit = 20): Promise<UserProfile[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(limit);

      if (error || !data) return [];
      return data as UserProfile[];
    } catch {
      return [];
    }
  }
}
