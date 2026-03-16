import { wordService } from "./WordService";

export interface PuzzleResult {
  puzzleId: string;
  solution: string;
  attempts: number;
  won: boolean;
  guesses: string[];
  timeMs: number;
}

export class PuzzleService {
  private startTime: number = 0;
  private guesses: string[] = [];
  private currentPuzzleId = "";
  private currentSolution = "";
  private storageKey = "lexis_puzzle_history";

  startPuzzle(puzzleId: string, solution: string): void {
    this.startTime = Date.now();
    this.guesses = [];
    this.currentPuzzleId = puzzleId;
    this.currentSolution = solution;
  }

  recordGuess(guess: string): void {
    this.guesses.push(guess.toLowerCase());
  }

  finishPuzzle(won: boolean): PuzzleResult {
    const result: PuzzleResult = {
      puzzleId: this.currentPuzzleId,
      solution: this.currentSolution,
      attempts: this.guesses.length,
      won,
      guesses: [...this.guesses],
      timeMs: Date.now() - this.startTime
    };
    this.persistResult(result);
    return result;
  }

  private persistResult(result: PuzzleResult): void {
    if (typeof window === "undefined") return;
    try {
      const history = this.getHistory();
      history.push(result);
      if (history.length > 500) history.splice(0, history.length - 500);
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }

  getHistory(): PuzzleResult[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getStats(): { played: number; won: number; winRate: number; streak: number; maxStreak: number; averageAttempts: number } {
    const history = this.getHistory();
    const played = history.length;
    const won = history.filter((r) => r.won).length;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
    let streak = 0;
    let maxStreak = 0;
    let current = 0;
    for (const result of history) {
      if (result.won) {
        current++;
        maxStreak = Math.max(maxStreak, current);
      } else {
        current = 0;
      }
    }
    streak = current;
    const avgAttempts = won > 0
      ? Math.round((history.filter((r) => r.won).reduce((s, r) => s + r.attempts, 0) / won) * 10) / 10
      : 0;
    return { played, won, winRate, streak, maxStreak, averageAttempts: avgAttempts };
  }

  getDailyPuzzleNumber(): number {
    const epoch = new Date("2026-01-01").getTime();
    return Math.floor((Date.now() - epoch) / 86400000) + 1;
  }

  hasSolvedDaily(): boolean {
    const history = this.getHistory();
    return history.some((r) => r.puzzleId === "daily");
  }
}

export const puzzleService = new PuzzleService();
