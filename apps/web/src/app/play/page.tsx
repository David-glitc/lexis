"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Board } from "../../features/puzzle/board";
import { Keyboard, type KeyboardState } from "../../features/puzzle/keyboard";
import {
  createMockPuzzle,
  createDailyPuzzle,
  createDailyPuzzleForDate,
  submitMockGuess,
  type MockPuzzle
} from "../../features/puzzle/mock-api";
import { Button } from "../../components/ui/button";
import { LexisLogo } from "../../components/ui/lexis-logo";
import { PuzzleService } from "../../services/PuzzleService";
import { useAuth } from "../../providers/AuthProvider";
import { createClient } from "../../utils/supabase/client";
import { PointsService } from "../../services/PointsService";
import { DailyChallengeService, type DailyChallenge } from "../../services/DailyChallengeService";
import { FriendsService } from "../../services/FriendsService";
import { fromUtcDateKey, getUtcWeekdayShort, toUtcDateKey } from "../../utils/utc-date";
import { PreferencesService } from "../../services/PreferencesService";
import { SoundService } from "../../services/SoundService";

const supabase = createClient();
const puzzleService = new PuzzleService(supabase);
const friendsService = new FriendsService(supabase);
const preferencesService = new PreferencesService(supabase);
const soundService = new SoundService();

function deriveKeyboardState(puzzle: MockPuzzle): KeyboardState {
  const state: KeyboardState = {};
  puzzle.rows.forEach((row) => {
    row.letters.forEach((cell) => {
      const key = cell.letter.toLowerCase();
      if (!key) return;
      const current = state[key];
      if (cell.state === "correct") {
        state[key] = "correct";
      } else if (cell.state === "present" && current !== "correct") {
        state[key] = "present";
      } else if (!current) {
        state[key] = "absent";
      }
    });
  });
  return state;
}

function generateShareText(puzzle: MockPuzzle, _dailyNumber: number, mode: string, hardMode: boolean): string {
  const attemptsStr = puzzle.status === "won" ? String(puzzle.attempts) : "X";
  const suffix = hardMode ? "*" : "";
  let header: string;
  if (mode === "daily") {
    const dateLabel = puzzle.id.startsWith("daily-") ? puzzle.id.replace("daily-", "") : getDailyLabel();
    header = `Lexis Daily ${dateLabel} ${attemptsStr}/6${suffix}`;
  } else if (mode === "speed") {
    header = `Lexis ⚡ ${attemptsStr}/6${suffix}`;
  } else {
    header = `Lexis ∞ ${attemptsStr}/6${suffix}`;
  }

  const grid = puzzle.rows.map((row) =>
    row.letters.map((cell) => {
      if (cell.state === "correct") return "🟩";
      if (cell.state === "present") return "🟨";
      return "⬛";
    }).join("")
  ).join("\n");

  return `${header}\n\n${grid}`;
}

function getCountdownToMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDailyLabel(): string {
  const d = new Date();
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${getUtcWeekdayShort(d)}`;
}

function formatDateKey(d: Date): string {
  return toUtcDateKey(d);
}

interface DailyHistoryEntry {
  date: string;
  solved: boolean;
}

const CALENDAR_EPOCH = new Date("2026-01-01");
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function DailyCalendar({ onSelectDate, history }: { onSelectDate: (date: Date) => void; history: DailyHistoryEntry[] }) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const today = useMemo(() => {
    return fromUtcDateKey(toUtcDateKey(new Date()));
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = useMemo(() => {
    const c: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) c.push(null);
    for (let d = 1; d <= daysInMonth; d++) c.push(d);
    return c;
  }, [firstDay, daysInMonth]);

  function getStatus(day: number): "solved" | "available" | "none" {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    if (date > today || date < CALENDAR_EPOCH) return "none";
    const key = formatDateKey(date);
    const entry = history.find((h) => h.date === key);
    if (entry?.solved) return "solved";
    return "available";
  }

  const canGoNext = new Date(year, month + 1, 1) <= today;

  return (
    <div className="mx-auto max-w-[320px] bg-[#111] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="text-zinc-400 hover:text-white p-1 transition-colors"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="text-white text-xs font-display font-bold tracking-wider">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => canGoNext && setViewDate(new Date(year, month + 1, 1))}
          className={`p-1 transition-colors ${canGoNext ? "text-zinc-400 hover:text-white" : "text-zinc-700 cursor-default"}`}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Su", "M", "T", "W", "Th", "F", "S"].map((d) => (
          <div key={d} className="text-[10px] text-zinc-600 font-mono py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const status = getStatus(day);
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const clickable = status !== "none";
          return (
            <button
              key={day}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(new Date(year, month, day))}
              className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors ${
                isToday ? "ring-1 ring-white/30" : ""
              } ${clickable ? "hover:bg-white/10 cursor-pointer" : "cursor-default opacity-40"}`}
            >
              <span className={`font-mono ${isToday ? "text-white font-bold" : "text-zinc-400"}`}>{day}</span>
              {status === "solved" && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#538d4e]" />}
              {status === "available" && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-zinc-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

type GameMode = "daily" | "infinite" | "speed" | "challenge";

function GuessDistribution({ history }: { history: { attempts: number; won: boolean }[] }) {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.filter((r) => r.won).forEach((r) => {
    if (r.attempts >= 1 && r.attempts <= 6) dist[r.attempts]++;
  });
  const maxCount = Math.max(...Object.values(dist), 1);

  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="flex items-center gap-1">
          <span className="text-xs text-white w-3 text-right font-mono">{n}</span>
          <div className="flex-1">
            <div
              className="h-5 bg-[#538d4e] rounded-sm flex items-center justify-end px-1.5 min-w-[20px]"
              style={{ width: `${Math.max((dist[n] / maxCount) * 100, dist[n] > 0 ? 8 : 2)}%` }}
            >
              <span className="text-[11px] text-white font-bold font-mono">{dist[n]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-[#0a0a0a] rounded-2xl p-6 max-w-sm w-full border border-white/[0.08] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function StatsModal({ onClose, onShare, puzzle, mode, dailyNumber, hardMode }: {
  onClose: () => void;
  onShare: () => void;
  puzzle: MockPuzzle;
  mode: GameMode;
  dailyNumber: number;
  hardMode: boolean;
}) {
  const [stats, setStats] = useState({ played: 0, won: 0, winRate: 0, streak: 0, maxStreak: 0, averageAttempts: 0 });
  const [history, setHistory] = useState<{ attempts: number; won: boolean }[]>([]);
  const [countdown, setCountdown] = useState(getCountdownToMidnight());
  const { user: statsUser } = useAuth();

  useEffect(() => {
    if (!statsUser) return;
    puzzleService.getStats(statsUser.id).then(setStats).catch(() => {});
    puzzleService.getHistory(statsUser.id).then((h) => setHistory(h.map((r) => ({ attempts: r.attempts, won: r.won })))).catch(() => {});
  }, [statsUser]);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdownToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  const gameOver = puzzle.status !== "playing";

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-center uppercase tracking-widest text-xs font-display font-bold mb-5">Statistics</h2>

      <div className="grid grid-cols-4 gap-2 text-center mb-5">
        <div>
          <div className="text-2xl text-white font-display font-bold">{stats.played}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Played</div>
        </div>
        <div>
          <div className="text-2xl text-white font-display font-bold">{stats.winRate}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Win %</div>
        </div>
        <div>
          <div className="text-2xl text-white font-display font-bold">{stats.streak}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Streak</div>
        </div>
        <div>
          <div className="text-2xl text-white font-display font-bold">{stats.maxStreak}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Best</div>
        </div>
      </div>

      <h3 className="text-white text-center uppercase tracking-widest text-[10px] font-display font-bold mb-2">Guess Distribution</h3>
      <GuessDistribution history={history} />

      {gameOver && (
        <div className="mt-5 flex items-center border-t border-white/[0.06] pt-4">
          {mode === "daily" && (
            <div className="flex-1 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Next Puzzle</div>
              <div className="text-xl text-white font-mono">{countdown}</div>
            </div>
          )}
          <div className={mode === "daily" ? "flex-1 border-l border-white/[0.06] pl-4" : "flex-1"}>
            <button
              onClick={onShare}
              className="w-full bg-[#538d4e] text-white font-bold text-sm py-3 rounded-full uppercase tracking-wider hover:brightness-110 transition-all font-body"
            >
              Share
            </button>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-center uppercase tracking-widest text-xs font-display font-bold mb-4">How to Play</h2>
      <div className="space-y-3 text-sm text-zinc-300 font-body">
        <p>Guess the word in 6 tries.</p>
        <p>Each guess must be a valid 5-letter word.</p>
        <p>The color of the tiles will change to show how close your guess was.</p>

        <div className="border-t border-white/[0.06] pt-3">
          <p className="font-bold text-white mb-2 font-display">Examples</p>

          <div className="flex gap-[5px] mb-1">
            {["W", "E", "A", "R", "Y"].map((l, i) => (
              <div key={i} className={`w-10 h-10 flex items-center justify-center font-bold text-lg uppercase ${i === 0 ? "bg-[#538d4e]" : "border-2 border-[#3a3a3c]"} text-white rounded-sm`}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-sm mb-3"><strong>W</strong> is in the word and in the correct spot.</p>

          <div className="flex gap-[5px] mb-1">
            {["P", "I", "L", "L", "S"].map((l, i) => (
              <div key={i} className={`w-10 h-10 flex items-center justify-center font-bold text-lg uppercase ${i === 1 ? "bg-[#b59f3b]" : "border-2 border-[#3a3a3c]"} text-white rounded-sm`}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-sm mb-3"><strong>I</strong> is in the word but in the wrong spot.</p>

          <div className="flex gap-[5px] mb-1">
            {["V", "A", "G", "U", "E"].map((l, i) => (
              <div key={i} className={`w-10 h-10 flex items-center justify-center font-bold text-lg uppercase ${i === 3 ? "bg-[#3a3a3c]" : "border-2 border-[#3a3a3c]"} text-white rounded-sm`}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-sm"><strong>U</strong> is not in the word in any spot.</p>
        </div>
      </div>
      <button className="mt-4 w-full py-2.5 rounded-full bg-[#538d4e] text-white text-sm font-bold uppercase tracking-wider hover:brightness-110 font-body" onClick={onClose}>
        Got it
      </button>
    </ModalOverlay>
  );
}

function SettingsModal({ onClose, hardMode, onToggleHardMode }: {
  onClose: () => void;
  hardMode: boolean;
  onToggleHardMode: () => void;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white text-center uppercase tracking-widest text-xs font-display font-bold mb-4">Settings</h2>

      <div className="flex items-center justify-between py-4 border-b border-white/[0.06]">
        <div>
          <div className="text-white text-sm font-body">Hard Mode</div>
          <div className="text-zinc-500 text-xs font-body">Any revealed hints must be used in subsequent guesses</div>
        </div>
        <button
          onClick={onToggleHardMode}
          className={`w-12 h-6 rounded-full transition-colors relative ${hardMode ? "bg-[#538d4e]" : "bg-[#3a3a3c]"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${hardMode ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="flex items-center justify-between py-4">
        <div>
          <div className="text-white text-sm font-body">Feedback</div>
          <div className="text-zinc-500 text-xs font-mono">lexis.app</div>
        </div>
        <Link href="/profile" className="text-[#6abf5e] text-sm font-body">Profile →</Link>
      </div>
    </ModalOverlay>
  );
}

function rebuildRows(guesses: string[], solution: string): MockPuzzle["rows"] {
  return guesses.map((guess, i) => ({
    id: `guess-${i + 1}`,
    letters: guess.split("").map((letter, j) => {
      const target = solution.split("");
      let state: "correct" | "present" | "absent" = "absent";
      if (target[j] === letter) state = "correct";
      else if (target.includes(letter)) state = "present";
      return { letter, state };
    }),
  }));
}

export default function PlayPage() {
  const searchParams = useSearchParams();
  const activeChallengeId = searchParams.get("challenge");
  const [mode, setMode] = useState<GameMode>("daily");
  const [puzzle, setPuzzle] = useState<MockPuzzle>(() => createDailyPuzzle());
  const [currentGuess, setCurrentGuess] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState<number | undefined>();
  const [bounceRow, setBounceRow] = useState<number | undefined>();
  const [poppingCol, setPoppingCol] = useState<number | undefined>();
  const [hardMode, setHardMode] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const puzzleStarted = useRef(false);
  const { user } = useAuth();
  const [speedChallenge, setSpeedChallenge] = useState<DailyChallenge | null>(null);
  const [speedTimer, setSpeedTimer] = useState<number>(0);
  const [speedTimerActive, setSpeedTimerActive] = useState(false);
  const speedStartTime = useRef<number>(0);
  const speedTimedOut = useRef(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<DailyHistoryEntry[]>([]);
  const dailyStateLoaded = useRef(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(0.5);

  useEffect(() => {
    const challengeId = searchParams.get("challenge");
    if (!challengeId) return;
    if (!user) return;

    friendsService.getChallengeById(challengeId).then((challenge) => {
      if (!challenge) return;
      setMode("challenge");
      const seededPuzzle: MockPuzzle = {
        id: challenge.puzzle_id ?? `challenge-${challenge.id}`,
        solution: challenge.puzzle_word,
        attempts: 0,
        rows: [],
        status: "playing",
        invalidGuess: false,
      };
      puzzleStarted.current = false;
      setPuzzle(seededPuzzle);
    }).catch(() => {});
  }, [searchParams, user]);

  useEffect(() => {
    if (!user) return;
    if (dailyStateLoaded.current) return;
    dailyStateLoaded.current = true;
    const dateKey = formatDateKey(new Date());
    Promise.all([
      puzzleService.getDailyState(user.id, dateKey),
      puzzleService.getDailyHistory(user.id),
    ]).then(([saved, history]) => {
      setDailyHistory(history);
      if (saved && saved.guesses.length > 0) {
        const base = createDailyPuzzle();
        const rows = rebuildRows(saved.guesses, base.solution);
        setPuzzle({ ...base, rows, attempts: saved.attempts, status: saved.status as MockPuzzle["status"] });
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    preferencesService.get(user.id).then((prefs) => {
      setSfxEnabled(prefs.sfx_enabled);
      setSfxVolume(prefs.sfx_volume);
      soundService.setEnabled(prefs.sfx_enabled);
      soundService.setVolume(prefs.sfx_volume);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    soundService.setEnabled(sfxEnabled);
    soundService.setVolume(sfxVolume);
  }, [sfxEnabled, sfxVolume]);

  useEffect(() => {
    if (!puzzleStarted.current) {
      puzzleService.startPuzzle(puzzle.id, puzzle.solution);
      puzzleStarted.current = true;
    }
    if (puzzle.status !== "playing" && puzzle.rows.length > 0) {
      const t = setTimeout(() => setShowStats(true), 500);
      return () => clearTimeout(t);
    }
  }, [puzzle.id, puzzle.solution, puzzle.status, puzzle.rows.length]);

  useEffect(() => {
    if (!speedTimerActive) return;
    speedTimedOut.current = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - speedStartTime.current;
      setSpeedTimer(elapsed);
      if (speedChallenge && elapsed >= speedChallenge.time_limit_seconds * 1000 && !speedTimedOut.current) {
        speedTimedOut.current = true;
        setSpeedTimerActive(false);
        setPuzzle((prev) => {
          if (prev.status !== "playing") return prev;
          return { ...prev, status: "lost" };
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [speedTimerActive, speedChallenge]);

  const dailyNumber = puzzleService.getDailyPuzzleNumber();

  const toast = useCallback((msg: string, duration = 1500) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setShowToast(msg);
    toastTimeout.current = setTimeout(() => setShowToast(null), duration);
  }, []);

  useEffect(() => {
    if (!speedTimedOut.current) return;
    if (puzzle.status !== "lost") return;
    speedTimedOut.current = false;
    toast("Time's up! " + puzzle.solution.toUpperCase(), 4000);
    if (user) {
      puzzleService.finishPuzzle(user.id, false, "speed").catch(() => {});
    }
    if (speedChallenge && user) {
      const challengeService = new DailyChallengeService(supabase);
      challengeService.submitResult(user.id, speedChallenge.id, puzzle.attempts, Date.now() - speedStartTime.current, false).catch(() => {});
    }
    setTimeout(() => setShowStats(true), 3000);
  }, [puzzle.status, toast, speedChallenge, user]);

  const keyboardState = useMemo(() => deriveKeyboardState(puzzle), [puzzle]);

  const handleKey = useCallback(
    (key: string) => {
      if (puzzle.status !== "playing") return;
      if (revealingRow !== undefined) return;

      if (key === "enter") {
        if (currentGuess.length !== 5) {
          toast("Not enough letters");
          setShakeRow(true);
          setTimeout(() => setShakeRow(false), 600);
          return;
        }

        if (hardMode && puzzle.rows.length > 0) {
          const lastRow = puzzle.rows[puzzle.rows.length - 1];
          for (let i = 0; i < 5; i++) {
            if (lastRow.letters[i].state === "correct" && currentGuess[i] !== lastRow.letters[i].letter) {
              toast(`Position ${i + 1} must be ${lastRow.letters[i].letter.toUpperCase()}`);
              setShakeRow(true);
              setTimeout(() => setShakeRow(false), 600);
              return;
            }
          }
          for (const cell of lastRow.letters) {
            if (cell.state === "present" && !currentGuess.includes(cell.letter)) {
              toast(`Guess must contain ${cell.letter.toUpperCase()}`);
              setShakeRow(true);
              setTimeout(() => setShakeRow(false), 600);
              return;
            }
          }
        }

        const next = submitMockGuess(puzzle, currentGuess);
        if (next.invalidGuess) {
          toast("Not in word list");
          setShakeRow(true);
          setTimeout(() => setShakeRow(false), 600);
          return;
        }

        puzzleService.recordGuess(currentGuess);
        setCurrentGuess("");

        const rowIdx = puzzle.rows.length;
        setRevealingRow(rowIdx);
        setPuzzle(next);

        const dailyDateStr = mode === "daily"
          ? puzzle.id.replace("daily-", "")
          : null;

        if (user && mode === "daily" && dailyDateStr) {
          puzzleService.saveDailyState(
            user.id, puzzle.id, dailyDateStr,
            [...puzzleService["guesses"], currentGuess],
            next.attempts, next.status as "playing" | "won" | "lost",
            puzzle.solution, "daily"
          ).catch(() => {});
        }

        setTimeout(() => {
          setRevealingRow(undefined);
          soundService.play("tile_reveal");
          if (next.status === "won") {
            setBounceRow(rowIdx);
            const messages = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
            toast(messages[Math.min(next.attempts - 1, 5)], 2000);
            soundService.play("victory");
            setSpeedTimerActive(false);

            if (user) {
              puzzleService.finishPuzzle(user.id, true, mode).catch(() => {});
              const pointsService = new PointsService(supabase);
              const points = PointsService.getPointsForGuesses(next.attempts);
              pointsService.awardPoints(user.id, points, "puzzle_win", { mode, attempts: next.attempts }).catch(() => {});

              if (mode === "challenge" && activeChallengeId) {
                friendsService.submitChallengeResult(
                  activeChallengeId,
                  user.id,
                  next.attempts,
                  Date.now() - speedStartTime.current
                ).catch(() => {});
              }

              if (mode === "speed" && speedChallenge) {
                const challengeService = new DailyChallengeService(supabase);
                challengeService.submitResult(user.id, speedChallenge.id, next.attempts, Date.now() - speedStartTime.current, true).catch(() => {});
              }
            }

            setTimeout(() => {
              setBounceRow(undefined);
              setShowStats(true);
            }, 2000);
          } else if (next.status === "lost") {
            toast(next.solution.toUpperCase(), 4000);
            soundService.play("defeat");
            setSpeedTimerActive(false);

            if (user) {
              puzzleService.finishPuzzle(user.id, false, mode).catch(() => {});

              if (mode === "challenge" && activeChallengeId) {
                friendsService.submitChallengeResult(
                  activeChallengeId,
                  user.id,
                  next.attempts,
                  Date.now() - speedStartTime.current
                ).catch(() => {});
              }

              if (mode === "speed" && speedChallenge) {
                const challengeService = new DailyChallengeService(supabase);
                challengeService.submitResult(user.id, speedChallenge.id, next.attempts, Date.now() - speedStartTime.current, false).catch(() => {});
              }
            }

            setTimeout(() => setShowStats(true), 3000);
          }
        }, 5 * 300 + 250);

        return;
      }

      if (key === "backspace") {
        setCurrentGuess((v) => v.slice(0, -1));
        return;
      }

      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        const nextLen = currentGuess.length;
        setCurrentGuess((v) => v + key);
        soundService.play("key_press");
        setPoppingCol(nextLen);
        setTimeout(() => setPoppingCol(undefined), 120);
      }
    },
    [currentGuess, puzzle, toast, hardMode, revealingRow, mode, speedChallenge, user, activeChallengeId]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (showHelp || showSettings) return;
      const key = event.key.toLowerCase();
      if (key === "enter") { event.preventDefault(); handleKey("enter"); }
      else if (key === "backspace") { event.preventDefault(); handleKey("backspace"); }
      else if (/^[a-z]$/.test(key)) { event.preventDefault(); handleKey(key); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKey, showHelp, showSettings]);

  const composedRows = useMemo(() => {
    const rows = [...puzzle.rows];
    if (puzzle.status === "playing") {
      rows.push({
        id: "current",
        letters: Array.from({ length: 5 }, (_, i) => ({
          letter: currentGuess[i] ?? "",
          state: "empty" as const
        }))
      });
    }
    while (rows.length < 6) {
      rows.push({
        id: `empty-${rows.length}`,
        letters: Array.from({ length: 5 }, () => ({ letter: "", state: "empty" as const }))
      });
    }
    return rows;
  }, [puzzle.rows, puzzle.status, currentGuess]);

  const speedTimeRemaining = useMemo(() => {
    if (mode !== "speed" || !speedChallenge) return null;
    const totalMs = speedChallenge.time_limit_seconds * 1000;
    const remaining = Math.max(0, totalMs - speedTimer);
    const progress = totalMs > 0 ? remaining / totalMs : 0;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const tenths = Math.floor((remaining % 1000) / 100);
    return {
      display: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`,
      progress,
      critical: remaining < 10000,
    };
  }, [mode, speedChallenge, speedTimer]);

  async function startNewPuzzle(newMode: GameMode) {
    setShowCalendar(false);
    setSpeedTimerActive(false);
    setSpeedChallenge(null);

    if (newMode === "speed") {
      const supabase = createClient();
      const challengeService = new DailyChallengeService(supabase);
      try {
        const challenge = await challengeService.getTodayChallenge();
        setSpeedChallenge(challenge);
        if (challenge) {
          const next: MockPuzzle = {
            id: `speed-${challenge.id}`,
            solution: challenge.puzzle_word,
            attempts: 0,
            rows: [],
            status: "playing",
            invalidGuess: false,
          };
          setMode("speed");
          setPuzzle(next);
          setCurrentGuess("");
          setRevealingRow(undefined);
          setBounceRow(undefined);
          puzzleStarted.current = false;
          speedStartTime.current = Date.now();
          setSpeedTimer(0);
          setSpeedTimerActive(true);
        } else {
          toast("Speed challenge unavailable");
        }
      } catch {
        toast("Could not load speed challenge");
        const fallback = createMockPuzzle();
        setMode("speed");
        setPuzzle(fallback);
        setCurrentGuess("");
        puzzleStarted.current = false;
      }
      return;
    }

    if (newMode === "daily") {
      const p = createDailyPuzzle();
      setMode("daily");
      setCurrentGuess("");
      setRevealingRow(undefined);
      setBounceRow(undefined);
      puzzleStarted.current = false;
      if (user) {
        const dateKey = formatDateKey(new Date());
        puzzleService.getDailyState(user.id, dateKey).then((saved) => {
          if (saved && saved.guesses.length > 0) {
            const rows = rebuildRows(saved.guesses, p.solution);
            setPuzzle({ ...p, rows, attempts: saved.attempts, status: saved.status as MockPuzzle["status"] });
          } else {
            setPuzzle(p);
          }
        }).catch(() => setPuzzle(p));
      } else {
        setPuzzle(p);
      }
      return;
    }

    const next = createMockPuzzle();
    setMode("infinite");
    setPuzzle(next);
    setCurrentGuess("");
    setRevealingRow(undefined);
    setBounceRow(undefined);
    puzzleStarted.current = false;
  }

  function handleDailyClick() {
    if (mode === "daily") {
      setShowCalendar((prev) => !prev);
    } else {
      startNewPuzzle("daily");
      setShowCalendar(true);
    }
  }

  function handleModeSwitch(newMode: GameMode) {
    setShowCalendar(false);
    startNewPuzzle(newMode);
  }

  function handleCalendarSelect(date: Date) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sel = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (sel.getTime() === todayStart.getTime()) {
      startNewPuzzle("daily");
      setShowCalendar(false);
      return;
    }
    setSpeedTimerActive(false);
    setSpeedChallenge(null);
    const p = createDailyPuzzleForDate(date);
    const dateKey = formatDateKey(date);
    puzzleStarted.current = false;
    if (user) {
      puzzleService.getDailyState(user.id, dateKey).then((saved) => {
        if (saved && saved.guesses.length > 0) {
          const rows = rebuildRows(saved.guesses, p.solution);
          setPuzzle({ ...p, rows, attempts: saved.attempts, status: saved.status as MockPuzzle["status"] });
        } else {
          setPuzzle(p);
        }
      }).catch(() => setPuzzle(p));
    } else {
      setPuzzle(p);
    }
    setBounceRow(undefined);
    setShowCalendar(false);
  }

  function handleShare() {
    const text = generateShareText(puzzle, dailyNumber, mode, hardMode);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!", 2000));
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase();

  return (
    <div className="h-[100dvh] flex flex-col bg-[#060606] relative noise">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 h-[48px] sm:h-[52px] border-b border-white/[0.06] shrink-0 backdrop-blur-xl bg-[#060606]/80">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setShowHelp(true)}
            aria-label="Help"
          >
            <HelpIcon />
          </button>
        </div>

        <Link href="/" className="flex items-center gap-2">
          <LexisLogo size={22} />
          <span className="text-lg tracking-[0.2em] text-white font-display font-bold">LEXIS</span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setShowStats(true)}
            aria-label="Statistics"
          >
            <StatsIcon />
          </button>
          <button
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>
          <Link
            href={user ? "/profile" : "/login"}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            aria-label="Profile"
          >
            {userInitial ? (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/10 text-[11px] font-bold leading-none text-white">
                {userInitial}
              </span>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            )}
          </Link>
        </div>
      </header>

      {/* Toast */}
      {showToast && (
        <div className="absolute top-[60px] left-1/2 z-50 -translate-x-1/2 animate-toast">
          <div className="bg-white text-[#060606] text-sm font-bold px-5 py-3 rounded-full shadow-lg font-body">
            {showToast}
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="flex justify-center flex-wrap gap-2 px-3 sm:px-4 py-2 shrink-0">
        <button
          className={`text-xs px-3 sm:px-4 py-1.5 rounded-full transition-colors font-bold tracking-wider font-body ${mode === "daily" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          onClick={handleDailyClick}
        >
          DAILY {getDailyLabel()}
        </button>
        <button
          className={`text-xs px-3 sm:px-4 py-1.5 rounded-full transition-colors font-bold tracking-wider font-body ${mode === "infinite" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          onClick={() => handleModeSwitch("infinite")}
        >
          INFINITE
        </button>
        <button
          className={`relative text-xs px-3 sm:px-4 py-1.5 rounded-full transition-colors font-bold tracking-wider font-body ${
            mode === "speed"
              ? "bg-white text-black ring-2 ring-[#538d4e] ring-offset-1 ring-offset-[#060606]"
              : "text-zinc-500 hover:text-white"
          }`}
          onClick={() => handleModeSwitch("speed")}
        >
          {mode === "speed" && (
            <svg className="inline-block w-3 h-3 mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          SPEED ⚡
        </button>
      </div>

      {showCalendar && mode === "daily" && (
        <div className="px-4 py-2 shrink-0">
          <DailyCalendar onSelectDate={handleCalendarSelect} history={dailyHistory} />
        </div>
      )}

      {speedTimeRemaining && (
        <div className="flex justify-center px-4 py-1.5 shrink-0">
          <div className="max-w-[320px] w-full">
            {hideTimer ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-zinc-600 text-xs font-mono">Timer hidden</span>
                <button
                  onClick={() => setHideTimer(false)}
                  className="text-zinc-600 hover:text-white p-0.5 transition-colors"
                  aria-label="Show timer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      speedTimeRemaining.progress > 0.5
                        ? "bg-[#538d4e]"
                        : speedTimeRemaining.progress > 0.25
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${speedTimeRemaining.progress * 100}%` }}
                  />
                </div>
                <span className={`font-mono text-sm font-bold tabular-nums min-w-[72px] text-right ${
                  speedTimeRemaining.progress > 0.5
                    ? "text-[#538d4e]"
                    : speedTimeRemaining.progress > 0.25
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}>
                  {speedTimeRemaining.display}
                </span>
                <button
                  onClick={() => setHideTimer(true)}
                  className="text-zinc-500 hover:text-white p-0.5 transition-colors"
                  aria-label="Hide timer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden px-3 sm:px-4">
        <div className={shakeRow && puzzle.status === "playing" ? "animate-shake" : ""} style={{ touchAction: "manipulation" }}>
          <Board
            rows={composedRows}
            revealingRow={revealingRow}
            bounceRow={bounceRow}
            poppingIndex={poppingCol}
          />
        </div>
      </div>

      {/* Keyboard */}
      <div className="shrink-0 px-2 sm:px-3 pb-2 pt-1 mb-[calc(env(safe-area-inset-bottom)+64px)] md:mb-0">
        {puzzle.status !== "playing" ? (
          <div className="flex gap-2 max-w-[500px] mx-auto mb-2">
            <Button fullWidth size="lg" variant="secondary" onClick={() => startNewPuzzle("daily")}>
              Daily
            </Button>
            <Button fullWidth size="lg" variant="secondary" onClick={() => startNewPuzzle("speed")}>
              Speed ⚡
            </Button>
            <Button fullWidth size="lg" onClick={() => startNewPuzzle("infinite")}>
              Train
            </Button>
          </div>
        ) : null}
        <Keyboard state={keyboardState} onKey={handleKey} />
      </div>

      {/* Global bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-white/[0.06] bg-[#060606]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { href: "/play", label: "Play", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg> },
          { href: "/hints", label: "Training", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z" /></svg> },
          { href: "/challenges", label: "Challenges", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 7l4-4 4 4-4 4" /><path d="M7 13l-4 4 4 4 4-4" /></svg> },
          { href: "/leaderboard", label: "Leaderboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg> },
          { href: "/profile", label: "Profile", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg> },
        ].map((item) => {
          const isActive = item.href === "/play";
          const isProfile = item.href === "/profile";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] transition-colors ${
                isActive ? "text-white" : "text-zinc-500"
              }`}
            >
              {isActive && <span className="absolute top-0 h-1.5 w-1.5 rounded-full bg-[#538d4e]" />}
              {isProfile && userInitial ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold leading-none">
                  {userInitial}
                </span>
              ) : item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Modals */}
      {showStats && (
        <StatsModal
          onClose={() => setShowStats(false)}
          onShare={handleShare}
          puzzle={puzzle}
          mode={mode}
          dailyNumber={dailyNumber}
          hardMode={hardMode}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          hardMode={hardMode}
          onToggleHardMode={() => setHardMode((v) => !v)}
        />
      )}
    </div>
  );
}
