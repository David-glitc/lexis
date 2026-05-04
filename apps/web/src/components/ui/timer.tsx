"use client";

import { useState, useEffect } from "react";
import clsx from "classnames";

export interface TimerProps {
  expiresAt: Date | string;
  onExpire?: () => void;
  format?: "short" | "long";
  className?: string;
}

export function Timer({ expiresAt, onExpire, format = "short", className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        onExpire?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (format === "short") {
        if (days > 0) setTimeLeft(`${days}d ${hours}h`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        if (days > 0) setTimeLeft(`${days} days, ${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
        else setTimeLeft(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, format]);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
        isExpired ? "bg-zinc-700/50 text-zinc-400" : "bg-accent/15 text-accent",
        className
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {timeLeft}
    </span>
  );
}
