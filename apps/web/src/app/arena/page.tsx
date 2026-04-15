"use client";

import { AppShell } from "../../components/layout/app-shell";

const UPCOMING_PUZZLES = [
  {
    name: "Word Ladder",
    description: "Transform one word into another by changing one letter at a time. Competitive shortest-path race mode is planned.",
  },
  {
    name: "Anagram Blitz",
    description: "Build as many valid words as possible from a constrained letter pool before the timer ends.",
  },
  {
    name: "Crossword Mini",
    description: "A compact mobile-first crossword format designed for high-frequency daily play and friend competition.",
  },
];

export default function PuzzleArenaPage() {
  return (
    <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Puzzle Arena</h1>}>
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-sm font-body text-zinc-300">
            Puzzle Arena is the expansion hub for new Lexis game types. The first release keeps Word mode focused,
            while the modules below are staged as Version 2 content.
          </p>
        </div>

        {UPCOMING_PUZZLES.map((puzzle) => (
          <div key={puzzle.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl font-bold text-white">{puzzle.name}</h2>
              <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 border border-amber-400/20 rounded-full px-2 py-1">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-zinc-400 font-body">{puzzle.description}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

