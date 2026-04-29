"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import { completeRound, createAnagramRound, getRoundSecondsRemaining, submitAnagramWord } from "../../../features/anagram/engine";
import { useAuth } from "../../../providers/AuthProvider";
import { createClient } from "../../../utils/supabase/client";
import { ProfileService } from "../../../services/ProfileService";
import { PointsService } from "../../../services/PointsService";
import type { AnagramRoundState } from "../../../features/anagram/types";

const RACKS = ["stream", "planet", "rescue", "stared", "friend", "bakers", "silent"];
const VALID_DURATION_SECONDS = [30, 60, 120] as const;

const supabase = createClient();
const pointsService = new PointsService(supabase);
const profileService = new ProfileService(supabase);

function randomRack(): string {
  return RACKS[Math.floor(Math.random() * RACKS.length)];
}

export default function AnagramArenaPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const durationSeconds = useMemo(() => {
    const raw = searchParams.get("duration");
    const parsed = raw ? Number(raw) : 60;
    if (VALID_DURATION_SECONDS.includes(parsed as (typeof VALID_DURATION_SECONDS)[number])) return parsed;
    return 60;
  }, [searchParams]);

  const [round, setRound] = useState<AnagramRoundState>(() => createAnagramRound(randomRack(), durationSeconds));
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(() => getRoundSecondsRemaining(round));

  const roundRef = useRef(round);
  const lastLeftRef = useRef(secondsLeft);
  const lastEnsuredProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // If the user changes timer (via query params), start a fresh round.
  useEffect(() => {
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setEntry("");
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
  }, [durationSeconds]);

  useEffect(() => {
    if (!user) return;
    if (lastEnsuredProfileIdRef.current === user.id) return;
    lastEnsuredProfileIdRef.current = user.id;

    // Ensure the profile row exists so points ledger updates can persist total_points.
    profileService
      .getProfile(user.id)
      .then((existing) => {
        if (existing) return;
        const email = user.email ?? "";
        const displayName = email ? email.split("@")[0] : "Player";
        return profileService.createProfile(user.id, email, displayName);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentRound = roundRef.current;
      const left = getRoundSecondsRemaining(currentRound);

      if (left !== lastLeftRef.current) {
        lastLeftRef.current = left;
        setSecondsLeft(left);
      }

      if (left === 0 && !currentRound.completed) {
        completeRound(currentRound);
        setRound({ ...currentRound });
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

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

      if (user) {
        const idempotencyKey = `${user.id}:anagram:${round.startedAt}:${result.normalizedWord}`;
        pointsService
          .awardPoints(user.id, result.pointsAwarded, "anagram_word", {
            mode: "anagram",
            durationSeconds: round.durationSeconds,
            rack: round.rack,
            idempotency_key: idempotencyKey,
          })
          .catch(() => {});
      } else {
        setMessage(`Accepted: ${result.normalizedWord.toUpperCase()} (+${result.pointsAwarded}) (Sign in to earn points)`);
      }

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
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setEntry("");
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
  };

  return (
    <AppShell
      header={
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg font-bold text-white">Anagram Blitz</h1>
          <span className="text-[10px] uppercase tracking-wider font-mono text-[#6abf5e] border border-[#6abf5e]/30 rounded-full px-2 py-1">
            {durationSeconds}s Timer
          </span>
        </div>
      }
    >
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
              maxLength={6}
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
