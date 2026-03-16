"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("lexis_pwa_dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setShow(true));
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt.current = null;
    }
    dismiss();
  };

  const handleDismiss = () => {
    localStorage.setItem("lexis_pwa_dismissed", "1");
    dismiss();
  };

  const dismiss = () => {
    setShow(false);
    setTimeout(() => setVisible(false), 500);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className={`w-full max-w-[420px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-5 transition-all duration-500 ease-out ${
          show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-bold text-white">Install Lexis</h3>
            <p className="mt-0.5 font-body text-sm text-zinc-400">
              Add to your home screen for the best experience
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleInstall}
                className="bg-white text-black font-bold rounded-full px-6 py-2.5 text-sm transition-all hover:bg-zinc-100 active:scale-95"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 text-sm transition-colors hover:text-zinc-300"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
