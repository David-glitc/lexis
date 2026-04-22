import { createHash, randomUUID } from "crypto";
import type { EvaluatedLetter, GameMode } from "../types";

const SOLUTION_WORDS = [
  "angle", "brave", "crane", "doubt", "eager", "fable", "glint", "honey", "index", "jolly",
  "kneel", "lunar", "mango", "noble", "ocean", "pride", "quick", "raven", "sugar", "trust",
  "urban", "vigor", "waltz", "xenon", "yacht", "zesty", "adore", "blend", "charm", "drift",
  "elbow", "flair", "grace", "heart", "ivory", "joker", "karma", "lemon", "merit", "nylon",
  "orbit", "piano", "quilt", "robot", "smile", "tiger", "ultra", "vivid", "whale", "yield",
];

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function signValue(secret: string, value: string): string {
  return sha256Hex(`${secret}:${value}`);
}

export function deriveSeed(mode: GameMode, dateKey: string, challengeId?: string): string {
  const raw = challengeId ? `lexis:${mode}:${dateKey}:${challengeId}` : `lexis:${mode}:${dateKey}`;
  return sha256Hex(raw);
}

export function pickSolution(seed: string): string {
  const idx = parseInt(seed.slice(0, 8), 16) % SOLUTION_WORDS.length;
  return SOLUTION_WORDS[Math.abs(idx)];
}

export function evaluateGuessAgainstSolution(guess: string, solution: string): EvaluatedLetter[] {
  const guessLetters = guess.toLowerCase().split("");
  const solutionLetters = solution.toLowerCase().split("");
  return guessLetters.map((letter, index) => {
    let result: "correct" | "present" | "absent" = "absent";
    if (solutionLetters[index] === letter) result = "correct";
    else if (solutionLetters.includes(letter)) result = "present";
    return { letter, result };
  });
}

export function computeTier(elo: number): string {
  if (elo >= 2000) return "grandmaster";
  if (elo >= 1750) return "diamond";
  if (elo >= 1550) return "platinum";
  if (elo >= 1350) return "gold";
  if (elo >= 1200) return "silver";
  return "bronze";
}

export function computeScore(input: { attempts: number; elapsedMs: number; won: boolean; streakBonus?: number; difficultyMultiplier?: number }): number {
  const base = input.won ? 120 : 15;
  const attemptPenalty = Math.max(0, input.attempts - 1) * 10;
  const timePenalty = Math.floor(input.elapsedMs / 3000);
  const scaled = Math.round((base + (input.streakBonus ?? 0) - attemptPenalty - timePenalty) * (input.difficultyMultiplier ?? 1));
  return Math.max(0, scaled);
}

export function newId(): string {
  return randomUUID();
}
