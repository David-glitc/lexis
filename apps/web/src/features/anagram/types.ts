export interface AnagramRoundState {
  rack: string;
  foundWords: string[];
  score: number;
  startedAt: number;
  durationSeconds: number;
  completed: boolean;
}

export interface AnagramSubmitResult {
  accepted: boolean;
  normalizedWord: string;
  reason?: "too_short" | "invalid_chars" | "not_in_dictionary" | "not_from_rack" | "duplicate";
  pointsAwarded: number;
}
