"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../providers/AuthProvider";
import { createClient } from "../../utils/supabase/client";
import { NotificationService } from "../../services/NotificationService";

export function NotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!NotificationService.isSupported()) return;
    if (NotificationService.getPermission() !== "default") return;

    const dismissed = document.cookie.includes("lexis_notif_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(timer);
  }, [user]);

  async function handleEnable() {
    setSubscribing(true);
    const supabase = createClient();
    const notifService = new NotificationService(supabase);
    const success = await notifService.subscribeToPush(user!.id);
    if (success) {
      NotificationService.showLocal("Lexis", { body: "Notifications enabled! We'll keep you updated." });
    }
    document.cookie = "lexis_notif_dismissed=1; path=/; max-age=31536000; SameSite=Lax";
    setSubscribing(false);
    setShow(false);
  }

  function handleDismiss() {
    document.cookie = "lexis_notif_dismissed=1; path=/; max-age=31536000; SameSite=Lax";
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[70] flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111]/95 backdrop-blur-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#538d4e]/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#538d4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white font-display">Stay in the game</p>
            <p className="text-xs text-zinc-400 font-body mt-0.5">Get notified about challenges, daily puzzles, and friend activity.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={subscribing}
            className="flex-1 rounded-full bg-[#538d4e] px-4 py-2 text-sm font-bold text-white hover:brightness-110 active:scale-95 transition-all font-body disabled:opacity-60"
          >
            {subscribing ? "Enabling..." : "Enable"}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-full border border-white/[0.12] px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors font-body"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
