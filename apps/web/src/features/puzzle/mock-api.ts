import type { GuessLetter, GuessRow, LetterState } from "./board";
import { wordService } from "../../services/WordService";

export interface MockPuzzle {
  id: string;
  solution: string;
  attempts: number;
  rows: GuessRow[];
  status: "playing" | "won" | "lost";
  invalidGuess: boolean;
}

function evaluateGuess(guess: string, solution: string): GuessLetter[] {
  const target = solution.split("");
  const guessChars = guess.split("");
  const result: GuessLetter[] = guessChars.map(() => ({ letter: "", state: "absent" as LetterState }));
  const targetCounts: Record<string, number> = {};

  for (const ch of target) {
    targetCounts[ch] = (targetCounts[ch] ?? 0) + 1;
  }

  // First pass: mark correct positions
  for (let i = 0; i < 5; i++) {
    result[i].letter = guessChars[i];
    if (guessChars[i] === target[i]) {
      result[i].state = "correct";
      targetCounts[guessChars[i]]--;
    }
  }

  // Second pass: mark present letters (avoids double-counting)
  for (let i = 0; i < 5; i++) {
    if (result[i].state === "correct") continue;
    if (targetCounts[guessChars[i]] > 0) {
      result[i].state = "present";
      targetCounts[guessChars[i]]--;
    } else {
      result[i].state = "absent";
    }
  }

  return result;
}

export function submitMockGuess(
  puzzle: MockPuzzle,
  guess: string
): MockPuzzle {
  const normalizedGuess = guess.toLowerCase();

  if (normalizedGuess.length !== 5) {
    return puzzle;
  }

  if (puzzle.status !== "playing") {
    return puzzle;
  }

  if (!wordService.isValidGuess(normalizedGuess)) {
    return { ...puzzle, invalidGuess: true };
  }

  const evaluated = evaluateGuess(normalizedGuess, puzzle.solution);
  const nextRows: GuessRow[] = [
    ...puzzle.rows,
    {
      id: `guess-${puzzle.rows.length + 1}`,
      letters: evaluated
    }
  ];

  const isWin = evaluated.every((cell) => cell.state === "correct");
  const attempts = puzzle.attempts + 1;

  const status: MockPuzzle["status"] =
    isWin ? "won" : attempts >= 6 ? "lost" : "playing";

  return {
    id: puzzle.id,
    solution: puzzle.solution,
    attempts,
    rows: nextRows,
    status,
    invalidGuess: false
  };
}

export function createMockPuzzle(): MockPuzzle {
  const solution = wordService.getRandomSolution();
  return {
    id: crypto.randomUUID(),
    solution,
    attempts: 0,
    rows: [],
    status: "playing",
    invalidGuess: false
  };
}

export function createDailyPuzzle(): MockPuzzle {
  const solution = wordService.getDailySolution();
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return {
    id: `daily-${d.getFullYear()}-${mm}-${dd}`,
    solution,
    attempts: 0,
    rows: [],
    status: "playing",
    invalidGuess: false
  };
}

export function createDailyPuzzleForDate(date: Date): MockPuzzle {
  const solution = wordService.getDailySolutionForDate(date);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return {
    id: `daily-${date.getFullYear()}-${mm}-${dd}`,
    solution,
    attempts: 0,
    rows: [],
    status: "playing",
    invalidGuess: false,
  };
}
