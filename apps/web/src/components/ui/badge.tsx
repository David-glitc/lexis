import type { ReactNode } from "react";
import clsx from "classnames";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "pending" | "online";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-700 text-zinc-200",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border border-red-500/30",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  online: "bg-green-500/15 text-green-400 border border-green-500/30"
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
