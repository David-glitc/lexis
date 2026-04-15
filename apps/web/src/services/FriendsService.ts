import type { SupabaseClient } from "@supabase/supabase-js";

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile {
  friendship_id: string;
  friend_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  ranking_tier: string;
  puzzles_won: number;
  current_streak: number;
  status: FriendshipStatus;
  is_requester: boolean;
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  seed: string | null;
  puzzle_id: string | null;
  puzzle_word: string;
  challenger_attempts: number | null;
  challenger_time_ms: number | null;
  challenged_attempts: number | null;
  challenged_time_ms: number | null;
  status: "pending" | "active" | "completed" | "expired";
  winner_id: string | null;
  time_limit_seconds: number | null;
  created_at: string;
  expires_at: string;
}

export class FriendsService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async sendFriendRequest(requesterId: string, receiverId: string): Promise<{ error: string | null }> {
    if (requesterId === receiverId) {
      return { error: "Cannot send friend request to yourself" };
    }

    const existing = await this.getFriendship(requesterId, receiverId);
    if (existing) {
      if (existing.status === "accepted") return { error: "Already friends" };
      if (existing.status === "pending") return { error: "Request already pending" };
      if (existing.status === "blocked") return { error: "This user is blocked" };
    }

    const { error } = await this.client.from("friendships").insert({
      requester_id: requesterId,
      receiver_id: receiverId,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return { error: error?.message ?? null };
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await this.client
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .eq("receiver_id", userId)
      .eq("status", "pending");

    return { error: error?.message ?? null };
  }

  async declineFriendRequest(friendshipId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await this.client
      .from("friendships")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .eq("receiver_id", userId)
      .eq("status", "pending");

    return { error: error?.message ?? null };
  }

  async removeFriend(friendshipId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await this.client
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    return { error: error?.message ?? null };
  }

  async blockUser(requesterId: string, blockedId: string): Promise<{ error: string | null }> {
    await this.client
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${requesterId},receiver_id.eq.${blockedId}),and(requester_id.eq.${blockedId},receiver_id.eq.${requesterId})`
      );

    const { error } = await this.client.from("friendships").insert({
      requester_id: requesterId,
      receiver_id: blockedId,
      status: "blocked",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return { error: error?.message ?? null };
  }

  private async getFriendship(userA: string, userB: string): Promise<Friendship | null> {
    const { data } = await this.client
      .from("friendships")
      .select("*")
      .or(
        `and(requester_id.eq.${userA},receiver_id.eq.${userB}),and(requester_id.eq.${userA.replace(userA, userB)},receiver_id.eq.${userA})`
      )
      .limit(1)
      .single();

    return data as Friendship | null;
  }

  async getFriendsList(userId: string): Promise<FriendWithProfile[]> {
    const { data: sent } = await this.client
      .from("friendships")
      .select("id, requester_id, receiver_id, status, profiles!friendships_receiver_id_fkey(id, display_name, email, avatar_url, ranking_tier, puzzles_won, current_streak)")
      .eq("requester_id", userId)
      .eq("status", "accepted");

    const { data: received } = await this.client
      .from("friendships")
      .select("id, requester_id, receiver_id, status, profiles!friendships_requester_id_fkey(id, display_name, email, avatar_url, ranking_tier, puzzles_won, current_streak)")
      .eq("receiver_id", userId)
      .eq("status", "accepted");

    const friends: FriendWithProfile[] = [];

    if (sent) {
      for (const row of sent as any[]) {
        const p = row.profiles;
        if (p) {
          friends.push({
            friendship_id: row.id,
            friend_id: p.id,
            display_name: p.display_name,
            email: p.email,
            avatar_url: p.avatar_url,
            ranking_tier: p.ranking_tier,
            puzzles_won: p.puzzles_won,
            current_streak: p.current_streak,
            status: row.status,
            is_requester: true
          });
        }
      }
    }

    if (received) {
      for (const row of received as any[]) {
        const p = row.profiles;
        if (p) {
          friends.push({
            friendship_id: row.id,
            friend_id: p.id,
            display_name: p.display_name,
            email: p.email,
            avatar_url: p.avatar_url,
            ranking_tier: p.ranking_tier,
            puzzles_won: p.puzzles_won,
            current_streak: p.current_streak,
            status: row.status,
            is_requester: false
          });
        }
      }
    }

    return friends;
  }

  async getPendingRequests(userId: string): Promise<FriendWithProfile[]> {
    const { data } = await this.client
      .from("friendships")
      .select("id, requester_id, receiver_id, status, profiles!friendships_requester_id_fkey(id, display_name, email, avatar_url, ranking_tier, puzzles_won, current_streak)")
      .eq("receiver_id", userId)
      .eq("status", "pending");

    if (!data) return [];

    return (data as any[]).map((row) => {
      const p = row.profiles;
      return {
        friendship_id: row.id,
        friend_id: p?.id ?? row.requester_id,
        display_name: p?.display_name ?? "Unknown",
        email: p?.email ?? "",
        avatar_url: p?.avatar_url ?? null,
        ranking_tier: p?.ranking_tier ?? "unranked",
        puzzles_won: p?.puzzles_won ?? 0,
        current_streak: p?.current_streak ?? 0,
        status: row.status,
        is_requester: false
      };
    });
  }

  async sendChallenge(
    challengerId: string,
    challengedId: string,
    puzzleWord: string,
    timeLimitSeconds?: number
  ): Promise<{ id: string | null; error: string | null }> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    const seed = crypto.randomUUID().replace(/-/g, "");
    const puzzleId = `challenge-${seed.slice(0, 10)}`;

    const { data, error } = await this.client
      .from("challenges")
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        seed,
        puzzle_id: puzzleId,
        puzzle_word: puzzleWord,
        status: "pending",
        time_limit_seconds: timeLimitSeconds ?? null,
        created_at: new Date().toISOString(),
        expires_at: expires.toISOString()
      })
      .select("id")
      .single();

    return { id: data?.id ?? null, error: error?.message ?? null };
  }

  async acceptChallenge(challengeId: string, userId: string): Promise<{ error: string | null }> {
    const { data: challenge } = await this.client
      .from("challenges")
      .select("challenged_id, status")
      .eq("id", challengeId)
      .single();

    if (!challenge) return { error: "Challenge not found" };
    if (challenge.challenged_id !== userId) return { error: "Only the challenged user can accept" };
    if (challenge.status !== "pending") return { error: "Challenge is not pending" };

    const { error } = await this.client
      .from("challenges")
      .update({ status: "active" })
      .eq("id", challengeId);

    return { error: error?.message ?? null };
  }

  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    const { data, error } = await this.client
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (error || !data) return null;
    return data as Challenge;
  }

  async getChallenges(userId: string): Promise<Challenge[]> {
    const { data } = await this.client
      .from("challenges")
      .select("*")
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    return (data ?? []) as Challenge[];
  }

  async submitChallengeResult(
    challengeId: string,
    userId: string,
    attempts: number,
    timeMs: number
  ): Promise<{ error: string | null }> {
    if (attempts < 1 || attempts > 6 || timeMs < 0) {
      await this.client.from("anti_cheat_events").insert({
        user_id: userId,
        challenge_id: challengeId,
        reason_code: "invalid_challenge_result_payload",
        detail: { attempts, time_ms: timeMs },
      });
      return { error: "Invalid challenge result" };
    }

    const { data: challenge } = await this.client
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (!challenge) return { error: "Challenge not found" };

    const isChallenger = challenge.challenger_id === userId;
    const update: Record<string, unknown> = isChallenger
      ? { challenger_attempts: attempts, challenger_time_ms: timeMs }
      : { challenged_attempts: attempts, challenged_time_ms: timeMs };

    const otherAttempts = isChallenger
      ? challenge.challenged_attempts
      : challenge.challenger_attempts;

    if (otherAttempts !== null) {
      const otherTime = isChallenger ? challenge.challenged_time_ms : challenge.challenger_time_ms;
      const myScore = attempts;
      const theirScore = otherAttempts;

      let winnerId: string | null = null;
      if (myScore < theirScore) winnerId = userId;
      else if (theirScore < myScore) winnerId = isChallenger ? challenge.challenged_id : challenge.challenger_id;
      else if (timeMs < (otherTime ?? Infinity)) winnerId = userId;
      else if ((otherTime ?? Infinity) < timeMs) winnerId = isChallenger ? challenge.challenged_id : challenge.challenger_id;

      update.status = "completed";
      update.winner_id = winnerId;
    } else {
      update.status = "active";
    }

    const { error } = await this.client
      .from("challenges")
      .update(update)
      .eq("id", challengeId);

    return { error: error?.message ?? null };
  }
}
