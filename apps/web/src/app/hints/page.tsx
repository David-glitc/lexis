"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AppShell } from "../../components/layout/app-shell";
import { Board } from "../../features/puzzle/board";
import { Keyboard, type KeyboardState } from "../../features/puzzle/keyboard";
import { createMockPuzzle, submitMockGuess, type MockPuzzle } from "../../features/puzzle/mock-api";
import { Button } from "../../components/ui/button";
import { hintService, type Hint, type HintType } from "../../services/HintService";

function deriveKeyboardState(puzzle: MockPuzzle): KeyboardState {
  const state: KeyboardState = {};
  puzzle.rows.forEach((row) => {
    row.letters.forEach((cell) => {
      const key = cell.letter.toLowerCase();
      if (!key) return;
      const current = state[key];
      if (cell.state === "correct") {
        state[key] = "correct";
      } else if (cell.state === "present" && current !== "correct") {
        state[key] = "present";
      } else if (!current) {
        state[key] = "absent";
      }
    });
  });
  return state;
}

function LightbulbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function getWordClues(solution: string): { level: number; text: string; free: boolean }[] {
  const vowels = new Set("aeiou");
  const vowelCount = solution.split("").filter((c) => vowels.has(c)).length;
  const consonantCount = solution.length - vowelCount;

  const categoryMap: Record<string, string> = {
    a: "everyday actions", b: "physical objects", c: "common things",
    d: "daily activities", e: "feelings or states", f: "food or nature",
    g: "places or movement", h: "the home or body", i: "ideas or concepts",
    j: "joy or adventure", k: "knowledge or tools", l: "life or nature",
    m: "materials or making", n: "nature or numbers", o: "objects around you",
    p: "people or actions", q: "questions or quirks", r: "routines or rest",
    s: "sounds or senses", t: "time or travel", u: "useful things",
    v: "values or vision", w: "water or weather", x: "extremes or exchange",
    y: "youth or yearning", z: "zones or zeal",
  };
  const firstLetter = solution[0].toLowerCase();
  const category = categoryMap[firstLetter] ?? "everyday words";

  return [
    { level: 1, text: `This word has ${vowelCount} vowel${vowelCount !== 1 ? "s" : ""} and ${consonantCount} consonant${consonantCount !== 1 ? "s" : ""}`, free: true },
    { level: 2, text: `Think about: ${category}`, free: false },
    { level: 3, text: solution.toUpperCase(), free: false },
  ];
}

interface HintModalProps {
  open: boolean;
  onClose: () => void;
  puzzleId: string;
  solution: string;
  knownAbsent: Set<string>;
  revealedPositions: Set<number>;
  onHintUsed: (hint: Hint) => void;
  wordCluesRevealed: Set<number>;
  onWordClueReveal: (level: number) => void;
  answerRevealed: boolean;
  onRevealAnswer: () => void;
}

function HintModal({
  open,
  onClose,
  puzzleId,
  solution,
  knownAbsent,
  revealedPositions,
  onHintUsed,
  wordCluesRevealed,
  onWordClueReveal,
  answerRevealed,
  onRevealAnswer,
}: HintModalProps) {
  const credits = hintService.getCredits();
  const usedHints = hintService.getHintsUsedForPuzzle(puzzleId);
  const usedTypes = new Set(usedHints.map((h) => h.type));
  const available = hintService.getAvailableHints(puzzleId, usedTypes);
  const canUse = hintService.canUseHint(puzzleId);
  const wordClues = useMemo(() => getWordClues(solution), [solution]);

  function useHint(type: HintType) {
    let hint: Hint | null = null;
    switch (type) {
      case "reveal_letter":
        hint = hintService.revealRandomLetter(puzzleId, solution, revealedPositions);
        break;
      case "reveal_vowels":
        hint = hintService.revealVowels(puzzleId, solution);
        break;
      case "eliminate_letters":
        hint = hintService.eliminateLetters(puzzleId, solution, knownAbsent);
        break;
      case "word_pattern":
        hint = hintService.getWordPattern(puzzleId, solution);
        break;
      case "starting_letter":
        hint = hintService.revealStartingLetter(puzzleId, solution);
        break;
    }
    if (hint) onHintUsed(hint);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0a0a0a] rounded-2xl p-6 max-w-md w-full border border-white/[0.08] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#538d4e]/20 flex items-center justify-center text-[#6abf5e]">
              <LightbulbIcon size={20} />
            </div>
            <h2 className="font-display text-lg font-bold text-white">Puzzle Hints</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <CloseIcon />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 mb-5">
          <CoinIcon size={18} />
          <span className="text-sm text-zinc-400 font-body">Credits</span>
          <span className="ml-auto text-lg font-bold text-[#6abf5e] font-mono">{credits}</span>
        </div>

        <div className="mb-4">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-3">Word Clues</h3>
          <div className="space-y-2.5">
            {wordClues.map((clue) => {
              const isRevealed = wordCluesRevealed.has(clue.level) || (clue.level === 3 && answerRevealed);
              const isAnswerReveal = clue.level === 3;

              if (isRevealed) {
                return (
                  <div key={clue.level} className="rounded-xl border border-[#538d4e]/30 bg-[#538d4e]/10 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckIcon />
                      <span className="text-xs text-[#6abf5e] font-mono">Level {clue.level}</span>
                    </div>
                    <p className={`font-body ${isAnswerReveal ? "text-xl font-bold tracking-[0.3em] text-white text-center py-2" : "text-sm text-[#6abf5e]"}`}>
                      {clue.text}
                    </p>
                  </div>
                );
              }

              return (
                <button
                  key={clue.level}
                  onClick={() => {
                    if (isAnswerReveal) {
                      onRevealAnswer();
                    } else {
                      onWordClueReveal(clue.level);
                    }
                  }}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left hover:border-white/[0.12] hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-display font-semibold text-white mb-1">
                        {isAnswerReveal ? "Reveal Answer" : `Clue Level ${clue.level}`}
                      </div>
                      <div className="text-xs text-zinc-500 font-body">
                        {clue.free ? "Free" : isAnswerReveal ? "0 points for this puzzle" : "1 credit"}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400">
                      <EyeIcon />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-3">Power Hints</h3>

          {usedHints.length > 0 && (
            <div className="space-y-2.5 mb-3">
              {usedHints.map((hint, i) => (
                <div key={i} className="rounded-xl border border-[#538d4e]/30 bg-[#538d4e]/10 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckIcon />
                    <span className="text-xs text-[#6abf5e] font-mono">{hint.label}</span>
                  </div>
                  <p className="text-sm text-[#6abf5e] font-body">{hint.description}</p>
                </div>
              ))}
            </div>
          )}

          {canUse && available.length > 0 && (
            <div className="space-y-2.5">
              {available.map((h) => (
                <button
                  key={h.type}
                  onClick={() => useHint(h.type)}
                  disabled={credits < h.cost}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left hover:border-white/[0.12] hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-display font-semibold text-white mb-1">{h.label}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                        <CoinIcon /> {h.cost} credit{h.cost !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400">
                      <LightbulbIcon size={16} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!canUse && usedHints.length >= 3 && (
            <p className="text-xs text-zinc-500 text-center font-mono py-3">Max hints used for this puzzle</p>
          )}
          {!canUse && credits <= 0 && usedHints.length < 3 && (
            <p className="text-xs text-zinc-500 text-center font-mono py-3">No credits remaining. Win puzzles to earn more!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HintsPage() {
  const [puzzle, setPuzzle] = useState<MockPuzzle>(() => createMockPuzzle());
  const [currentGuess, setCurrentGuess] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [activeHints, setActiveHints] = useState<Hint[]>([]);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [wordCluesRevealed, setWordCluesRevealed] = useState<Set<number>>(new Set());
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [zeroPoints, setZeroPoints] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((msg: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setShowToast(msg);
    toastTimeout.current = setTimeout(() => setShowToast(null), 2000);
  }, []);

  const keyboardState = useMemo(() => deriveKeyboardState(puzzle), [puzzle]);

  const knownAbsent = useMemo(() => {
    const absent = new Set<string>();
    puzzle.rows.forEach((row) => {
      row.letters.forEach((cell) => {
        if (cell.state === "absent") absent.add(cell.letter.toLowerCase());
      });
    });
    return absent;
  }, [puzzle.rows]);

  const revealedPositions = useMemo(() => {
    const positions = new Set<number>();
    puzzle.rows.forEach((row) => {
      row.letters.forEach((cell, i) => {
        if (cell.state === "correct") positions.add(i);
      });
    });
    return positions;
  }, [puzzle.rows]);

  const credits = hintService.getCredits();

  const handleKey = useCallback(
    (key: string) => {
      if (puzzle.status !== "playing") return;
      if (key === "enter") {
        if (currentGuess.length !== 5) {
          toast("Not enough letters");
          setShakeRow(true);
          setTimeout(() => setShakeRow(false), 600);
          return;
        }
        const next = submitMockGuess(puzzle, currentGuess);
        if (next.invalidGuess) {
          toast("Not in word list");
          setShakeRow(true);
          setTimeout(() => setShakeRow(false), 600);
          return;
        }
        setPuzzle(next);
        setCurrentGuess("");
        if (next.status === "won") {
          if (zeroPoints) {
            toast("Solved! (0 points — answer was revealed)");
          } else {
            toast("Puzzle Conquered! +2 credits");
            hintService.addCredits(2);
          }
        } else if (next.status === "lost") {
          toast(next.solution.toUpperCase());
        }
        return;
      }
      if (key === "backspace") {
        setCurrentGuess((v) => v.slice(0, -1));
        return;
      }
      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((v) => v + key);
      }
    },
    [currentGuess, puzzle, toast, zeroPoints]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "enter") { event.preventDefault(); handleKey("enter"); }
      else if (key === "backspace") { event.preventDefault(); handleKey("backspace"); }
      else if (/^[a-z]$/.test(key)) { event.preventDefault(); handleKey(key); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKey]);

  const composedRows = useMemo(() => {
    const rows = [...puzzle.rows];
    if (puzzle.status === "playing") {
      rows.push({
        id: "current",
        letters: Array.from({ length: 5 }, (_, i) => ({
          letter: currentGuess[i] ?? "",
          state: "empty" as const
        }))
      });
    }
    while (rows.length < 6) {
      rows.push({
        id: `empty-${rows.length}`,
        letters: Array.from({ length: 5 }, () => ({ letter: "", state: "empty" as const }))
      });
    }
    return rows;
  }, [puzzle.rows, puzzle.status, currentGuess]);

  function startNew() {
    setPuzzle(createMockPuzzle());
    setCurrentGuess("");
    setActiveHints([]);
    setWordCluesRevealed(new Set());
    setAnswerRevealed(false);
    setZeroPoints(false);
  }

  return (
    <AppShell
      header={
        <span className="font-display text-lg font-bold text-white">Training Mode</span>
      }
      footer={
        puzzle.status !== "playing" ? (
          <Button fullWidth size="lg" onClick={startNew}>
            Train Again
          </Button>
        ) : null
      }
    >
      <div className="flex flex-1 flex-col items-center gap-3 pb-2 relative">
        {showToast && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 animate-toast">
            <div className="bg-white text-black text-sm font-bold px-5 py-2.5 rounded-full shadow-lg font-body">
              {showToast}
            </div>
          </div>
        )}

        <div className="text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            {puzzle.status === "won"
              ? "Solved!"
              : puzzle.status === "lost"
              ? `Answer: ${puzzle.solution.toUpperCase()}`
              : `Attempt ${puzzle.attempts + 1} of 6`}
          </span>
        </div>

        <div className={`w-full max-w-[350px] mx-auto ${shakeRow && puzzle.status === "playing" ? "animate-shake" : ""}`}>
          <Board rows={composedRows} />
        </div>

        <div className="w-full px-2 md:px-0 md:max-w-[500px] mx-auto mt-auto pt-4 relative">
          {puzzle.status === "playing" && (
            <button
              onClick={() => setHintModalOpen(true)}
              className="absolute -top-2 right-2 md:right-0 z-30 w-12 h-12 rounded-full bg-[#538d4e]/20 border border-[#538d4e]/30 flex items-center justify-center text-[#6abf5e] transition-all hover:bg-[#538d4e]/30 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(83,141,78,0.2)] animate-pulse-subtle"
            >
              <LightbulbIcon size={22} />
              {credits > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#538d4e] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {credits > 9 ? "9+" : credits}
                </span>
              )}
            </button>
          )}
          <Keyboard state={keyboardState} onKey={handleKey} />
        </div>
      </div>

      <HintModal
        open={hintModalOpen}
        onClose={() => setHintModalOpen(false)}
        puzzleId={puzzle.id}
        solution={puzzle.solution}
        knownAbsent={knownAbsent}
        revealedPositions={revealedPositions}
        onHintUsed={(hint) => {
          setActiveHints((prev) => [...prev, hint]);
          toast(hint.description);
        }}
        wordCluesRevealed={wordCluesRevealed}
        onWordClueReveal={(level) => {
          setWordCluesRevealed((prev) => new Set(prev).add(level));
          if (level === 1) {
            const clues = getWordClues(puzzle.solution);
            toast(clues[0].text);
          } else {
            toast("Clue revealed!");
          }
        }}
        answerRevealed={answerRevealed}
        onRevealAnswer={() => {
          setAnswerRevealed(true);
          setZeroPoints(true);
          toast("Answer revealed — 0 points for this puzzle");
        }}
      />

    </AppShell>
  );
}
