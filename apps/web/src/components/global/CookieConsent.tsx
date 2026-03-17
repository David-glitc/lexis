"use client";

import { useState, useEffect } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie("lexis_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    setCookie("lexis_consent", "all", 365);
    setVisible(false);
  }

  function acceptEssential() {
    setCookie("lexis_consent", "essential", 365);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[70] flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111]/95 backdrop-blur-xl p-4 shadow-2xl">
        <p className="text-sm text-zinc-300 font-body mb-3">
          Lexis uses cookies and notifications to save your preferences, track game progress, and keep you updated on challenges.
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black hover:scale-[1.02] active:scale-95 transition-transform font-body"
          >
            Accept All
          </button>
          <button
            onClick={acceptEssential}
            className="flex-1 rounded-full border border-white/[0.12] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.06] transition-colors font-body"
          >
            Essential Only
          </button>
        </div>
      </div>
    </div>
  );
}

export function hasFullConsent(): boolean {
  return getCookie("lexis_consent") === "all";
}

export function hasAnyConsent(): boolean {
  const c = getCookie("lexis_consent");
  return c === "all" || c === "essential";
}
