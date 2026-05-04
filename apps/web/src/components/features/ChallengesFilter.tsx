"use client";

import clsx from "classnames";

export type ChallengeFilter = "all" | "active" | "pending" | "completed";

export interface ChallengesFilterProps {
  activeFilter: ChallengeFilter;
  onFilterChange: (filter: ChallengeFilter) => void;
  counts?: {
    all: number;
    active: number;
    pending: number;
    completed: number;
  };
}

const filters: { id: ChallengeFilter; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "📋" },
  { id: "active", label: "Active", icon: "⚡" },
  { id: "pending", label: "Pending", icon: "⏳" },
  { id: "completed", label: "Completed", icon: "✓" }
];

export function ChallengesFilter({ activeFilter, onFilterChange, counts }: ChallengesFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
      {filters.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onFilterChange(id)}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200",
            activeFilter === id
              ? "bg-accent text-white shadow-lg"
              : "bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10"
          )}
        >
          <span>{icon}</span>
          <span>{label}</span>
          {counts && counts[id] > 0 && (
            <span className={clsx(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-mono font-bold",
              activeFilter === id
                ? "bg-white/20 text-white"
                : "bg-zinc-700/50 text-zinc-300"
            )}>
              {counts[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
