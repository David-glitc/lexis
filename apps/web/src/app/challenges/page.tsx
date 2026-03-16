"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../providers/AuthProvider";
import { AppShell } from "../../components/layout/app-shell";
import { createClient } from "../../utils/supabase/client";
import {
  FriendsService,
  type Challenge,
  type FriendWithProfile,
} from "../../services/FriendsService";
import { wordService } from "../../services/WordService";
import { Button } from "../../components/ui/button";

const supabase = createClient();
const friendsService = new FriendsService(supabase);

type Tab = "active" | "pending" | "history";
type TimeLimitOption = "standard" | "timed60" | "timed120";

const TIME_LIMITS: Record<TimeLimitOption, { label: string; seconds?: number }> = {
  standard: { label: "Standard" },
  timed60: { label: "Timed 60s", seconds: 60 },
  timed120: { label: "Timed 120s", seconds: 120 },
};

function TimeBadge({ seconds }: { seconds: number | null }) {
  if (!seconds) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {seconds}s
    </span>
  );
}

function StatusBadge({ status, isWinner, isDraw }: { status: string; isWinner?: boolean; isDraw?: boolean }) {
  const styles: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    expired: "bg-zinc-700 text-zinc-400",
    won: "bg-emerald-500/10 text-emerald-400",
    lost: "bg-red-500/10 text-red-400",
    draw: "bg-zinc-700 text-zinc-300",
  };

  let label = status;
  let key = status;
  if (status === "completed") {
    if (isDraw) { label = "Draw"; key = "draw"; }
    else if (isWinner) { label = "Won"; key = "won"; }
    else { label = "Lost"; key = "lost"; }
  } else if (status === "active") {
    label = "Active";
  } else if (status === "pending") {
    label = "Pending";
  } else if (status === "expired") {
    label = "Expired";
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${styles[key] ?? styles.expired}`}>
      {label}
    </span>
  );
}

function ChallengeCard({
  challenge,
  userId,
  friendsMap,
  onAccept,
  onDecline,
}: {
  challenge: Challenge;
  userId: string;
  friendsMap: Map<string, string>;
  onAccept?: (c: Challenge) => void;
  onDecline?: (c: Challenge) => void;
}) {
  const isChallenger = challenge.challenger_id === userId;
  const opponentId = isChallenger ? challenge.challenged_id : challenge.challenger_id;
  const opponentName = friendsMap.get(opponentId) ?? "Opponent";
  const myAttempts = isChallenger ? challenge.challenger_attempts : challenge.challenged_attempts;
  const theirAttempts = isChallenger ? challenge.challenged_attempts : challenge.challenger_attempts;
  const isWinner = challenge.winner_id === userId;
  const isDraw = challenge.status === "completed" && challenge.winner_id === null;
  const isPending = challenge.status === "pending";
  const isActive = challenge.status === "active";
  const iReceivedIt = challenge.challenged_id === userId;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <span className="font-display text-sm font-bold text-white">
              {(opponentName[0] ?? "?").toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-body text-sm font-medium text-white">{opponentName}</div>
            <div className="font-body text-xs text-zinc-500">
              {isChallenger ? "You challenged" : "Challenged you"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TimeBadge seconds={challenge.time_limit_seconds} />
          <StatusBadge status={challenge.status} isWinner={isWinner} isDraw={isDraw} />
        </div>
      </div>

      {challenge.status === "completed" && (
        <div className="mb-3 flex justify-between font-mono text-xs text-zinc-500">
          <span>You: {myAttempts !== null ? `${myAttempts} guesses` : "—"}</span>
          <span>Them: {theirAttempts !== null ? `${theirAttempts} guesses` : "—"}</span>
        </div>
      )}

      {challenge.status === "completed" && (
        <div className="mb-3 font-mono text-xs tracking-[0.3em] text-zinc-400 text-center">
          {challenge.puzzle_word.toUpperCase()}
        </div>
      )}

      <div className="font-mono text-[10px] text-zinc-600">
        {new Date(challenge.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {isActive && myAttempts === null && (
        <div className="mt-3">
          <Link href={`/play?challenge=${challenge.id}`}>
            <Button size="sm" fullWidth>Play</Button>
          </Link>
        </div>
      )}

      {isPending && iReceivedIt && onAccept && onDecline && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onAccept(challenge)}
            className="flex-1 rounded-lg bg-white py-2 text-xs font-body font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Accept &amp; Play
          </button>
          <button
            onClick={() => onDecline(challenge)}
            className="flex-1 rounded-lg bg-white/[0.06] py-2 text-xs font-body font-medium text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            Decline
          </button>
        </div>
      )}

      {isPending && isChallenger && (
        <div className="mt-3 text-center font-body text-xs text-zinc-500">
          Waiting for response…
        </div>
      )}
    </div>
  );
}

function CreateChallengeModal({
  friends,
  onSend,
  onClose,
}: {
  friends: FriendWithProfile[];
  onSend: (friendId: string, timeLimit?: number) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [timeOption, setTimeOption] = useState<TimeLimitOption>("standard");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!selectedFriend) return;
    setSending(true);
    await onSend(selectedFriend, TIME_LIMITS[timeOption].seconds);
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-wide text-white">New Challenge</h2>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-body text-xs font-medium text-zinc-400">Challenge Type</label>
          <div className="flex gap-2">
            {(Object.entries(TIME_LIMITS) as [TimeLimitOption, { label: string }][]).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setTimeOption(key)}
                className={`flex-1 rounded-lg py-2 text-xs font-body font-medium transition-colors ${
                  timeOption === key
                    ? "bg-white text-black"
                    : "border border-white/[0.06] bg-white/[0.04] text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-2 block font-body text-xs font-medium text-zinc-400">Pick a Friend</label>
          {friends.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-body text-sm text-zinc-500">No friends yet</p>
              <Link href="/friends" className="mt-2 inline-block font-body text-xs text-[#6abf5e] hover:underline">
                Find friends
              </Link>
            </div>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {friends.map((f) => (
                <button
                  key={f.friend_id}
                  onClick={() => setSelectedFriend(f.friend_id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                    selectedFriend === f.friend_id
                      ? "border border-white/20 bg-white/[0.08]"
                      : "border border-transparent bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                    <span className="font-display text-xs font-bold text-white">
                      {(f.display_name[0] ?? "?").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-body text-sm font-medium text-white">{f.display_name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{f.ranking_tier}</div>
                  </div>
                  {selectedFriend === f.friend_id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6abf5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          fullWidth
          disabled={!selectedFriend || sending}
          onClick={handleSend}
        >
          {sending ? "Sending…" : "Send Challenge"}
        </Button>
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [friendsMap, setFriendsMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);

  function flash(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  const loadData = useCallback(async (userId: string) => {
    const [challengesList, friendsList] = await Promise.all([
      friendsService.getChallenges(userId),
      friendsService.getFriendsList(userId),
    ]);
    setChallenges(challengesList);
    setFriends(friendsList);
    const map = new Map<string, string>();
    for (const f of friendsList) map.set(f.friend_id, f.display_name);
    setFriendsMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) loadData(user.id);
    else setLoading(false);
  }, [user, authLoading, loadData]);

  async function handleAccept(challenge: Challenge) {
    if (!user) return;
    const { error } = await friendsService.acceptChallenge(challenge.id, user.id);
    if (error) {
      flash(error, "error");
      return;
    }
    router.push(`/play?challenge=${challenge.id}`);
  }

  async function handleDecline(challenge: Challenge) {
    if (!user) return;
    const { error } = await supabase
      .from("challenges")
      .update({ status: "expired" })
      .eq("id", challenge.id);
    if (error) {
      flash(error.message, "error");
      return;
    }
    flash("Challenge declined");
    loadData(user.id);
  }

  async function handleSendChallenge(friendId: string, timeLimit?: number) {
    if (!user) return;
    const word = wordService.getRandomSolution();
    const { error } = await friendsService.sendChallenge(user.id, friendId, word, timeLimit);
    if (error) {
      flash(error, "error");
    } else {
      flash("Challenge sent!");
      setShowModal(false);
      loadData(user.id);
    }
  }

  const active = challenges.filter((c) => c.status === "active");
  const pending = challenges.filter((c) => c.status === "pending");
  const history = challenges.filter((c) => c.status === "completed" || c.status === "expired");

  const tabCounts: Record<Tab, number> = {
    active: active.length,
    pending: pending.length,
    history: history.length,
  };

  const tabList: { key: Tab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "history", label: "History" },
  ];

  const currentList = tab === "active" ? active : tab === "pending" ? pending : history;

  if (authLoading || loading) {
    return (
      <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Challenges</h1>}>
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500">Loading…</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Challenges</h1>}>
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
            <path d="M13 7l4-4 4 4-4 4" />
            <path d="M7 13l-4 4 4 4 4-4" />
          </svg>
          <h2 className="font-display text-xl font-bold text-white">Sign In to Play</h2>
          <p className="max-w-xs text-center font-body text-sm text-zinc-500">
            Challenge friends to word puzzles and prove you&apos;re the best.
          </p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-bold tracking-wide text-white">Challenges</h1>
          <Button size="sm" onClick={() => setShowModal(true)}>
            New Challenge
          </Button>
        </div>
      }
    >
      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-2.5 text-center font-body text-sm font-medium ${
            message.type === "error"
              ? "border border-red-500/20 bg-red-500/10 text-red-400"
              : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-5 flex gap-1.5">
        {tabList.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-xs font-body font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-black"
                : "border border-white/[0.06] bg-white/[0.04] text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 font-mono text-[10px] ${tab === t.key ? "text-zinc-500" : "text-[#6abf5e]"}`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-sm text-zinc-500">
            {tab === "active" && "No active challenges"}
            {tab === "pending" && "No pending challenges"}
            {tab === "history" && "No completed challenges yet"}
          </p>
          {tab !== "history" && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 font-body text-xs text-[#6abf5e] transition-colors hover:text-[#7dd672]"
            >
              Send a new challenge
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              userId={user.id}
              friendsMap={friendsMap}
              onAccept={tab === "pending" ? handleAccept : undefined}
              onDecline={tab === "pending" ? handleDecline : undefined}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateChallengeModal
          friends={friends}
          onSend={handleSendChallenge}
          onClose={() => setShowModal(false)}
        />
      )}
    </AppShell>
  );
}
