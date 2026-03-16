"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../ui/lexis-logo";

interface AppShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  sidebar?: boolean;
}

const NAV_LINKS = [
  {
    href: "/play",
    label: "Play",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
  },
  {
    href: "/hints",
    label: "Training",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z" />
      </svg>
    ),
  },
  {
    href: "/challenges",
    label: "Challenges",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 7l4-4 4 4-4 4" />
        <path d="M7 13l-4 4 4 4 4-4" />
        <path d="M14.5 17.5l3 3" />
        <path d="M6.5 6.5l-3-3" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    href: "/friends",
    label: "Friends",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function NavLink({ href, label, icon, active, onClick }: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm transition-colors ${
        active ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function SidebarContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-1">
        <Logo />
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.href}
            {...link}
            active={pathname.startsWith(link.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ header, footer, children, sidebar = true }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#060606]">
      <div className="orb pointer-events-none fixed bottom-0 left-0 h-[200px] w-[200px] bg-[#538d4e]" style={{ opacity: 0.12 }} />

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 h-full w-64 border-r border-white/[0.06] bg-[#060606]"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent pathname={pathname} onNavClick={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      {sidebar && (
        <aside className="fixed left-0 top-0 hidden h-screen w-56 border-r border-white/[0.06] bg-[#060606] md:block">
          <SidebarContent pathname={pathname} />
        </aside>
      )}

      {/* Main area */}
      <div className={sidebar ? "md:pl-56" : ""}>
        {header && (
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/[0.06] bg-[#060606]/80 px-5 pb-3 pt-4 backdrop-blur-xl">
            <button
              type="button"
              className="text-zinc-400 hover:text-white md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex-1">{header}</div>
          </header>
        )}

        <main className="relative z-10 mx-auto max-w-3xl px-5 pb-6 pt-4">{children}</main>

        {footer && (
          <footer className="sticky bottom-0 z-40 border-t border-white/[0.06] bg-[#060606]/80 px-5 pb-4 pt-3 backdrop-blur-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
