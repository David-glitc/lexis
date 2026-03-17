"use client";

import Link from "next/link";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";

export default function AboutPage() {
  return (
    <AppShell header={<div className="font-display text-lg font-bold text-white">About</div>}>
      <div className="space-y-6 pt-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <h1 className="font-display text-2xl font-bold text-white">Why Lexis exists</h1>
          <p className="mt-2 font-body text-sm leading-relaxed text-zinc-400">
            I loved Wordle. I hated the NYT Games paywall. I wanted something better — fast, competitive,
            and free — so I started building Lexis.
          </p>
          <p className="mt-3 font-body text-sm leading-relaxed text-zinc-400">
            Lexis is a word arena: train pattern recognition, push speed, and climb rankings without
            gating the experience behind subscriptions.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/play" className="flex-1">
              <Button fullWidth>Play</Button>
            </Link>
            <a
              href="https://x.com/davidpereishim"
              target="_blank"
              rel="noreferrer"
              className="flex-1"
            >
              <Button fullWidth variant="secondary">Follow on X</Button>
            </a>
          </div>

          <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            x.com/davidpereishim
          </div>
        </div>
      </div>
    </AppShell>
  );
}

