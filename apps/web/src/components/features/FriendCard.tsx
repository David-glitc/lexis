"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import clsx from "classnames";

export interface FriendCardProps {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  stats?: {
    wins?: number;
    streak?: number;
    rank?: string | number;
  };
  onChallenge?: (friendId: string) => void;
  onViewProfile?: (friendId: string) => void;
  onRemove?: (friendId: string) => void;
}

export function FriendCard({
  id,
  name,
  avatar,
  isOnline = false,
  stats,
  onChallenge,
  onViewProfile,
  onRemove
}: FriendCardProps) {
  return (
    <div className={clsx(
      "rounded-lg border transition-all duration-300 p-4 backdrop-blur-sm",
      "hover:shadow-md hover:border-accent/40",
      isOnline ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/10"
    )}>
      {/* Header with Avatar and Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            name={name}
            src={avatar}
            size="md"
            isOnline={isOnline}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            {isOnline && (
              <Badge variant="online" className="text-xs">
                Online
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-3 rounded-lg bg-white/5 p-2 border border-white/10">
          {stats.wins !== undefined && (
            <div className="text-center">
              <p className="text-xs text-zinc-400">Wins</p>
              <p className="font-mono font-bold text-white">{stats.wins}</p>
            </div>
          )}
          {stats.streak !== undefined && (
            <div className="text-center">
              <p className="text-xs text-zinc-400">Streak</p>
              <p className="font-mono font-bold text-accent">{stats.streak}</p>
            </div>
          )}
          {stats.rank && (
            <div className="text-center">
              <p className="text-xs text-zinc-400">Rank</p>
              <p className="font-mono font-bold text-amber-400">{stats.rank}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => onChallenge?.(id)}
          variant="success"
          size="sm"
          fullWidth
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 7l4-4 4 4-4 4" />
            </svg>
          }
        >
          Challenge
        </Button>
        <button
          onClick={() => onViewProfile?.(id)}
          className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          aria-label="View profile"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </button>
        <button
          onClick={() => onRemove?.(id)}
          className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 transition-colors text-zinc-400 hover:text-red-400"
          aria-label="Remove friend"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 4 21 4" />
            <line x1="19" y1="4" x2="21" y2="20" />
            <line x1="3" y1="4" x2="5" y2="20" />
            <line x1="9" y1="9" x2="9" y2="20" />
            <line x1="15" y1="9" x2="15" y2="20" />
          </svg>
        </button>
      </div>
    </div>
  );
}
