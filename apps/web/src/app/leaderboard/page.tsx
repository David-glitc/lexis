"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../providers/AuthProvider";
import { AppShell } from "../../components/layout/app-shell";
import { createClient } from "../../utils/supabase/client";
import { PointsService } from "../../services/PointsService";

type Tab = "global" | "friends";

type LeaderboardEntry = {
  id: string;
  username: string;
  display_name: string;
  total_points: number;
  ranking_tier: string;
  avatar_url: string | null;
};

const supabase = createClient();
const pointsService = new PointsService(supabase);

const TIER_COLORS: Record<string, string> = {
  unranked: "text-zinc-500 border-zinc-700",
  bronze: "text-orange-400 border-orange-500/30",
  silver: "text-zinc-300 border-zinc-400/30",
  gold: "text-yellow-400 border-yellow-500/30",
  platinum: "text-slate-300 border-slate-400/30",
  diamond: "text-cyan-400 border-cyan-500/30",
  master: "text-purple-400 border-purple-500/30",
};

const RANK_BORDER: Record<number, string> = {
  1: "border-l-yellow-400",
  2: "border-l-zinc-300",
  3: "border-l-orange-400",
};

function formatPoints(n: number): string {
  return n.toLocaleString() + " LP";
}

function TierBadge({ tier }: { tier: string }) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.unranked;
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${colors}`}>
      {tier}
    </span>
  );
}

function RankNumber({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg font-display font-bold text-yellow-400">1</span>;
  if (rank === 2) return <span className="text-lg font-display font-bold text-zinc-300">2</span>;
  if (rank === 3) return <span className="text-lg font-display font-bold text-orange-400">3</span>;
  return <span className="text-sm font-mono text-zinc-500">{rank}</span>;
}

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const topBorder = RANK_BORDER[rank] ?? "";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        isCurrentUser
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : `border-white/[0.06] bg-white/[0.03] ${topBorder ? `border-l-2 ${topBorder}` : ""}`
      }`}
    >
      <div className="w-8 flex-shrink-0 text-center">
        <RankNumber rank={rank} />
      </div>

      <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-display font-bold text-white">
          {(entry.display_name?.[0] ?? "?").toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-body font-medium truncate">
            {entry.display_name}
          </span>
          <TierBadge tier={entry.ranking_tier} />
        </div>
        <span className="text-xs text-zinc-500 font-body">@{entry.username}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="7" fill="currentColor" />
        </svg>
        <span className="text-sm font-mono text-white tabular-nums">
          {formatPoints(entry.total_points)}
        </span>
      </div>
    </div>
  );
}

function UserRankCard({
  entry,
  rank,
}: {
  entry: LeaderboardEntry;
  rank: number;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 mb-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-2">Your Rank</div>
      <div className="flex items-center gap-3">
        <div className="text-2xl font-display font-bold text-white">#{rank}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-body font-medium truncate">{entry.display_name}</div>
          <div className="text-xs text-zinc-500 font-body">@{entry.username}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
            <circle cx="12" cy="12" r="7" fill="currentColor" />
          </svg>
          <span className="text-sm font-mono text-white tabular-nums">
            {formatPoints(entry.total_points)}
          </span>
        </div>
        <TierBadge tier={entry.ranking_tier} />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard(activeTab: Tab, userId: string | undefined) {
    setLoading(true);
    try {
      const data =
        activeTab === "global"
          ? await pointsService.getGlobalLeaderboard(50)
          : userId
            ? await pointsService.getFriendsLeaderboard(userId, 50)
            : [];
      setEntries(data);

      if (userId) {
        const rank = await pointsService.getUserRank(userId);
        setUserRank(rank);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    fetchLeaderboard(tab, user?.id);
  }, [tab, user?.id, authLoading]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    const interval = setInterval(() => {
      fetchLeaderboard(tab, user.id);
    }, 30_000);
    return () => clearInterval(interval);
  }, [tab, user?.id, authLoading]);

  const currentUserEntry = user ? entries.find((e) => e.id === user.id) : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "global", label: "Global" },
    { key: "friends", label: "Friends" },
  ];

  return (
    <AppShell
      header={
        <div className="space-y-3">
          <h1 className="font-display text-lg font-bold tracking-wide text-white">Leaderboard</h1>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-1.5 text-xs font-body font-medium rounded-full transition-colors ${
                  tab === t.key
                    ? "bg-white text-black"
                    : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="pt-2">
        {loading || authLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500 text-sm font-body">
            Loading rankings...
          </div>
        ) : tab === "friends" && !user ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-white text-lg font-display">Sign In to See Friends</div>
            <p className="text-zinc-500 text-sm text-center font-body">
              Sign in to see how you rank against your friends.
            </p>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-body font-medium hover:bg-zinc-200 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <div className="text-white text-base font-display">No rankings yet</div>
            <p className="text-zinc-500 text-sm text-center font-body">
              {tab === "friends"
                ? "Add friends and start playing to see rankings here."
                : "Play some puzzles to appear on the leaderboard."}
            </p>
          </div>
        ) : (
          <>
            {currentUserEntry && userRank !== null && (
              <UserRankCard entry={currentUserEntry} rank={userRank} />
            )}

            <div className="space-y-2">
              {entries.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  isCurrentUser={entry.id === user?.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
