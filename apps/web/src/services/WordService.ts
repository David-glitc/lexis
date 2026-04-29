import englishWords from "an-array-of-english-words";
import { getUtcDayIndex } from "../utils/utc-date";

function normalizeDictionaryWord(word: string): string {
  return word.toLowerCase().trim();
}

const DICTIONARY_SET = new Set(
  englishWords
    .map((word) => normalizeDictionaryWord(word))
    .filter((word) => /^[a-z]+$/.test(word))
);

const FIVE_LETTER_WORDS = Array.from(
  new Set(
    Array.from(DICTIONARY_SET).filter((word) => /^[a-z]{5}$/.test(word))
  )
);

export class WordService {
  private solutions: string[];
  private validGuesses: Set<string>;
  private dictionaryWords: Set<string>;
  private usedWords: Set<string>;
  private byLengthCache: Map<number, string[]>;

  constructor() {
    this.solutions = FIVE_LETTER_WORDS;
    this.validGuesses = new Set(FIVE_LETTER_WORDS);
    this.dictionaryWords = DICTIONARY_SET;
    this.usedWords = new Set();
    this.byLengthCache = new Map();
  }

  isValidGuess(word: string): boolean {
    return word.length === 5 && this.validGuesses.has(word.toLowerCase());
  }

  isValidWord(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    if (!/^[a-z]+$/.test(normalized)) return false;
    if (normalized.length === 5) return this.isValidGuess(normalized);
    return this.dictionaryWords.has(normalized);
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

  getRandomDictionaryWord(minLength = 6, maxLength = 8): string {
    const normalizedMin = Math.max(3, Math.floor(minLength));
    const normalizedMax = Math.max(normalizedMin, Math.floor(maxLength));
    const length = normalizedMin + Math.floor(Math.random() * (normalizedMax - normalizedMin + 1));

    if (!this.byLengthCache.has(length)) {
      const words = Array.from(this.dictionaryWords).filter((word) => word.length === length);
      this.byLengthCache.set(length, words);
    }

    const wordsForLength = this.byLengthCache.get(length) ?? [];
    if (!wordsForLength.length) {
      return this.getRandomSolution();
    }
    return wordsForLength[Math.floor(Math.random() * wordsForLength.length)];
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
