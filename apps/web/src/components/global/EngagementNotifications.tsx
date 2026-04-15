"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../providers/AuthProvider";
import { createClient } from "../../utils/supabase/client";
import { PreferencesService } from "../../services/PreferencesService";
import { NotificationService } from "../../services/NotificationService";
import { toUtcDateKey } from "../../utils/utc-date";

const DAILY_COOKIE = "lexis_daily_notified";
const CHALLENGE_COOKIE = "lexis_challenge_notified_count";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 30): void {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function EngagementNotifications() {
  const { user } = useAuth();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!NotificationService.isSupported()) return;
    if (NotificationService.getPermission() !== "granted") return;

    const supabase = createClient();
    const prefsService = new PreferencesService(supabase);

    async function tick() {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const prefs = await prefsService.get(user.id);

        if (prefs.notify_daily) {
          const today = toUtcDateKey(new Date());
          const lastDaily = readCookie(DAILY_COOKIE);
          if (lastDaily !== today) {
            NotificationService.showLocal("Lexis Daily Puzzle", {
              body: "A new daily puzzle is live. Keep your streak going.",
            });
            writeCookie(DAILY_COOKIE, today, 7);
          }
        }

        if (prefs.notify_challenges && pathname !== "/challenges") {
          const { count } = await supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .eq("challenged_id", user.id)
            .eq("status", "pending");

          const pendingCount = count ?? 0;
          const seen = Number(readCookie(CHALLENGE_COOKIE) ?? "0");
          if (pendingCount > seen) {
            NotificationService.showLocal("New Challenge", {
              body: "A friend challenged you in Lexis.",
            });
          }
          writeCookie(CHALLENGE_COOKIE, String(pendingCount), 7);
        }
      } catch {
        // noop
      } finally {
        checkingRef.current = false;
      }
    }

    tick();
    timerRef.current = setInterval(tick, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [user, pathname]);

  return null;
}

