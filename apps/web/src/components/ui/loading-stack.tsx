import clsx from "classnames";

export interface LoadingStackProps {
  rows?: number;
  className?: string;
}

export function LoadingStack({ rows = 6, className }: LoadingStackProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
        >
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>

  );
}
