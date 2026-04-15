import { createDailyPuzzleForDate, submitMockGuess } from "./mock-api";

describe("mock-api deterministic behavior", () => {
  test("same UTC date always returns same daily puzzle id and solution", () => {
    const dateA = new Date("2026-04-15T01:00:00.000Z");
    const dateB = new Date("2026-04-15T22:00:00.000Z");

    const puzzleA = createDailyPuzzleForDate(dateA);
    const puzzleB = createDailyPuzzleForDate(dateB);

    expect(puzzleA.id).toBe(puzzleB.id);
    expect(puzzleA.solution).toBe(puzzleB.solution);
  });

  test("submission updates attempts and keeps lifecycle deterministic", () => {
    const puzzle = createDailyPuzzleForDate(new Date("2026-04-16T00:00:00.000Z"));
    const next = submitMockGuess(puzzle, "crane");
    expect(next.attempts).toBe(1);
    expect(next.rows).toHaveLength(1);
    expect(["playing", "won", "lost"]).toContain(next.status);
  });
});

