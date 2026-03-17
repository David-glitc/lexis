"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { useAuth } from "../../providers/AuthProvider";
import { ProfileService, type UserProfile, type RankingTier } from "../../services/ProfileService";
import { PointsService } from "../../services/PointsService";
import { PuzzleService, type PuzzleResult } from "../../services/PuzzleService";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";

const supabase = createClient();
const profileService = new ProfileService(supabase);
const pointsService = new PointsService(supabase);
const puzzleService = new PuzzleService(supabase);

const TIER_COLORS: Record<RankingTier, string> = {
  unranked: "text-zinc-500 border-zinc-700",
  bronze: "text-orange-400 border-orange-500/30",
  silver: "text-zinc-300 border-zinc-400/30",
  gold: "text-yellow-400 border-yellow-500/30",
  platinum: "text-slate-300 border-slate-400/30",
  diamond: "text-cyan-400 border-cyan-500/30",
  master: "text-purple-400 border-purple-500/30"
};

const TIER_LABELS: Record<RankingTier, string> = {
  unranked: "Unranked",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  master: "Master"
};

function TierBadge({ tier }: { tier: RankingTier }) {
  return (
    <span className={`inline-block text-xs px-3 py-1 rounded-full border ${TIER_COLORS[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

function formatTime(ms: number): string {
  if (ms === 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function GuessDistribution({ history }: { history: PuzzleResult[] }) {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.filter((r) => r.won).forEach((r) => {
    if (r.attempts >= 1 && r.attempts <= 6) dist[r.attempts]++;
  });
  const maxCount = Math.max(...Object.values(dist), 1);

  return (
    <div className="space-y-1.5">
      <div className="text-sm text-zinc-400 mb-2">Guess Distribution</div>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 w-3">{n}</span>
          <div className="flex-1 h-5 bg-zinc-900 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500/80 rounded flex items-center justify-end px-1.5"
              style={{ width: `${Math.max((dist[n] / maxCount) * 100, dist[n] > 0 ? 10 : 0)}%` }}
            >
              {dist[n] > 0 && <span className="text-[10px] text-white">{dist[n]}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentHistory({ history }: { history: PuzzleResult[] }) {
  const recent = history.slice(-20).reverse();
  if (recent.length === 0) return <p className="text-zinc-500 text-sm">No puzzles solved yet.</p>;

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-400 mb-2">Recent Puzzles</div>
      {recent.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900 border border-zinc-800 p-3">
          <div>
            <span className="text-sm font-mono text-white">{r.solution.toUpperCase()}</span>
            <span className="text-xs text-zinc-600 ml-2">#{r.puzzleId === "daily" ? "Daily" : r.puzzleId.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-500">{r.attempts}/6</span>
            <span className="text-zinc-600">{formatTime(r.timeMs)}</span>
            <span className={r.won ? "text-emerald-400" : "text-red-400"}>
              {r.won ? "W" : "L"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lp, setLp] = useState(0);
  const [localStats, setLocalStats] = useState({ played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 });
  const [history, setHistory] = useState<PuzzleResult[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const [p_result, stats, hist] = await Promise.all([
        profileService.getProfile(user!.id).then(async (p) => {
          if (p) return p;
          return profileService.createProfile(user!.id, user!.email ?? "", user!.email?.split("@")[0] ?? "Player");
        }),
        puzzleService.getStats(user!.id).catch(() => ({ played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 })),
        puzzleService.getHistory(user!.id).catch(() => [] as PuzzleResult[]),
      ]);
      const p = p_result;
      setLocalStats(stats);
      setHistory(hist);
      if (p) {
        setProfile(p);
        setDisplayName(p.display_name);
        setUsername(p.username ?? "");
        setBio(p.bio);
      }

      const points = await pointsService.getPoints(user!.id);
      setLp(points);

      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  async function handleSaveProfile() {
    if (!user) return;
    setUsernameError("");

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername && trimmedUsername !== (profile?.username ?? "")) {
      const { error } = await profileService.setUsername(user.id, trimmedUsername);
      if (error) {
        setUsernameError(error);
        return;
      }
    }

    const updated = await profileService.upsertProfile({
      id: user.id,
      display_name: displayName,
      bio
    });
    if (updated) {
      if (trimmedUsername) updated.username = trimmedUsername;
      setProfile(updated);
    }
    setEditing(false);
  }

  const pageHeader = (
    <div className="font-display text-lg font-bold text-white">Profile</div>
  );

  if (loading || authLoading) {
    return (
      <AppShell header={pageHeader}>
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell header={pageHeader}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-white text-lg">Sign In to View Profile</div>
          <p className="text-zinc-500 text-sm text-center">Track your progress, build your ranking, and compete with friends.</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tier: RankingTier = profile?.ranking_tier ?? ProfileService.computeTier(localStats.won);
  const stats = profile ?? {
    puzzles_played: localStats.played,
    puzzles_won: localStats.won,
    win_rate: localStats.winRate,
    current_streak: localStats.streak,
    max_streak: localStats.maxStreak,
    average_attempts: localStats.averageAttempts,
    fastest_solve_ms: 0,
    total_time_ms: 0,
    total_points: 0
  };

  return (
    <AppShell header={pageHeader}>
      <div className="space-y-6 pt-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl text-white font-display font-bold">
              {(profile?.display_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
            </span>
          </div>
          {editing ? (
            <div className="space-y-3 max-w-xs mx-auto">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#6abf5e] font-body transition-colors"
                placeholder="Display name"
              />
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError("");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#6abf5e] font-body transition-colors"
                  placeholder="Username"
                />
                <p className="text-[10px] text-zinc-600 mt-1 text-left">3-20 chars, a-z, 0-9, _</p>
                {usernameError && <p className="text-[11px] text-red-400 mt-0.5 text-left">{usernameError}</p>}
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#6abf5e] resize-none font-body transition-colors"
                placeholder="Short bio..."
              />
              <div className="flex gap-2">
                <Button size="sm" fullWidth onClick={handleSaveProfile}>Save</Button>
                <Button size="sm" variant="ghost" fullWidth onClick={() => { setEditing(false); setUsernameError(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl text-white font-display font-bold">{profile?.display_name ?? user.email?.split("@")[0]}</h1>
              {profile?.username && <p className="text-xs text-zinc-500">@{profile.username}</p>}
              <p className="text-xs text-zinc-500 mb-1">{user.email}</p>
              {profile?.bio && <p className="text-sm text-zinc-400 mb-2">{profile.bio}</p>}
              <div className="flex items-center justify-center gap-2 mb-2">
                <TierBadge tier={tier} />
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { val: stats.puzzles_played, label: "Played" },
            { val: `${stats.win_rate}%`, label: "Win Rate" },
            { val: stats.current_streak, label: "Streak" },
            { val: stats.max_streak, label: "Best Streak" },
            { val: stats.average_attempts || "—", label: "Avg Attempts" },
            { val: formatTime(stats.fastest_solve_ms), label: "Fastest" },
            { val: stats.total_points, label: "Total Points" },
            { val: lp, label: "LP" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <div className="text-xl font-display font-bold text-white">{s.val}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <GuessDistribution history={history} />
        </div>

        <RecentHistory history={history} />
      </div>
    </AppShell>
  );
}
