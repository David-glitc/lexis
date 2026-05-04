import clsx from "classnames";

export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

export interface RankBadgeProps {
  tier: RankTier;
  rank?: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig: Record<RankTier, { label: string; color: string; bgColor: string }> = {
  bronze: { label: "Bronze", color: "text-amber-700", bgColor: "bg-amber-600/20" },
  silver: { label: "Silver", color: "text-gray-400", bgColor: "bg-gray-500/20" },
  gold: { label: "Gold", color: "text-yellow-500", bgColor: "bg-yellow-500/20" },
  platinum: { label: "Platinum", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  diamond: { label: "Diamond", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  master: { label: "Master", color: "text-red-500", bgColor: "bg-red-500/20" }
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base"
};

export function RankBadge({ tier, rank, size = "md", className }: RankBadgeProps) {
  const config = tierConfig[tier];

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full font-semibold border",
        config.bgColor,
        sizeClasses[size],
        className
      )}
    >
      <span className={clsx("text-lg", config.color)}>
        {tier === "bronze" && "🥉"}
        {tier === "silver" && "🥈"}
        {tier === "gold" && "🥇"}
        {tier === "platinum" && "💎"}
        {tier === "diamond" && "💫"}
        {tier === "master" && "👑"}
      </span>
      <span className={clsx("font-mono", config.color)}>
        {config.label}
        {rank && <span className="ml-1">#{rank}</span>}
      </span>
    </div>
  );
}
