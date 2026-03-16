export type HintType =
  | "reveal_letter"
  | "reveal_vowels"
  | "eliminate_letters"
  | "word_pattern"
  | "starting_letter";

export interface Hint {
  type: HintType;
  label: string;
  description: string;
  cost: number;
  data: string;
}

export class HintService {
  private hintsUsed: Map<string, Hint[]> = new Map();
  private maxHintsPerPuzzle = 3;
  private storageKey = "lexis_hint_credits";

  getCredits(): number {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? parseInt(raw, 10) : 10;
    } catch {
      return 10;
    }
  }

  private setCredits(credits: number): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, String(credits));
    } catch {}
  }

  addCredits(amount: number): number {
    const current = this.getCredits();
    const next = current + amount;
    this.setCredits(next);
    return next;
  }

  getHintsUsedForPuzzle(puzzleId: string): Hint[] {
    return this.hintsUsed.get(puzzleId) ?? [];
  }

  canUseHint(puzzleId: string): boolean {
    const used = this.getHintsUsedForPuzzle(puzzleId);
    return used.length < this.maxHintsPerPuzzle && this.getCredits() > 0;
  }

  revealRandomLetter(
    puzzleId: string,
    solution: string,
    revealedPositions: Set<number>
  ): Hint | null {
    if (!this.canUseHint(puzzleId)) return null;

    const unrevealed = [];
    for (let i = 0; i < solution.length; i++) {
      if (!revealedPositions.has(i)) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return null;

    const pos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const hint: Hint = {
      type: "reveal_letter",
      label: "Reveal Letter",
      description: `Position ${pos + 1} is "${solution[pos].toUpperCase()}"`,
      cost: 1,
      data: `${pos}:${solution[pos]}`
    };

    this.recordHint(puzzleId, hint);
    return hint;
  }

  revealVowels(puzzleId: string, solution: string): Hint | null {
    if (!this.canUseHint(puzzleId)) return null;

    const vowels = new Set("aeiou");
    const solutionVowels: string[] = [];
    const positions: number[] = [];

    for (let i = 0; i < solution.length; i++) {
      if (vowels.has(solution[i])) {
        solutionVowels.push(solution[i].toUpperCase());
        positions.push(i + 1);
      }
    }

    const desc = solutionVowels.length > 0
      ? `Vowels: ${solutionVowels.join(", ")} at position(s) ${positions.join(", ")}`
      : "No vowels in this word!";

    const hint: Hint = {
      type: "reveal_vowels",
      label: "Reveal Vowels",
      description: desc,
      cost: 2,
      data: positions.map((p, i) => `${p}:${solutionVowels[i]}`).join(",")
    };

    this.recordHint(puzzleId, hint);
    return hint;
  }

  eliminateLetters(
    puzzleId: string,
    solution: string,
    knownAbsent: Set<string>
  ): Hint | null {
    if (!this.canUseHint(puzzleId)) return null;

    const solutionLetters = new Set(solution.split(""));
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const candidates = alphabet.filter(
      (l) => !solutionLetters.has(l) && !knownAbsent.has(l)
    );

    const toEliminate = candidates.slice(0, Math.min(5, candidates.length));
    const hint: Hint = {
      type: "eliminate_letters",
      label: "Eliminate Letters",
      description: `These letters are NOT in the word: ${toEliminate.map((l) => l.toUpperCase()).join(", ")}`,
      cost: 1,
      data: toEliminate.join(",")
    };

    this.recordHint(puzzleId, hint);
    return hint;
  }

  getWordPattern(puzzleId: string, solution: string): Hint | null {
    if (!this.canUseHint(puzzleId)) return null;

    const vowels = new Set("aeiou");
    const pattern = solution
      .split("")
      .map((ch) => (vowels.has(ch) ? "V" : "C"))
      .join("");

    const hint: Hint = {
      type: "word_pattern",
      label: "Word Pattern",
      description: `Pattern: ${pattern} (C=consonant, V=vowel)`,
      cost: 1,
      data: pattern
    };

    this.recordHint(puzzleId, hint);
    return hint;
  }

  revealStartingLetter(puzzleId: string, solution: string): Hint | null {
    if (!this.canUseHint(puzzleId)) return null;

    const hint: Hint = {
      type: "starting_letter",
      label: "Starting Letter",
      description: `The word starts with "${solution[0].toUpperCase()}"`,
      cost: 1,
      data: `0:${solution[0]}`
    };

    this.recordHint(puzzleId, hint);
    return hint;
  }

  private recordHint(puzzleId: string, hint: Hint): void {
    const existing = this.hintsUsed.get(puzzleId) ?? [];
    existing.push(hint);
    this.hintsUsed.set(puzzleId, existing);
    this.setCredits(this.getCredits() - hint.cost);
  }

  getAvailableHints(puzzleId: string, usedTypes: Set<HintType>): { type: HintType; label: string; cost: number }[] {
    const all: { type: HintType; label: string; cost: number }[] = [
      { type: "reveal_letter", label: "Reveal a Letter", cost: 1 },
      { type: "reveal_vowels", label: "Show Vowel Positions", cost: 2 },
      { type: "eliminate_letters", label: "Eliminate 5 Letters", cost: 1 },
      { type: "word_pattern", label: "Show C/V Pattern", cost: 1 },
      { type: "starting_letter", label: "Reveal First Letter", cost: 1 }
    ];
    return all.filter((h) => !usedTypes.has(h.type));
  }
}

export const hintService = new HintService();
