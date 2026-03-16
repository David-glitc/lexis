export const lexisVersion = "0.1.0";

export type LetterResult = "correct" | "present" | "absent";

export interface EvaluatedLetter {
  letter: string;
  result: LetterResult;
}

export function evaluateGuessAgainstSolution(
  guess: string,
  solution: string
): EvaluatedLetter[] {
  const guessLetters = guess.toLowerCase().split("");
  const solutionLetters = solution.toLowerCase().split("");

  return guessLetters.map((letter, index) => {
    let result: LetterResult = "absent";

    if (solutionLetters[index] === letter) {
      result = "correct";
    } else if (solutionLetters.includes(letter)) {
      result = "present";
    }

    return { letter, result };
  });
}

export interface Friend {
  userId: string;
  username: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  puzzleSeed: string;
  attemptLimit: number;
  createdAt: number;
}

export interface ChallengeResult {
  challengeId: string;
  userId: string;
  attempts: number;
  elapsedMs: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  puzzlesSolved: number;
  streak: number;
  averageAttempts: number;
}

export function computeScore(entry: LeaderboardEntry): number {
  const { puzzlesSolved, streak, averageAttempts } = entry;
  return puzzlesSolved * 5 + streak * 3 - averageAttempts * 2;
}

