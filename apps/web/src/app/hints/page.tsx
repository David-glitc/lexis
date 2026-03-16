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

function LightbulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  );
}

function HintPanel({
  puzzleId,
  solution,
  knownAbsent,
  revealedPositions,
  onHintUsed
}: {
  puzzleId: string;
  solution: string;
  knownAbsent: Set<string>;
  revealedPositions: Set<number>;
  onHintUsed: (hint: Hint) => void;
}) {
  const credits = hintService.getCredits();
  const usedHints = hintService.getHintsUsedForPuzzle(puzzleId);
  const usedTypes = new Set(usedHints.map((h) => h.type));
  const available = hintService.getAvailableHints(puzzleId, usedTypes);
  const canUse = hintService.canUseHint(puzzleId);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400 font-body">
          <LightbulbIcon />
          <span>Hints</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-[#6abf5e] font-mono">
          <CoinIcon />
          <span>{credits} credits</span>
        </div>
      </div>

      {usedHints.length > 0 && (
        <div className="space-y-2">
          {usedHints.map((hint, i) => (
            <div key={i} className="rounded-xl bg-[#538d4e]/10 border border-[#538d4e]/20 p-3 text-sm text-[#6abf5e] font-body">
              {hint.description}
            </div>
          ))}
        </div>
      )}

      {canUse && available.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {available.map((h) => (
            <button
              key={h.type}
              onClick={() => useHint(h.type)}
              disabled={credits < h.cost}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left text-xs hover:border-white/[0.12] hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed card-hover"
            >
              <div className="text-white mb-1 font-display font-semibold">{h.label}</div>
              <div className="text-zinc-500 flex items-center gap-1 font-mono">
                <CoinIcon /> {h.cost}
              </div>
            </button>
          ))}
        </div>
      )}

      {!canUse && usedHints.length >= 3 && (
        <p className="text-xs text-zinc-500 text-center font-mono">Max hints used for this puzzle</p>
      )}
      {!canUse && credits <= 0 && usedHints.length < 3 && (
        <p className="text-xs text-zinc-500 text-center font-mono">No credits remaining. Win puzzles to earn more!</p>
      )}
    </div>
  );
}

export default function HintsPage() {
  const [puzzle, setPuzzle] = useState<MockPuzzle>(() => createMockPuzzle());
  const [currentGuess, setCurrentGuess] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [activeHints, setActiveHints] = useState<Hint[]>([]);
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
          toast("Puzzle Conquered! +2 credits");
          hintService.addCredits(2);
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
    [currentGuess, puzzle, toast]
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
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-bold text-white">Training Mode</span>
          <span className="text-[10px] px-3 py-1 rounded-full bg-[#538d4e]/10 text-[#6abf5e] border border-[#538d4e]/20 font-mono uppercase tracking-wider">Training</span>
        </div>
      }
      footer={
        puzzle.status !== "playing" ? (
          <Button fullWidth size="lg" onClick={startNew}>
            Train Again
          </Button>
        ) : null
      }
      sidebar={false}
    >
      <div className="flex flex-1 flex-col gap-3 pb-2 relative">
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

        <div className={shakeRow && puzzle.status === "playing" ? "animate-shake" : ""}>
          <Board rows={composedRows} />
        </div>

        {puzzle.status === "playing" && (
          <HintPanel
            puzzleId={puzzle.id}
            solution={puzzle.solution}
            knownAbsent={knownAbsent}
            revealedPositions={revealedPositions}
            onHintUsed={(hint) => {
              setActiveHints((prev) => [...prev, hint]);
              toast(hint.description);
            }}
          />
        )}

        <Keyboard state={keyboardState} onKey={handleKey} />
      </div>
    </AppShell>
  );
}
