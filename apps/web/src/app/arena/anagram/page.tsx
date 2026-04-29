"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import {
  completeRound,
  computeAnagramWordPoints,
  createAnagramRound,
  getRoundSecondsRemaining,
  submitAnagramWord,
} from "../../../features/anagram/engine";
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

const WHEEL_SIZE_PX = 320;
const NODE_SIZE_PX = 52;
const WHEEL_RADIUS_PX = 125;

function getNodePosition(index: number, count: number): { x: number; y: number } {
  const cx = WHEEL_SIZE_PX / 2;
  const cy = WHEEL_SIZE_PX / 2;
  const angle = (2 * Math.PI * index) / Math.max(1, count) - Math.PI / 2;
  return {
    x: cx + WHEEL_RADIUS_PX * Math.cos(angle),
    y: cy + WHEEL_RADIUS_PX * Math.sin(angle),
  };
}

function AnagramArenaClientPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const durationSeconds = useMemo(() => {
    const raw = searchParams.get("duration");
    const parsed = raw ? Number(raw) : 60;
    if (VALID_DURATION_SECONDS.includes(parsed as (typeof VALID_DURATION_SECONDS)[number])) return parsed;
    return 60;
  }, [searchParams]);

  const [round, setRound] = useState<AnagramRoundState>(() => createAnagramRound(randomRack(), durationSeconds));
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(() => getRoundSecondsRemaining(round));

  const roundRef = useRef(round);
  const userIdRef = useRef<string | null>(user?.id ?? null);
  const lastLeftRef = useRef(secondsLeft);
  const lastEnsuredProfileIdRef = useRef<string | null>(null);
  const pointerDownRef = useRef(false);

  const [activePath, setActivePath] = useState<number[]>([]);
  const activePathRef = useRef<number[]>(activePath);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  // If the user changes timer (via query params), start a fresh round.
  useEffect(() => {
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
    setActivePath([]);
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
        pointerDownRef.current = false;
        setActivePath([]);
        completeRound(currentRound);
        setRound({ ...currentRound });
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const finalizeWord = useCallback(() => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;

    const currentRound = roundRef.current;
    if (currentRound.completed) {
      setActivePath([]);
      return;
    }

    const indices = activePathRef.current;
    setActivePath([]);
    if (!indices.length) return;

    const letters = currentRound.rack.split("");
    const word = indices.map((i) => letters[i] ?? "").join("");

    const result = submitAnagramWord(currentRound, word);
    setRound({ ...currentRound });

    if (result.accepted) {
      setMessage(`Accepted: ${result.normalizedWord.toUpperCase()} (+${result.pointsAwarded})`);

      const userId = userIdRef.current;
      if (userId) {
        const idempotencyKey = `${userId}:anagram:${currentRound.startedAt}:${result.normalizedWord}`;
        pointsService
          .awardPoints(userId, result.pointsAwarded, "anagram_word", {
            mode: "anagram",
            durationSeconds: currentRound.durationSeconds,
            rack: currentRound.rack,
            idempotency_key: idempotencyKey,
          })
          .catch(() => {});
      } else {
        setMessage(
          `Accepted: ${result.normalizedWord.toUpperCase()} (+${result.pointsAwarded}) (Sign in to earn points)`
        );
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
  }, [pointsService]);

  useEffect(() => {
    function onUp() {
      finalizeWord();
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [finalizeWord]);

  const rackLetters = useMemo(() => round.rack.split(""), [round.rack]);

  const sortedWords = useMemo(
    () => [...round.foundWords].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    [round.foundWords]
  );

  const clearPath = () => {
    pointerDownRef.current = false;
    setActivePath([]);
  };

  const reset = () => {
    pointerDownRef.current = false;
    setActivePath([]);
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
  };

  const formedWord = useMemo(() => {
    if (!activePath.length) return "";
    return activePath.map((i) => rackLetters[i] ?? "").join("");
  }, [activePath, rackLetters]);

  const onPointerDownNode = (index: number) => {
    if (round.completed) return;
    pointerDownRef.current = true;
    setActivePath([index]);
  };

  const onPointerEnterNode = (index: number, buttons: number) => {
    if (!pointerDownRef.current) return;
    if (buttons !== 1) return;
    setActivePath((prev) => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
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
      <div className="pt-2">
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-zinc-500 font-mono">Letter Rack</div>
                <div className="text-3xl tracking-[0.3em] font-display text-[#6abf5e] uppercase">
                  {round.rack}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-500 font-mono">Score</div>
                <div className="text-lg font-display font-bold text-white">{round.score}</div>
                <div className={`${secondsLeft <= 10 ? "text-red-400" : "text-zinc-300"} text-xs font-mono mt-1`}>
                  Time: {secondsLeft}s
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full flex items-center justify-center">
              <div
                className="relative rounded-2xl border border-white/[0.06] bg-black/30"
                style={{ width: WHEEL_SIZE_PX, height: WHEEL_SIZE_PX }}
              >
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={WHEEL_SIZE_PX}
                  height={WHEEL_SIZE_PX}
                  viewBox={`0 0 ${WHEEL_SIZE_PX} ${WHEEL_SIZE_PX}`}
                >
                  {activePath.slice(1).map((idx, i) => {
                    const prevIdx = activePath[i] ?? idx;
                    const from = getNodePosition(prevIdx, rackLetters.length);
                    const to = getNodePosition(idx, rackLetters.length);
                    return (
                      <line
                        key={`${prevIdx}-${idx}-${i}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#538d4e"
                        strokeWidth={5}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                {rackLetters.map((letter, index) => {
                  const pos = getNodePosition(index, rackLetters.length);
                  const active = activePath.includes(index);

                  return (
                    <button
                      key={`${letter}-${index}`}
                      type="button"
                      className={`absolute rounded-full flex items-center justify-center select-none transition-colors ${
                        active ? "bg-[#538d4e] text-white" : "bg-[#111] text-zinc-300 hover:bg-[#1a1a1a]"
                      } ${round.completed ? "opacity-40 cursor-not-allowed" : ""}`}
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: NODE_SIZE_PX,
                        height: NODE_SIZE_PX,
                        transform: "translate(-50%, -50%)",
                        border: active ? "1px solid #6abf5e" : "1px solid rgba(255,255,255,0.08)",
                      }}
                      onPointerDown={() => onPointerDownNode(index)}
                      onPointerEnter={(e) => onPointerEnterNode(index, e.buttons)}
                      disabled={round.completed}
                    >
                      <span className="font-display text-sm font-bold">{letter.toUpperCase()}</span>
                    </button>
                  );
                })}

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-600 mb-1">
                      {activePath.length ? "Formed" : "Drag to form word"}
                    </div>
                    <div className="font-display text-3xl text-[#6abf5e]">
                      {activePath.length ? formedWord.toUpperCase() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" variant="secondary" onClick={clearPath} disabled={round.completed || activePath.length === 0}>
                Clear
              </Button>
              <Button size="sm" onClick={reset}>
                Shuffle
              </Button>
            </div>

            {message ? <div className="mt-3 text-xs text-zinc-400">{message}</div> : null}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-zinc-300">Found Words ({sortedWords.length})</div>
              <Button size="sm" variant="ghost" onClick={reset}>
                New Round
              </Button>
            </div>

            {sortedWords.length === 0 ? (
              <p className="text-xs text-zinc-500">No words found yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedWords.map((word) => {
                  const points = computeAnagramWordPoints(word, round.durationSeconds);
                  return (
                    <div
                      key={word}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <span className="text-xs text-zinc-200 font-mono">{word.toUpperCase()}</span>
                      <span className="text-xs text-[#6abf5e] font-mono">+{points}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AnagramArenaPage() {
  return (
    <Suspense
      fallback={
        <AppShell header={<h1 className="font-display text-lg font-bold text-white">Anagram Blitz</h1>}>
          <div className="pt-6 text-sm text-zinc-500 font-body text-center">Loading…</div>
        </AppShell>
      }
    >
      <AnagramArenaClientPage />
    </Suspense>
  );
}
