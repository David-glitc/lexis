"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { wordService } from "../../../services/WordService";
import type { AnagramRoundState } from "../../../features/anagram/types";

const VALID_DURATION_SECONDS = [30, 60, 120] as const;

const supabase = createClient();
const pointsService = new PointsService(supabase);
const profileService = new ProfileService(supabase);

function randomRack(): string {
  return wordService.getRandomDictionaryWord(6, 8);
}

const WHEEL_SIZE_PX = 320;
const NODE_SIZE_PX = 52;
const WHEEL_RADIUS_PX = 125;

function createDefaultLetterOrder(rack: string): number[] {
  return rack.split("").map((_, index) => index);
}

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

  const [activePath, setActivePath] = useState<number[]>([]);
  const activePathRef = useRef<number[]>(activePath);

  const [displayWords, setDisplayWords] = useState<string[]>([]);
  const displayWordsRef = useRef<string[]>(displayWords);
  const [letterOrder, setLetterOrder] = useState<number[]>(() => createDefaultLetterOrder(round.rack));
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const draggingRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const lastNearestIndexRef = useRef<number | null>(null);

  const rackLetters = useMemo(() => round.rack.split(""), [round.rack]);
  const displayedRackLetters = useMemo(
    () => letterOrder.map((index) => rackLetters[index] ?? ""),
    [letterOrder, rackLetters]
  );

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  useEffect(() => {
    displayWordsRef.current = displayWords;
  }, [displayWords]);

  // If the user changes timer (via query params), start a fresh round.
  useEffect(() => {
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
    setActivePath([]);
    setDisplayWords([]);
    setLetterOrder(createDefaultLetterOrder(nextRound.rack));
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
    // Maintain display order within the session: new words append at the end unless the user shuffles.
    setDisplayWords((prev) => {
      const existing = new Set(prev);
      const next = [...prev];
      for (const w of round.foundWords) {
        if (!existing.has(w)) {
          existing.add(w);
          next.push(w);
        }
      }
      return next;
    });
  }, [round.foundWords]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentRound = roundRef.current;
      const left = getRoundSecondsRemaining(currentRound);

      if (left !== lastLeftRef.current) {
        lastLeftRef.current = left;
        setSecondsLeft(left);
      }

      if (left === 0 && !currentRound.completed) {
        draggingRef.current = false;
        dragPointerIdRef.current = null;
        lastNearestIndexRef.current = null;
        setActivePath([]);
        completeRound(currentRound);
        setRound({ ...currentRound });

        const userId = userIdRef.current;
        if (userId) {
          pointsService
            .recordAnagramRoundCompleted(userId, {
              startedAt: currentRound.startedAt,
              durationSeconds: currentRound.durationSeconds,
              rack: currentRound.rack,
              foundWords: displayWordsRef.current,
              totalScore: currentRound.score,
            })
            .catch(() => {});
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const formedWord = useMemo(() => {
    if (!activePath.length) return "";
    return activePath.map((i) => displayedRackLetters[i] ?? "").join("");
  }, [activePath, displayedRackLetters]);

  const shuffleLetterOrder = useCallback(() => {
    if (round.completed) return;
    setLetterOrder((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, [round.completed]);

  const clearPath = useCallback(() => {
    draggingRef.current = false;
    dragPointerIdRef.current = null;
    lastNearestIndexRef.current = null;
    setActivePath([]);
  }, []);

  const startNextRound = useCallback(() => {
    setActivePath([]);
    setDisplayWords([]);
    const nextRound = createAnagramRound(randomRack(), durationSeconds);
    setRound(nextRound);
    setMessage("");
    setSecondsLeft(nextRound.durationSeconds);
    lastLeftRef.current = nextRound.durationSeconds;
    setLetterOrder(createDefaultLetterOrder(nextRound.rack));
    setShowHistoryPanel(false);
  }, [durationSeconds]);

  const finalizeWord = useCallback(() => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    dragPointerIdRef.current = null;
    lastNearestIndexRef.current = null;

    const currentRound = roundRef.current;
    if (currentRound.completed) {
      setActivePath([]);
      return;
    }

    const indices = activePathRef.current;
    setActivePath([]);
    if (!indices.length) return;

    const letters = displayedRackLetters;
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
            roundStartedAt: currentRound.startedAt,
            word: result.normalizedWord,
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
  }, [displayedRackLetters]);

  useEffect(() => {
    function onPointerUp(e: PointerEvent) {
      if (!draggingRef.current) return;
      if (dragPointerIdRef.current !== e.pointerId) return;
      finalizeWord();
    }
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [finalizeWord]);

  useEffect(() => {
    const thresholdPx = NODE_SIZE_PX / 2 + 14;
    const thresholdSq = thresholdPx * thresholdPx;

    function findNearestIndex(x: number, y: number): number | null {
      const wheelEl = wheelRef.current;
      if (!wheelEl) return null;
      const wheelRect = wheelEl.getBoundingClientRect();
      let nearest: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < displayedRackLetters.length; i += 1) {
        const nodeEl = nodeRefs.current[i];
        if (!nodeEl) continue;
        const nodeRect = nodeEl.getBoundingClientRect();
        const nodeX = nodeRect.left - wheelRect.left + nodeRect.width / 2;
        const nodeY = nodeRect.top - wheelRect.top + nodeRect.height / 2;
        const dx = x - nodeX;
        const dy = y - nodeY;
        const dist = dx * dx + dy * dy;
        if (dist <= thresholdSq && dist < bestDist) {
          bestDist = dist;
          nearest = i;
        }
      }
      return nearest;
    }

    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      if (dragPointerIdRef.current !== e.pointerId) return;

      const wheelEl = wheelRef.current;
      if (!wheelEl) return;

      const rect = wheelEl.getBoundingClientRect();
      const xLocal = e.clientX - rect.left;
      const yLocal = e.clientY - rect.top;

      if (roundRef.current.completed) return;

      const path = activePathRef.current;
      const nearestIndex = findNearestIndex(xLocal, yLocal);
      if (nearestIndex === null) return;

      if (nearestIndex === lastNearestIndexRef.current) return;
      if (!path.length) {
        setActivePath([nearestIndex]);
        lastNearestIndexRef.current = nearestIndex;
        return;
      }

      const lastIndex = path[path.length - 1];
      const previousIndex = path.length > 1 ? path[path.length - 2] : null;

      if (nearestIndex === lastIndex) {
        lastNearestIndexRef.current = nearestIndex;
        return;
      }

      if (previousIndex !== null && nearestIndex === previousIndex) {
        setActivePath((prev) => prev.slice(0, -1));
        lastNearestIndexRef.current = nearestIndex;
        return;
      }

      if (path.includes(nearestIndex)) {
        lastNearestIndexRef.current = nearestIndex;
        return;
      }

      setActivePath((prev) => [...prev, nearestIndex]);
      lastNearestIndexRef.current = nearestIndex;
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true } as any);
    return () => window.removeEventListener("pointermove", onPointerMove as any);
  }, [displayedRackLetters.length]);

  const onPointerDownNode = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (round.completed) return;
      draggingRef.current = true;
      dragPointerIdRef.current = e.pointerId;
      lastNearestIndexRef.current = index;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture may not exist on some environments; fallback to window handlers.
      }

      setActivePath([index]);
      setMessage("");
    },
    [round.completed]
  );

  const activeLines = useMemo(() => {
    const lines: Array<{ from: number; to: number; key: string }> = [];
    for (let i = 1; i < activePath.length; i += 1) {
      lines.push({
        from: activePath[i - 1],
        to: activePath[i],
        key: `${activePath[i - 1]}-${activePath[i]}-${i}`,
      });
    }
    return lines;
  }, [activePath]);

  const nodeMotion = useMemo(
    () =>
      displayedRackLetters.map((letter, index) => {
        const driftX = ((letter.charCodeAt(0) + index * 13) % 9) - 4;
        const driftY = ((letter.charCodeAt(0) + index * 7) % 9) - 4;
        const duration = 2.6 + ((index % 5) * 0.3);
        const delay = (index % 4) * 0.15;
        return { driftX, driftY, duration, delay };
      }),
    [displayedRackLetters]
  );

  const nodePalette = useMemo(
    () =>
      displayedRackLetters.map((letter, index) => {
        const seed = (letter.charCodeAt(0) + index * 17) % 5;
        const shades = [
          { top: "#8BFF80", base: "#3D8A37", edge: "#B9FFB2" },
          { top: "#85B7FF", base: "#3E5EA3", edge: "#B8D2FF" },
          { top: "#FFC97A", base: "#A46B2E", edge: "#FFE0AC" },
          { top: "#D8A2FF", base: "#7A4AAD", edge: "#EDCDFF" },
          { top: "#89F1FF", base: "#2C8C97", edge: "#C1FAFF" },
        ];
        return shades[seed];
      }),
    [displayedRackLetters]
  );

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
                ref={wheelRef}
                className="relative rounded-2xl border border-white/[0.06] bg-black/30"
                style={{ width: WHEEL_SIZE_PX, height: WHEEL_SIZE_PX, touchAction: "none" }}
              >
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={WHEEL_SIZE_PX}
                  height={WHEEL_SIZE_PX}
                  viewBox={`0 0 ${WHEEL_SIZE_PX} ${WHEEL_SIZE_PX}`}
                >
                  {activeLines.map((l) => {
                    const from = getNodePosition(l.from, displayedRackLetters.length);
                    const to = getNodePosition(l.to, displayedRackLetters.length);
                    return (
                      <line
                        key={l.key}
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

                {displayedRackLetters.map((letter, index) => {
                  const pos = getNodePosition(index, displayedRackLetters.length);
                  const active = activePath.includes(index);
                  const motion = nodeMotion[index];
                  const palette = nodePalette[index] ?? { top: "#8BFF80", base: "#3D8A37", edge: "#B9FFB2" };

                  return (
                    <button
                      key={`${letter}-${index}`}
                      type="button"
                      ref={(element) => {
                        nodeRefs.current[index] = element;
                      }}
                      className={`absolute rounded-full flex items-center justify-center select-none transition-colors ${
                        active ? "text-white" : "text-white"
                      } ${round.completed ? "opacity-40 cursor-not-allowed" : ""}`}
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: NODE_SIZE_PX,
                        height: NODE_SIZE_PX,
                        transform: `translate(-50%, -50%) scale(${active ? 1.1 : 1})`,
                        border: active ? "1px solid #b8f9a4" : `1px solid ${palette.edge}`,
                        background: active
                          ? "radial-gradient(circle at 30% 25%, #C5FFB8 0%, #6BCF5A 45%, #3D8A37 100%)"
                          : `radial-gradient(circle at 30% 25%, ${palette.top} 0%, ${palette.base} 60%, #1c1c1c 100%)`,
                        boxShadow: active
                          ? "0 12px 22px rgba(83,141,78,0.55), inset 0 3px 8px rgba(255,255,255,0.4), inset 0 -6px 10px rgba(0,0,0,0.3)"
                          : "0 10px 20px rgba(0,0,0,0.42), inset 0 3px 8px rgba(255,255,255,0.32), inset 0 -6px 10px rgba(0,0,0,0.35)",
                        transition:
                          "left 360ms cubic-bezier(0.22, 1, 0.36, 1), top 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 120ms ease, border-color 120ms ease, box-shadow 150ms ease",
                        touchAction: "none",
                        animation: active
                          ? "none"
                          : `anagram-node-float ${motion.duration}s ease-in-out ${motion.delay}s infinite alternate`,
                        ["--driftX" as any]: `${motion.driftX}px`,
                        ["--driftY" as any]: `${motion.driftY}px`,
                      }}
                      onPointerDown={(e) => onPointerDownNode(index, e)}
                      disabled={round.completed}
                    >
                      <span className="font-display text-sm font-bold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>
                        {letter.toUpperCase()}
                      </span>
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
              <Button size="sm" onClick={shuffleLetterOrder} disabled={round.completed || displayedRackLetters.length < 2}>
                Shuffle
              </Button>
              <Button size="sm" variant="ghost" onClick={startNextRound}>
                Restart
              </Button>
            </div>

            <div className="mt-3 md:hidden flex items-center justify-center">
              <Button size="sm" variant="secondary" onClick={() => setShowHistoryPanel(true)}>
                History
              </Button>
            </div>

            {message ? <div className="mt-3 text-xs text-zinc-400">{message}</div> : null}
          </div>

          <div className="hidden md:block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-zinc-300">Found Words ({displayWords.length})</div>
              <Button size="sm" variant="ghost" onClick={startNextRound}>
                New Round
              </Button>
            </div>

            {displayWords.length === 0 ? (
              <p className="text-xs text-zinc-500">No words found yet.</p>
            ) : (
              <div className="space-y-2">
                {displayWords.map((word) => {
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

        {showHistoryPanel && (
          <div className="fixed inset-0 z-[70] md:hidden" onClick={() => setShowHistoryPanel(false)}>
            <div className="absolute inset-0 bg-black/70" />
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-white/[0.08] bg-[#0a0a0a] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-zinc-300">Found Words ({displayWords.length})</div>
                <Button size="sm" variant="ghost" onClick={() => setShowHistoryPanel(false)}>
                  Close
                </Button>
              </div>
              {displayWords.length === 0 ? (
                <p className="text-xs text-zinc-500">No words found yet.</p>
              ) : (
                <div className="space-y-2 max-h-[50dvh] overflow-auto pr-1">
                  {displayWords.map((word) => {
                    const points = computeAnagramWordPoints(word, round.durationSeconds);
                    return (
                      <div
                        key={`m-${word}`}
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
        )}
      </div>
      <style jsx>{`
        @keyframes anagram-node-float {
          from {
            transform: translate(calc(-50% + 0px), calc(-50% + 0px)) scale(1);
          }
          to {
            transform: translate(calc(-50% + var(--driftX)), calc(-50% + var(--driftY))) scale(1.02);
          }
        }
      `}</style>
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
