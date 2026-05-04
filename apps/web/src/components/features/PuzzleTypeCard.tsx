"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import clsx from "classnames";

export interface PuzzleTypeCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  stats?: {
    dailyPlayers?: number;
    avgTime?: string;
    difficulty?: "Easy" | "Medium" | "Hard";
  };
  isLive?: boolean;
  isComingSoon?: boolean;
  primaryColor?: string;
  onPlay?: () => void;
  onLearnMore?: () => void;
}

export function PuzzleTypeCard({
  id,
  name,
  description,
  icon,
  stats,
  isLive = true,
  isComingSoon = false,
  primaryColor = "#538d4e",
  onPlay,
  onLearnMore
}: PuzzleTypeCardProps) {
  return (
    <div
      className={clsx(
        "group relative rounded-xl border transition-all duration-300 overflow-hidden",
        isComingSoon
          ? "bg-white/5 border-white/10 opacity-60"
          : "bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/20"
      )}
    >
      {/* Background accent */}
      <div
        className={clsx(
          "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300",
          !isComingSoon && "bg-gradient-to-br"
        )}
        style={!isComingSoon ? { backgroundImage: `linear-gradient(135deg, ${primaryColor}, transparent)` } : {}}
      />

      <div className="relative p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-4xl">{icon}</div>
          <div className="flex gap-2">
            {isLive && !isComingSoon && <Badge variant="success">Live</Badge>}
            {isComingSoon && <Badge variant="warning">Coming Soon</Badge>}
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display font-bold text-xl mb-1 text-white">{name}</h3>
        <p className="text-sm text-zinc-400 mb-4 flex-1">{description}</p>

        {/* Stats */}
        {stats && !isComingSoon && (
          <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
            {stats.dailyPlayers && (
              <div>
                <p className="text-xs text-zinc-500">Players</p>
                <p className="font-mono font-bold text-white text-sm">{stats.dailyPlayers.toLocaleString()}</p>
              </div>
            )}
            {stats.avgTime && (
              <div>
                <p className="text-xs text-zinc-500">Avg Time</p>
                <p className="font-mono font-bold text-white text-sm">{stats.avgTime}</p>
              </div>
            )}
            {stats.difficulty && (
              <div>
                <p className="text-xs text-zinc-500">Difficulty</p>
                <p className={clsx(
                  "font-mono font-bold text-sm",
                  stats.difficulty === "Easy" && "text-emerald-400",
                  stats.difficulty === "Medium" && "text-amber-400",
                  stats.difficulty === "Hard" && "text-red-400"
                )}>
                  {stats.difficulty}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        {!isComingSoon ? (
          <Link href={`/arena/${id}`} className="w-full">
            <Button
              onClick={onPlay}
              variant="primary"
              size="md"
              fullWidth
              icon={<span>▶</span>}
            >
              Play Now
            </Button>
          </Link>
        ) : (
          <Button
            onClick={onLearnMore}
            variant="outline"
            size="md"
            fullWidth
          >
            Learn More
          </Button>
        )}
      </div>
    </div>
  );
}
