export type LetterResult = "correct" | "present" | "absent";
export type GameMode = "daily" | "infinite" | "challenge" | "daily_speed" | "speed";
export type SessionStatus = "playing" | "won" | "lost" | "expired";
export type ChallengeStatus = "pending" | "active" | "completed" | "expired";

export interface PuzzleSession {
  id: string;
  userId: string;
  mode: GameMode;
  puzzleId: string;
  seed: string;
  signature: string;
  dateKey: string | null;
  solution: string;
  guesses: string[];
  status: SessionStatus;
  startedAt: number;
  completedAt: number | null;
  maxAttempts: number;
  finalized: boolean;
}

export interface ChallengeRecord {
  id: string;
  creatorId: string;
  opponentId: string;
  seed: string;
  puzzleId: string;
  solution: string;
  timeLimitSeconds: number | null;
  status: ChallengeStatus;
  createdAt: number;
  expiresAt: number;
  creatorResult: { attempts: number; elapsedMs: number; won: boolean } | null;
  opponentResult: { attempts: number; elapsedMs: number; won: boolean } | null;
  winnerId: string | null;
}

export interface EvaluatedLetter {
  letter: string;
  result: LetterResult;
}
