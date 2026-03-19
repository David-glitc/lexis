"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { ProfileService, type UserProfile, type RankingTier } from "../../../services/ProfileService";
import { PointsService } from "../../../services/PointsService";
import { PuzzleService, type PuzzleResult } from "../../../services/PuzzleService";
import { AppShell } from "../../../components/layout/app-shell";
import { UserAvatar } from "../../../components/ui/avatars";

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

function RecentHistory({ history }: { history: PuzzleResult[] }) {
  const recent = history.slice(-10).reverse();
  if (recent.length === 0) return <p className="text-zinc-500 text-sm">No puzzles solved yet.</p>;

  return (
    <div className="space-y-2">
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

export default function PublicProfilePage() {
  const params = useParams();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lp, setLp] = useState(0);
  const [localStats, setLocalStats] = useState({ played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 });
  const [history, setHistory] = useState<PuzzleResult[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const p = await profileService.getProfileByUsername(username);
        
        if (!p) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(p);

        const [stats, hist, points] = await Promise.all([
          puzzleService.getStats(p.id).catch(() => ({ played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 })),
          puzzleService.getHistory(p.id).catch(() => [] as PuzzleResult[]),
          pointsService.getPoints(p.id).catch(() => 0),
        ]);

        setLocalStats(stats);
        setHistory(hist);
        setLp(points);
      } catch (error) {
        console.error("[v0] Error loading profile:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [username]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !profile) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl font-display font-bold text-white mb-2">User Not Found</h1>
          <p className="text-zinc-400 mb-6">The player @{username} doesn't exist.</p>
          <Link href="/friends" className="text-[#538d4e] hover:text-[#6abf5e]">
            Back to friends →
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <UserAvatar email={profile.email} size={64} />
              <div>
                <h1 className="text-2xl font-display font-bold text-white">{profile.display_name}</h1>
                <p className="text-zinc-400">@{profile.username ?? "player"}</p>
                {profile.bio && <p className="text-sm text-zinc-300 mt-2">{profile.bio}</p>}
              </div>
            </div>
            <TierBadge tier={profile.ranking_tier} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Points</div>
              <div className="text-2xl font-display font-bold text-white">{lp}</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Played</div>
              <div className="text-2xl font-display font-bold text-white">{localStats.played}</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Win Rate</div>
              <div className="text-2xl font-display font-bold text-white">{localStats.winRate}%</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Streak</div>
              <div className="text-2xl font-display font-bold text-white">{localStats.streak}</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
              <h3 className="text-sm font-display font-bold text-white uppercase mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Wins</span>
                  <span className="text-white font-mono">{localStats.won}/{localStats.played}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Best Streak</span>
                  <span className="text-white font-mono">{localStats.maxStreak}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Avg Attempts</span>
                  <span className="text-white font-mono">{localStats.averageAttempts}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Fastest Solve</span>
                  <span className="text-white font-mono">{formatTime(profile.fastest_solve_ms)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
              <h3 className="text-sm font-display font-bold text-white uppercase mb-4">Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Joined</span>
                  <span className="text-white font-mono">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Total Time</span>
                  <span className="text-white font-mono">{formatTime(profile.total_time_ms)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Rank</span>
                  <span className="text-white font-mono">#{profile.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
            <h3 className="text-sm font-display font-bold text-white uppercase mb-4">Recent Puzzles</h3>
            <RecentHistory history={history} />
          </div>

          {/* Back Button */}
          <div className="mt-8 flex justify-center">
            <Link href="/friends" className="text-zinc-400 hover:text-white transition-colors">
              ← Back to friends
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
