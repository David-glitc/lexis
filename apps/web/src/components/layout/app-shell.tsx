"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "../ui/lexis-logo";
import { useAuth } from "../../providers/AuthProvider";

interface AppShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  sidebar?: boolean;
}

const icons = {
  play: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  ),
  training: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z" />
    </svg>
  ),
  challenges: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 7l4-4 4 4-4 4" />
      <path d="M7 13l-4 4 4 4 4-4" />
      <path d="M14.5 17.5l3 3" />
      <path d="M6.5 6.5l-3-3" />
    </svg>
  ),
  leaderboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  friends: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  arena: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 12h10" />
      <path d="M12 7v10" />
    </svg>
  ),
  more: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  ),
};

type NavItem = { href: string; label: string; icon: ReactNode };

const SIDEBAR_LINKS: (NavItem | "separator")[] = [
  { href: "/play", label: "Play", icon: icons.play },
  { href: "/hints", label: "Training", icon: icons.training },
  { href: "/arena", label: "Puzzle Arena", icon: icons.arena },
  { href: "/challenges", label: "Challenges", icon: icons.challenges },
  { href: "/leaderboard", label: "Leaderboard", icon: icons.leaderboard },
  { href: "/friends", label: "Friends", icon: icons.friends },
  { href: "/profile", label: "Profile", icon: icons.profile },
  "separator",
  { href: "/settings", label: "Settings", icon: icons.settings },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/play", label: "Play", icon: icons.play },
  { href: "/hints", label: "Training", icon: icons.training },
  { href: "/challenges", label: "Challenges", icon: icons.challenges },
  { href: "/leaderboard", label: "Leaderboard", icon: icons.leaderboard },
  { href: "/profile", label: "Profile", icon: icons.profile },
];

const MORE_LINKS: NavItem[] = [
  { href: "/friends", label: "Friends", icon: icons.friends },
  { href: "/settings", label: "Settings", icon: icons.settings },
  { href: "/arena", label: "Puzzle Arena", icon: icons.arena },
];

export function AppShell({ header, footer, children, sidebar = true }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const lastCtrlShiftL = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        lastCtrlShiftL.current = Date.now();
        return;
      }
      if (e.key.toLowerCase() === "x" && Date.now() - lastCtrlShiftL.current < 500) {
        lastCtrlShiftL.current = 0;
        router.push("/admin");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const active = (href: string) => pathname.startsWith(href);
  const moreActive = MORE_LINKS.some((l) => active(l.href));
  const userInitial = user?.email?.[0]?.toUpperCase();

  return (
    <div className="relative min-h-screen bg-[#060606]">
      <div
        className="orb pointer-events-none fixed bottom-0 left-0 h-[200px] w-[200px] bg-[#538d4e]"
        style={{ opacity: 0.12 }}
      />

      {sidebar && (
        <aside className="fixed left-0 top-0 hidden h-screen w-56 border-r border-white/[0.06] bg-[#060606] md:block">
          <div className="flex h-full flex-col p-4">
            <div className="mb-4 px-1">
              <Logo />
            </div>
            <nav className="flex flex-1 flex-col gap-0.5">
              {SIDEBAR_LINKS.map((item, i) =>
                item === "separator" ? (
                  <div key="sep" className="my-2 border-t border-white/[0.06]" />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm transition-colors ${
                      active(item.href)
                        ? "bg-white/[0.06] text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </aside>
      )}

      <div className={sidebar ? "md:pl-56" : ""}>
        {header && (
          <header className="sticky top-0 z-40 flex items-center border-b border-white/[0.06] bg-[#060606]/80 px-5 pb-3 pt-4 backdrop-blur-xl">
            {header}
          </header>
        )}

        <main className="relative z-10 mx-auto max-w-3xl px-5 pb-6 pt-4">{children}</main>

        {footer && (
          <footer className="z-40 border-t border-white/[0.06] bg-[#060606]/80 px-5 pb-4 pt-3 backdrop-blur-xl md:sticky md:bottom-0">
            {footer}
          </footer>
        )}

        <div className="h-20 md:hidden" />
      </div>

      <div
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 md:hidden ${
          moreOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMoreOpen(false)}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl border-t border-white/[0.06] bg-[#111] transition-transform duration-300 ease-out md:hidden ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-8 rounded-full bg-white/20" />
        </div>
        <nav className="flex flex-col gap-1 px-4 pb-4">
          {MORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active(link.href)
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-white/[0.06] bg-[#060606]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {BOTTOM_NAV.map((item) => {
          const isActive = active(item.href);
          const isProfile = item.href === "/profile";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] transition-colors ${
                isActive ? "text-white" : "text-zinc-500"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-1.5 w-1.5 rounded-full bg-[#538d4e]" />
              )}
              {isProfile && userInitial ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold leading-none">
                  {userInitial}
                </span>
              ) : (
                item.icon
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] transition-colors ${
            moreActive ? "text-white" : "text-zinc-500"
          }`}
        >
          {moreActive && (
            <span className="absolute top-0 h-1.5 w-1.5 rounded-full bg-[#538d4e]" />
          )}
          {icons.more}
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
