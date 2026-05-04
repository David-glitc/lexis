import type { ReactNode } from "react";
import clsx from "classnames";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
  variant?: "default" | "accent" | "success" | "warning";
}

const variantClasses = {
  default: "bg-white/5 border-white/10",
  accent: "bg-accent/10 border-accent/30",
  success: "bg-emerald-500/10 border-emerald-500/30",
  warning: "bg-amber-500/10 border-amber-500/30"
};

export function StatCard({ label, value, icon, className, variant = "default" }: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-4 py-3 backdrop-blur-sm",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">{label}</p>
          <p className="text-xl font-display font-bold">{value}</p>
        </div>
        {icon && <div className="text-2xl text-zinc-400">{icon}</div>}
      </div>
    </div>
  );
}
