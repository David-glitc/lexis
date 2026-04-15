"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { AppShell } from "../../../components/layout/app-shell";
import { ProfileService, type UserProfile } from "../../../services/ProfileService";
import { FriendsService } from "../../../services/FriendsService";
import { useAuth } from "../../../providers/AuthProvider";
import { Button } from "../../../components/ui/button";
import { UserAvatar } from "../../../components/ui/avatars";

const supabase = createClient();
const profileService = new ProfileService(supabase);
const friendsService = new FriendsService(supabase);

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestState, setRequestState] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    profileService.getProfileByUsername(username).then((nextProfile) => {
      setProfile(nextProfile);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  const canAddFriend = useMemo(
    () => !!user && !!profile && user.id !== profile.id,
    [user, profile]
  );

  async function handleAddFriend() {
    if (!user || !profile) return;
    const { error } = await friendsService.sendFriendRequest(user.id, profile.id);
    setRequestState(error ? "error" : "sent");
  }

  return (
    <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Player Profile</h1>}>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">Loading profile...</div>
      ) : !profile ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <p className="text-zinc-400 text-sm">Profile not found.</p>
          <Link href="/leaderboard"><Button size="sm">Back to Leaderboard</Button></Link>
        </div>
      ) : (
        <div className="space-y-5 pt-4">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="flex items-center gap-4">
              <UserAvatar avatarId={profile.avatar_url} displayName={profile.display_name} size={56} />
              <div>
                <h2 className="text-xl font-display font-bold text-white">{profile.display_name}</h2>
                <p className="text-xs text-zinc-500">@{profile.username}</p>
                <p className="text-xs text-zinc-500">{profile.ranking_tier.toUpperCase()}</p>
              </div>
            </div>
            {profile.bio && <p className="mt-3 text-sm text-zinc-400">{profile.bio}</p>}
            {canAddFriend && (
              <div className="mt-4">
                <Button size="sm" onClick={handleAddFriend} disabled={requestState === "sent"}>
                  {requestState === "sent" ? "Request Sent" : "Add Friend"}
                </Button>
                {requestState === "error" && (
                  <p className="text-xs text-red-400 mt-2">Could not send friend request.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Played" value={profile.puzzles_played} />
            <StatCard label="Wins" value={profile.puzzles_won} />
            <StatCard label="Win Rate" value={`${profile.win_rate}%`} />
            <StatCard label="Streak" value={profile.current_streak} />
            <StatCard label="Best Streak" value={profile.max_streak} />
            <StatCard label="Avg Attempts" value={profile.average_attempts || "—"} />
            <StatCard label="Fastest" value={profile.fastest_solve_ms ? `${Math.floor(profile.fastest_solve_ms / 1000)}s` : "—"} />
            <StatCard label="Total Points" value={profile.total_points} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
      <div className="text-lg font-display font-bold text-white">{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{label}</div>
    </div>
  );
}

