"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../../../components/layout/app-shell";
import { Button } from "../../../../components/ui/button";
import { completeRound, createAnagramRound, getRoundSecondsRemaining, submitAnagramWord } from "../../../../features/anagram/engine";
import type { AnagramRoundState } from "../../../../features/anagram/types";

const RACKS = ["stream", "planet", "rescue", "stared", "friend", "bakers", "silent"];

function randomRack(): string {
  return RACKS[Math.floor(Math.random() * RACKS.length)];
}

export default function AnagramArenaPage() {
  const [round, setRound] = useState<AnagramRoundState>(() => createAnagramRound(randomRack(), 60));
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(() => getRoundSecondsRemaining(round));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = getRoundSecondsRemaining(round);
      setSecondsLeft(left);
      if (left === 0 && !round.completed) {
        completeRound(round);
        setRound({ ...round });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [round]);

  const sortedWords = useMemo(
    () => [...round.foundWords].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    [round.foundWords]
  );

  const submit = () => {
    if (round.completed) return;
    const result = submitAnagramWord(round, entry);
    setRound({ ...round });
    setEntry("");
    if (result.accepted) {
      setMessage(`Accepted: ${result.normalizedWord.toUpperCase()} (+${result.pointsAwarded})`);
      return;
    }
    const reasonMap: Record<string, string> = {
      too_short: "Word too short (min 3 letters).",
      invalid_chars: "Only letters are allowed.",
      not_in_dictionary: "Word not found in dictionary.",
      not_from_rack: "Word cannot be built from current rack.",
      duplicate: "You already found that word.",
    };
    setMessage(reasonMap[result.reason ?? ""] ?? "Word rejected.");
  };

  const reset = () => {
    const nextRound = createAnagramRound(randomRack(), 60);
    setRound(nextRound);
    setEntry("");
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
  };

  return (
    <AppShell header={<h1 className="font-display text-lg font-bold text-white">Anagram Blitz</h1>}>
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 mb-1 font-mono">Letter Rack</div>
          <div className="text-3xl tracking-[0.3em] font-display text-[#6abf5e] uppercase">{round.rack}</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="text-zinc-300">Score: <span className="font-bold text-white">{round.score}</span></div>
            <div className={`${secondsLeft <= 10 ? "text-red-400" : "text-zinc-300"}`}>Time: {secondsLeft}s</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex gap-2">
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={round.completed}
              placeholder="Type a word from the rack..."
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-[#6abf5e]"
            />
            <Button size="sm" onClick={submit} disabled={round.completed}>Submit</Button>
          </div>
          <div className="mt-2 text-xs text-zinc-400">{message}</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-zinc-300">Found Words ({sortedWords.length})</div>
            <Button size="sm" variant="ghost" onClick={reset}>New Round</Button>
          </div>
          {sortedWords.length === 0 ? (
            <p className="text-xs text-zinc-500">No words found yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedWords.map((word) => (
                <span key={word} className="text-xs rounded-full border border-white/10 px-2 py-1 text-zinc-300">
                  {word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
