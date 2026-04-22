import { Hono } from "hono";
import { verifyAuthHeader } from "../lib/auth";
import { computeScore, computeTier, deriveSeed, evaluateGuessAgainstSolution, getUtcDateKey, newId, pickSolution, signValue } from "../lib/game";
import { getServerConfig } from "../lib/config";
import { metrics, sessions } from "../state";
import type { GameMode } from "../types";

export const puzzlesRoute = new Hono();

puzzlesRoute.post("/session", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const raw = await c.req.json();
  const mode = (raw?.mode ?? "daily") as GameMode;
  const dateKey = mode === "daily" || mode === "daily_speed" ? String(raw?.dateKey ?? getUtcDateKey()) : null;
  const resolvedDateKey = dateKey ?? getUtcDateKey();
  const challengeId = typeof raw?.challengeId === "string" ? raw.challengeId : undefined;
  const seed = deriveSeed(mode, resolvedDateKey, challengeId);
  const puzzleId = `${mode}-${resolvedDateKey}-${seed.slice(0, 8)}`;
  const signature = signValue(getServerConfig().gameSeedSecret, `${auth.userId}:${puzzleId}:${seed}`);
  const session = {
    id: newId(),
    userId: auth.userId,
    mode,
    puzzleId,
    seed,
    signature,
    dateKey,
    solution: pickSolution(seed),
    guesses: [],
    status: "playing" as const,
    startedAt: Date.now(),
    completedAt: null,
    maxAttempts: 6,
    finalized: false,
  };
  sessions.set(session.id, session);
  return c.json({
    sessionId: session.id,
    puzzleId: session.puzzleId,
    seed: session.seed,
    signature: session.signature,
    mode: session.mode,
    dateKey: session.dateKey,
    maxAttempts: session.maxAttempts,
  });
});

puzzlesRoute.post("/guess", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const sessionId = String(body?.sessionId ?? "");
  const guess = String(body?.guess ?? "").toLowerCase().trim();
  if (!sessionId || guess.length !== 5 || !/^[a-z]{5}$/.test(guess)) {
    return c.json({ error: "Invalid guess payload" }, 400);
  }
  const session = sessions.get(sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.userId !== auth.userId) return c.json({ error: "Forbidden" }, 403);
  if (session.status !== "playing") return c.json({ error: "Session already complete" }, 409);

  const letters = evaluateGuessAgainstSolution(guess, session.solution);
  session.guesses = [...session.guesses, guess];
  const attempts = session.guesses.length;
  const isWin = letters.every((letter) => letter.result === "correct");
  session.status = isWin ? "won" : attempts >= session.maxAttempts ? "lost" : "playing";
  if (session.status !== "playing") session.completedAt = Date.now();
  sessions.set(session.id, session);

  return c.json({
    sessionId: session.id,
    puzzleId: session.puzzleId,
    letters,
    status: session.status,
    attempts,
    isWin: session.status === "won",
  });
});

puzzlesRoute.post("/finalize", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const sessionId = String(body?.sessionId ?? "");
  const signature = String(body?.signature ?? "");
  const session = sessions.get(sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.userId !== auth.userId) return c.json({ error: "Forbidden" }, 403);
  if (session.finalized) return c.json({ score: 0, alreadyFinalized: true });
  if (session.status === "playing") return c.json({ error: "Session still in progress" }, 409);
  if (signature !== session.signature) {
    metrics.anti_cheat_events += 1;
    return c.json({ error: "Invalid signature" }, 403);
  }

  const elapsedMs = Math.max(0, (session.completedAt ?? Date.now()) - session.startedAt);
  const score = computeScore({
    attempts: session.guesses.length,
    elapsedMs,
    won: session.status === "won",
    streakBonus: Number(body?.streakBonus ?? 0),
    difficultyMultiplier: Number(body?.difficultyMultiplier ?? 1),
  });
  session.finalized = true;
  sessions.set(session.id, session);

  return c.json({
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    attempts: session.guesses.length,
    elapsedMs,
    score,
    ratingDelta: session.mode === "challenge" || session.mode === "speed" ? (session.status === "won" ? 16 : -8) : 0,
    tierHint: computeTier(1200 + (session.status === "won" ? 16 : -8)),
  });
});
