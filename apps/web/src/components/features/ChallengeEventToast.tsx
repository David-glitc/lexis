"use client";

import { useEffect } from "react";
import clsx from "classnames";

export type ChallengeEventType = "challenge_received" | "challenge_accepted" | "challenge_completed" | "friend_online";

export interface ChallengeEventToastProps {
  type: ChallengeEventType;
  friendName: string;
  friendAvatar?: string;
  message?: string;
  onDismiss?: () => void;
  onView?: () => void;
  autoDismissMs?: number;
}

const eventConfig: Record<ChallengeEventType, { icon: string; color: string; title: string }> = {
  challenge_received: { icon: "📬", color: "border-blue-500/30 bg-blue-500/10", title: "Challenge Received" },
  challenge_accepted: { icon: "✅", color: "border-emerald-500/30 bg-emerald-500/10", title: "Challenge Accepted" },
  challenge_completed: { icon: "🏁", color: "border-amber-500/30 bg-amber-500/10", title: "Challenge Completed" },
  friend_online: { icon: "🟢", color: "border-green-500/30 bg-green-500/10", title: "Friend Online" }
};

export function ChallengeEventToast({
  type,
  friendName,
  friendAvatar,
  message,
  onDismiss,
  onView,
  autoDismissMs = 5000
}: ChallengeEventToastProps) {
  const config = eventConfig[type];

  useEffect(() => {
    if (autoDismissMs) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      className={clsx(
        "fixed bottom-24 right-4 z-40 max-w-sm animate-slide-up",
        "rounded-lg border p-4 backdrop-blur-sm flex items-start gap-3"
      )}
      style={{ borderColor: config.color }}
    >
      {/* Icon */}
      <div className="text-2xl flex-shrink-0 mt-0.5">{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-sm">{config.title}</h4>
        <p className="text-xs text-zinc-400 mt-0.5">
          {message || `${friendName} sent you a challenge!`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onView && (
          <button
            onClick={onView}
            className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
          >
            View
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-zinc-500 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
