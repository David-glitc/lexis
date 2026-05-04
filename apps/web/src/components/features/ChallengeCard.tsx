"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Timer } from "../ui/timer";
import { Avatar } from "../ui/avatar";
import clsx from "classnames";

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: "pending" | "active" | "completed" | "expired";
  time_limit_seconds?: number | null;
  challenger_attempts?: number | null;
  challenged_attempts?: number | null;
  winner_id?: string | null;
  puzzle_word?: string;
  created_at: string;
  expires_at?: string;
}

export interface ChallengeCardProps {
  challenge: Challenge;
  userId: string;
  opponentName: string;
  opponentAvatar?: string;
  onAccept?: (challenge: Challenge) => void;
  onDecline?: (challenge: Challenge) => void;
  onPlay?: (challenge: Challenge) => void;
}

const statusConfig = {
  pending: { label: "Pending", variant: "pending" as const, icon: "⏳" },
  active: { label: "Active", variant: "info" as const, icon: "⚡" },
  completed: { label: "Completed", variant: "default" as const, icon: "✓" },
  expired: { label: "Expired", variant: "danger" as const, icon: "✗" }
};

export function ChallengeCard({
  challenge,
  userId,
  opponentName,
  opponentAvatar,
  onAccept,
  onDecline,
  onPlay
}: ChallengeCardProps) {
  const isChallenger = challenge.challenger_id === userId;
  const iReceivedIt = challenge.challenged_id === userId;
  const myAttempts = isChallenger ? challenge.challenger_attempts : challenge.challenged_attempts;
  const theirAttempts = isChallenger ? challenge.challenged_attempts : challenge.challenger_attempts;
  const isWinner = challenge.winner_id === userId;
  const isDraw = challenge.status === "completed" && challenge.winner_id === null;
  const status = statusConfig[challenge.status];

  const completedTime = challenge.created_at ? new Date(challenge.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "";

  return (
    <div className={clsx(
      "group rounded-lg border transition-all duration-300 p-4 backdrop-blur-sm",
      "hover:shadow-lg hover:border-accent/50",
      challenge.status === "active" && !myAttempts ? "bg-accent/5 border-accent/30 ring-1 ring-accent/20" : "bg-white/5 border-white/10"
    )}>
      {/* Header: Avatar + Name + Status */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Avatar
            name={opponentName}
            src={opponentAvatar}
            size="md"
            isOnline={challenge.status === "active"}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{opponentName}</h3>
            <p className="text-xs text-zinc-400">
              {isChallenger ? "You challenged" : "Challenged you"}
            </p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Time Limit */}
      {challenge.time_limit_seconds && (
        <div className="mb-3 flex items-center gap-2">
          <Timer expiresAt={new Date(challenge.expires_at || Date.now())} format="short" />
        </div>
      )}

      {/* Results (if completed) */}
      {challenge.status === "completed" && (
        <div className="mb-3 space-y-2 rounded-lg bg-white/5 p-3 border border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-zinc-400">You</p>
              <p className="font-mono font-semibold text-white">{myAttempts ?? "—"}</p>
            </div>
            <div>
              <p className="text-zinc-400">Result</p>
              <p className={clsx(
                "font-semibold",
                isWinner ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-red-400"
              )}>
                {isWinner ? "Won" : isDraw ? "Draw" : "Lost"}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Them</p>
              <p className="font-mono font-semibold text-white">{theirAttempts ?? "—"}</p>
            </div>
          </div>
          {challenge.puzzle_word && (
            <div className="border-t border-white/10 pt-2 text-center">
              <p className="text-xs text-zinc-400">Word</p>
              <p className="font-mono text-sm font-bold text-accent tracking-widest">
                {challenge.puzzle_word.toUpperCase()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>{completedTime}</span>
        {challenge.time_limit_seconds && <span>{challenge.time_limit_seconds}s</span>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {challenge.status === "active" && myAttempts === null && (
          <Link href={`/play?challenge=${challenge.id}`} className="flex-1">
            <Button
              onClick={() => onPlay?.(challenge)}
              variant="success"
              size="sm"
              fullWidth
              icon={<span>▶</span>}
            >
              Play Now
            </Button>
          </Link>
        )}

        {challenge.status === "pending" && iReceivedIt && onAccept && onDecline && (
          <>
            <Button
              onClick={() => onAccept(challenge)}
              variant="success"
              size="sm"
              fullWidth
            >
              Accept
            </Button>
            <Button
              onClick={() => onDecline(challenge)}
              variant="ghost"
              size="sm"
              fullWidth
            >
              Decline
            </Button>
          </>
        )}

        {challenge.status === "pending" && isChallenger && (
          <div className="w-full text-center text-xs text-zinc-400 py-2">
            Waiting for response…
          </div>
        )}

        {challenge.status === "completed" && (
          <Link href={`/challenges?rematch=${challenge.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              fullWidth
            >
              Rematch
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
