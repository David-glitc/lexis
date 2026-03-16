"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const accentColors: Record<ToastType, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-white/10",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId++;
      const type = options?.type ?? "info";
      const duration = options?.duration ?? 3000;

      setToasts((prev) => {
        const next = [{ id, message, type, leaving: false }, ...prev];
        return next.slice(0, 3);
      });

      setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-20 left-1/2 z-[60] -translate-x-1/2 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-stretch overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl transition-all duration-300 ease-out ${
              t.leaving
                ? "-translate-y-2 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div className={`w-1 shrink-0 ${accentColors[t.type]}`} />
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="text-sm text-white font-body">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-2 text-zinc-500 transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
