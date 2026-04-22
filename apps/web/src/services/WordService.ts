import englishWords from "an-array-of-english-words";
import { getUtcDayIndex } from "../utils/utc-date";

const FIVE_LETTER_WORDS = Array.from(
  new Set(
    englishWords
      .map((word) => word.toLowerCase().trim())
      .filter((word) => /^[a-z]{5}$/.test(word))
  )
);

export class WordService {
  private solutions: string[];
  private validGuesses: Set<string>;
  private usedWords: Set<string>;

  constructor() {
    this.solutions = FIVE_LETTER_WORDS;
    this.validGuesses = new Set(FIVE_LETTER_WORDS);
    this.usedWords = new Set();
  }

  isValidGuess(word: string): boolean {
    return word.length === 5 && this.validGuesses.has(word.toLowerCase());
  }

  isValidWord(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    if (!/^[a-z]+$/.test(normalized)) return false;
    if (normalized.length === 5) return this.isValidGuess(normalized);
    return englishWords.includes(normalized);
  }

  getRandomSolution(): string {
    const available = this.solutions.filter((w) => !this.usedWords.has(w));
    if (available.length === 0) {
      this.usedWords.clear();
      return this.solutions[Math.floor(Math.random() * this.solutions.length)];
    }
    const word = available[Math.floor(Math.random() * available.length)];
    this.usedWords.add(word);
    return word;
  }

  getDailySolution(): string {
    const dayIndex = getUtcDayIndex(new Date()) % this.solutions.length;
    return this.solutions[dayIndex];
  }

  getDailySolutionForDate(date: Date): string {
    const dayIndex = getUtcDayIndex(date);
    if (dayIndex < 0) return this.solutions[0];
    return this.solutions[dayIndex % this.solutions.length];
  }

  getSolutionCount(): number {
    return this.solutions.length;
  }

  getGuessCount(): number {
    return this.validGuesses.size;
  }
}

export const wordService = new WordService();
