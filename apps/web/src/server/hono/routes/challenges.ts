import { Hono } from "hono";
import { verifyAuthHeader } from "../lib/auth";
import { deriveSeed, getUtcDateKey, newId, pickSolution } from "../lib/game";
import { challenges, metrics, sessions } from "../state";

export const challengesRoute = new Hono();

async function parseJsonBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

challengesRoute.post("/create", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const body = await parseJsonBody(c);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid JSON body" }, 400);
  const payload = body as Record<string, unknown>;
  const opponentId = String(payload.opponentId ?? "");
  if (!opponentId) return c.json({ error: "opponentId is required" }, 400);
  const rawTimeLimit = payload.timeLimitSeconds;
  const hasTimeLimit = typeof rawTimeLimit === "number" && Number.isFinite(rawTimeLimit);
  const timeLimitSeconds = hasTimeLimit ? Math.max(10, Math.min(600, Math.floor(rawTimeLimit))) : null;

  const challengeId = newId();
  const dateKey = getUtcDateKey();
  const seed = deriveSeed("challenge", dateKey, challengeId);
  const challenge = {
    id: challengeId,
    creatorId: auth.userId,
    opponentId,
    seed,
    puzzleId: `challenge-${challengeId.slice(0, 8)}`,
    solution: pickSolution(seed),
    timeLimitSeconds,
    status: "pending" as const,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    creatorResult: null,
    opponentResult: null,
    winnerId: null,
  };
  challenges.set(challengeId, challenge);
  return c.json(challenge);
});

challengesRoute.post("/submit", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const body = await parseJsonBody(c);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid JSON body" }, 400);
  const payload = body as Record<string, unknown>;
  const challengeId = String(payload.challengeId ?? "");
  const sessionId = String(payload.sessionId ?? "");
  if (!challengeId || !sessionId) return c.json({ error: "challengeId and sessionId are required" }, 400);

  const challenge = challenges.get(challengeId);
  if (!challenge) return c.json({ error: "Challenge not found" }, 404);
  if (Date.now() > challenge.expiresAt) {
    challenge.status = "expired";
    challenges.set(challenge.id, challenge);
    return c.json({ error: "Challenge expired" }, 409);
  }
  if (auth.userId !== challenge.creatorId && auth.userId !== challenge.opponentId) {
    metrics.anti_cheat_events += 1;
    return c.json({ error: "Forbidden" }, 403);
  }

  const session = sessions.get(sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.seed !== challenge.seed || session.status === "playing") {
    metrics.anti_cheat_events += 1;
    return c.json({ error: "Invalid challenge session" }, 403);
  }

  const elapsedMs = Math.max(0, (session.completedAt ?? Date.now()) - session.startedAt);
  const result = { attempts: session.guesses.length, elapsedMs, won: session.status === "won" };
  if (auth.userId === challenge.creatorId) challenge.creatorResult = result;
  if (auth.userId === challenge.opponentId) challenge.opponentResult = result;
  challenge.status = "active";

  if (challenge.creatorResult && challenge.opponentResult) {
    challenge.status = "completed";
    const a = challenge.creatorResult;
    const b = challenge.opponentResult;
    if (a.won && !b.won) challenge.winnerId = challenge.creatorId;
    else if (b.won && !a.won) challenge.winnerId = challenge.opponentId;
    else if (a.attempts < b.attempts) challenge.winnerId = challenge.creatorId;
    else if (b.attempts < a.attempts) challenge.winnerId = challenge.opponentId;
    else if (a.elapsedMs < b.elapsedMs) challenge.winnerId = challenge.creatorId;
    else if (b.elapsedMs < a.elapsedMs) challenge.winnerId = challenge.opponentId;
    else challenge.winnerId = null;
  }
  challenges.set(challenge.id, challenge);
  return c.json(challenge);
});

challengesRoute.get("/get", async (c) => {
  const auth = await verifyAuthHeader(c.req.header("authorization") ?? null);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.query("id");
  if (!id) return c.json({ error: "id is required" }, 400);
  const challenge = challenges.get(id);
  if (!challenge) return c.json({ error: "Challenge not found" }, 404);
  if (auth.userId !== challenge.creatorId && auth.userId !== challenge.opponentId) {
    metrics.anti_cheat_events += 1;
    return c.json({ error: "Forbidden" }, 403);
  }
  return c.json(challenge);
});
