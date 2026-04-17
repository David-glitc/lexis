"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { ProfileService, type UserProfile } from "../../services/ProfileService";
import { FriendsService, type FriendWithProfile, type Challenge } from "../../services/FriendsService";
import { wordService } from "../../services/WordService";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../providers/AuthProvider";

const supabase = createClient();
const profileService = new ProfileService(supabase);
const friendsService = new FriendsService(supabase);

type Tab = "friends" | "requests" | "search" | "challenges";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserCard({
  name,
  email,
  tier,
  wins,
  streak,
  actions,
  online
}: {
  name: string;
  email: string;
  tier: string;
  wins: number;
  streak: number;
  actions: React.ReactNode;
  online?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 card-hover">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
            <span className="text-sm text-white font-display font-bold">{(name[0] ?? "?").toUpperCase()}</span>
          </div>
          <div>
            <div className="text-white text-sm font-body font-medium">{name}</div>
            <div className="text-xs text-zinc-500 font-body flex items-center gap-1.5">
              <span>{email}</span>
              {online !== undefined && (
                <span className={`inline-flex items-center gap-1 ${online ? "text-emerald-400" : "text-zinc-600"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  {online ? "online" : "offline"}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-zinc-500 capitalize font-mono uppercase tracking-wider">{tier}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-3 font-mono">
        <span>{wins} wins</span>
        <span>{streak} streak</span>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

function FriendsTab({
  friends,
  userId,
  onRemove,
  onChallenge,
  onlineMap
}: {
  friends: FriendWithProfile[];
  userId: string;
  onRemove: (id: string) => void;
  onChallenge: (friendId: string) => void;
  onlineMap: Record<string, boolean>;
}) {
  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm mb-2">No friends yet</p>
        <p className="text-zinc-600 text-xs">Search for players to add as friends</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((f) => (
        <UserCard
          key={f.friendship_id}
          name={f.display_name}
          email={f.email}
          tier={f.ranking_tier}
          wins={f.puzzles_won}
          streak={f.current_streak}
          online={onlineMap[f.friend_id]}
          actions={
            <>
              <button
                onClick={() => onChallenge(f.friend_id)}
                className="flex-1 text-xs py-1.5 rounded bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Challenge
              </button>
              <button
                onClick={() => onRemove(f.friendship_id)}
                className="flex-1 text-xs py-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Remove
              </button>
            </>
          }
        />
      ))}
    </div>
  );
}

function RequestsTab({
  requests,
  onAccept,
  onDecline
}: {
  requests: FriendWithProfile[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <UserCard
          key={r.friendship_id}
          name={r.display_name}
          email={r.email}
          tier={r.ranking_tier}
          wins={r.puzzles_won}
          streak={r.current_streak}
          actions={
            <>
              <button
                onClick={() => onAccept(r.friendship_id)}
                className="flex-1 text-xs py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline(r.friendship_id)}
                className="flex-1 text-xs py-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Decline
              </button>
            </>
          }
        />
      ))}
    </div>
  );
}

function SearchTab({ userId, onSendRequest }: { userId: string; onSendRequest: (targetId: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    const profiles = await profileService.searchProfiles(query.trim());
    setResults(profiles.filter((p) => p.id !== userId));
    setSearching(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pl-9 text-sm text-white outline-none focus-visible:border-emerald-400 transition-colors"
            placeholder="Search by name, email, or @username..."
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <SearchIcon />
          </div>
        </div>
        <Button size="sm" onClick={handleSearch} disabled={searching || query.trim().length < 2}>
          Search
        </Button>
      </div>

      {searching && <div className="text-zinc-500 text-sm">Searching...</div>}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((p) => (
            <UserCard
              key={p.id}
              name={p.display_name}
              email={p.email}
              tier={p.ranking_tier}
              wins={p.puzzles_won}
              streak={p.current_streak}
              actions={
                <button
                  onClick={() => onSendRequest(p.id)}
                  className="flex-1 text-xs py-1.5 rounded bg-white text-black hover:bg-zinc-200 transition-colors"
                >
                  Add Friend
                </button>
              }
            />
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query.trim().length >= 2 && (
        <p className="text-zinc-500 text-sm text-center">No players found</p>
      )}
    </div>
  );
}

function ChallengesTab({ challenges, userId }: { challenges: Challenge[]; userId: string }) {
  if (challenges.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm mb-2">No challenges yet</p>
        <p className="text-zinc-600 text-xs">Challenge a friend from your friends list</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((c) => {
        const isChallenger = c.challenger_id === userId;
        const myAttempts = isChallenger ? c.challenger_attempts : c.challenged_attempts;
        const theirAttempts = isChallenger ? c.challenged_attempts : c.challenger_attempts;
        const isWinner = c.winner_id === userId;
        const isDraw = c.status === "completed" && c.winner_id === null;

        return (
          <div key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono text-white">{c.puzzle_word.toUpperCase()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                c.status === "completed"
                  ? isWinner ? "bg-emerald-500/10 text-emerald-400" : isDraw ? "bg-zinc-700 text-zinc-300" : "bg-red-500/10 text-red-400"
                  : c.status === "pending" ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}>
                {c.status === "completed"
                  ? isWinner ? "Won" : isDraw ? "Draw" : "Lost"
                  : c.status === "pending" ? "Pending"
                  : c.status === "active" ? "In Progress"
                  : "Expired"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>You: {myAttempts !== null ? `${myAttempts} attempts` : "Not played"}</span>
              <span>Them: {theirAttempts !== null ? `${theirAttempts} attempts` : "Not played"}</span>
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {new Date(c.created_at).toLocaleDateString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [requests, setRequests] = useState<FriendWithProfile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const loadSeqRef = useRef(0);

  const loadData = useCallback(async (userId: string) => {
    const loadSeq = ++loadSeqRef.current;
    setDataLoading(true);
    try {
      const [friendsList, requestsList, challengesList] = await Promise.all([
        friendsService.getFriendsList(userId),
        friendsService.getPendingRequests(userId),
        friendsService.getChallenges(userId)
      ]);
      if (loadSeq !== loadSeqRef.current) return;
      setFriends(friendsList);
      setRequests(requestsList);
      setChallenges(challengesList);
    } finally {
      if (loadSeq === loadSeqRef.current) {
        setDataLoading(false);
        setInitialized(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!friends.length) return;
    const ids = friends.map((friend) => friend.friend_id);
    supabase.from("user_presence")
      .select("user_id,status")
      .in("user_id", ids)
      .then(({ data }) => {
        const next: Record<string, boolean> = {};
        (data ?? []).forEach((row: any) => {
          next[row.user_id] = row.status === "online" || row.status === "playing";
        });
        setOnlineMap(next);
      });
  }, [friends]);

  useEffect(() => {
    if (user) loadData(user.id);
  }, [user, loadData]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  function flash(msg: string) {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setMessage(msg);
    flashTimeoutRef.current = setTimeout(() => setMessage(null), 3000);
  }

  async function handleSendRequest(targetId: string) {
    if (!user) return;
    const { error } = await friendsService.sendFriendRequest(user.id, targetId);
    flash(error ?? "Friend request sent!");
  }

  async function handleAccept(friendshipId: string) {
    if (!user) return;
    const { error } = await friendsService.acceptFriendRequest(friendshipId, user.id);
    if (!error) {
      flash("Friend request accepted!");
      loadData(user.id);
    } else {
      flash(error);
    }
  }

  async function handleDecline(friendshipId: string) {
    if (!user) return;
    const { error } = await friendsService.declineFriendRequest(friendshipId, user.id);
    if (!error) loadData(user.id);
    else flash(error);
  }

  async function handleRemove(friendshipId: string) {
    if (!user) return;
    const { error } = await friendsService.removeFriend(friendshipId, user.id);
    if (!error) {
      flash("Friend removed");
      loadData(user.id);
    }
  }

  async function handleChallenge(friendId: string) {
    if (!user) return;
    const word = wordService.getRandomSolution();
    const { error } = await friendsService.sendChallenge(user.id, friendId, word);
    flash(error ?? "Challenge sent!");
    if (!error) loadData(user.id);
  }

  if (authLoading || (!initialized && dataLoading)) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell
        header={
          <div className="font-display text-lg font-bold text-white">Friends</div>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-white text-lg">Sign In to See Friends</div>
          <p className="text-zinc-500 text-sm text-center">Connect with other players, send challenges, and compete.</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends.length },
    { key: "requests", label: "Requests", count: requests.length },
    { key: "search", label: "Search" },
    { key: "challenges", label: "Duels", count: challenges.filter((c) => c.status !== "completed" && c.status !== "expired").length }
  ];

  return (
    <AppShell
      header={
        <div className="space-y-3">
          <div className="font-display text-lg font-bold text-white">Friends</div>
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 text-xs py-2 rounded-lg transition-colors relative font-body font-medium ${
                  tab === t.key
                    ? "bg-white text-black"
                    : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`ml-1 text-[10px] ${tab === t.key ? "text-zinc-500" : "text-[#6abf5e]"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="pt-2 relative">
        {dataLoading && initialized && (
          <div className="mb-3 text-xs text-zinc-500 font-body">Refreshing friends...</div>
        )}
        {message && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 bg-white text-black text-sm font-bold px-4 py-2 rounded-lg shadow-lg animate-bounce">
            {message}
          </div>
        )}

        {tab === "friends" && (
          <FriendsTab
            friends={friends}
            userId={user.id}
            onRemove={handleRemove}
            onChallenge={handleChallenge}
            onlineMap={onlineMap}
          />
        )}
        {tab === "requests" && (
          <RequestsTab
            requests={requests}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
        {tab === "search" && (
          <SearchTab userId={user.id} onSendRequest={handleSendRequest} />
        )}
        {tab === "challenges" && (
          <ChallengesTab challenges={challenges} userId={user.id} />
        )}
      </div>
    </AppShell>
  );
}
