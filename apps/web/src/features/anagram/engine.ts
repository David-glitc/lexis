import { wordService } from "../../services/WordService";
import type { AnagramRoundState, AnagramSubmitResult } from "./types";

function canBuildFromRack(word: string, rack: string): boolean {
  const pool = rack.toLowerCase().split("");
  for (const letter of word) {
    const index = pool.indexOf(letter);
    if (index === -1) return false;
    pool.splice(index, 1);
  }
  return true;
}

function scoreWord(word: string): number {
  if (word.length <= 3) return 1;
  if (word.length === 4) return 2;
  if (word.length === 5) return 4;
  if (word.length === 6) return 7;
  return 10;
}

export function createAnagramRound(rack: string, durationSeconds = 60): AnagramRoundState {
  return {
    rack: rack.toLowerCase(),
    foundWords: [],
    score: 0,
    startedAt: Date.now(),
    durationSeconds,
    completed: false,
  };
}

export function submitAnagramWord(state: AnagramRoundState, inputWord: string): AnagramSubmitResult {
  const normalizedWord = inputWord.trim().toLowerCase();
  if (normalizedWord.length < 3) {
    return { accepted: false, normalizedWord, reason: "too_short", pointsAwarded: 0 };
  }
  if (!/^[a-z]+$/.test(normalizedWord)) {
    return { accepted: false, normalizedWord, reason: "invalid_chars", pointsAwarded: 0 };
  }
  if (state.foundWords.includes(normalizedWord)) {
    return { accepted: false, normalizedWord, reason: "duplicate", pointsAwarded: 0 };
  }
  if (!canBuildFromRack(normalizedWord, state.rack)) {
    return { accepted: false, normalizedWord, reason: "not_from_rack", pointsAwarded: 0 };
  }
  if (!wordService.isValidWord(normalizedWord)) {
    return { accepted: false, normalizedWord, reason: "not_in_dictionary", pointsAwarded: 0 };
  }

  const pointsAwarded = scoreWord(normalizedWord);
  state.foundWords = [...state.foundWords, normalizedWord];
  state.score += pointsAwarded;
  return { accepted: true, normalizedWord, pointsAwarded };
}

export function getRoundSecondsRemaining(state: AnagramRoundState): number {
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  return Math.max(0, state.durationSeconds - elapsed);
}

export function completeRound(state: AnagramRoundState): void {
  state.completed = true;
}
