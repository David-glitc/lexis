import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyAuthHeader } from "./supabase.ts";
import webpush from "npm:web-push@3.6.7";

type LetterResult = "correct" | "present" | "absent";
type GameMode = "daily" | "infinite" | "challenge" | "daily_speed" | "speed";
type SessionStatus = "playing" | "won" | "lost" | "expired";
type ChallengeStatus = "pending" | "active" | "completed" | "expired";

interface EvaluatedLetter {
  letter: string;
  result: LetterResult;
}

interface PuzzleSession {
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

interface ChallengeRecord {
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

interface RateState {
  requests: number[];
}

const SOLUTION_WORDS = [
  "angle", "brave", "crane", "doubt", "eager", "fable", "glint", "honey", "index", "jolly",
  "kneel", "lunar", "mango", "noble", "ocean", "pride", "quick", "raven", "sugar", "trust",
  "urban", "vigor", "waltz", "xenon", "yacht", "zesty", "adore", "blend", "charm", "drift",
  "elbow", "flair", "grace", "heart", "ivory", "joker", "karma", "lemon", "merit", "nylon",
  "orbit", "piano", "quilt", "robot", "smile", "tiger", "ultra", "vivid", "whale", "yield",
];

class Logger {
  private json(level: string, message: string, data?: Record<string, unknown>) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (data) entry.data = data;
    console.log(JSON.stringify(entry));
  }

  info(message: string, data?: Record<string, unknown>) {
    this.json("info", message, data);
  }
  error(message: string, data?: Record<string, unknown>) {
    this.json("error", message, data);
  }
  request(method: string, path: string, status: number, duration_ms: number, extra?: Record<string, unknown>) {
    this.json("info", `${method} ${path} ${status}`, {
      method,
      path,
      status,
      duration_ms,
      ...extra,
    });
  }
}

const logger = new Logger();
const SERVER_START = Date.now();
const metrics = {
  total_requests: 0,
  total_errors: 0,
  rate_limited: 0,
  anti_cheat_events: 0,
  push_sent: 0,
  push_failed: 0,
  routes: {} as Record<string, { count: number; total_duration_ms: number }>,
};

function recordMetric(path: string, duration_ms: number, isError: boolean) {
  metrics.total_requests++;
  if (isError) metrics.total_errors++;
  if (!metrics.routes[path]) metrics.routes[path] = { count: 0, total_duration_ms: 0 };
  metrics.routes[path].count++;
  metrics.routes[path].total_duration_ms += duration_ms;
}

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "access-control-max-age": "86400",
  };
}
function jsonHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "content-type": "application/json", ...corsHeaders(), ...extra };
}
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}
function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

const SESSION_KEY_PREFIX = ["v2", "session"] as const;
const CHALLENGE_KEY_PREFIX = ["v2", "challenge"] as const;
const RATE_KEY_PREFIX = ["v2", "rate"] as const;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function signValue(value: string): Promise<string> {
  const secret = Deno.env.get("GAME_SEED_SECRET") ?? "lexis-dev-secret";
  return sha256Hex(`${secret}:${value}`);
}
async function deriveSeed(mode: GameMode, dateKey: string, challengeId?: string): Promise<string> {
  const raw = challengeId ? `lexis:${mode}:${dateKey}:${challengeId}` : `lexis:${mode}:${dateKey}`;
  return sha256Hex(raw);
}
function pickSolution(seed: string): string {
  const idx = parseInt(seed.slice(0, 8), 16) % SOLUTION_WORDS.length;
  return SOLUTION_WORDS[Math.abs(idx)];
}
function evaluateGuessAgainstSolution(guess: string, solution: string): EvaluatedLetter[] {
  const guessLetters = guess.toLowerCase().split("");
  const solutionLetters = solution.toLowerCase().split("");
  return guessLetters.map((letter, index) => {
    let result: LetterResult = "absent";
    if (solutionLetters[index] === letter) result = "correct";
    else if (solutionLetters.includes(letter)) result = "present";
    return { letter, result };
  });
}
function computeTier(elo: number): string {
  if (elo >= 2000) return "grandmaster";
  if (elo >= 1750) return "diamond";
  if (elo >= 1550) return "platinum";
  if (elo >= 1350) return "gold";
  if (elo >= 1200) return "silver";
  return "bronze";
}
function computeScore(input: { attempts: number; elapsedMs: number; won: boolean; streakBonus?: number; difficultyMultiplier?: number }): number {
  const base = input.won ? 120 : 15;
  const attemptPenalty = Math.max(0, input.attempts - 1) * 10;
  const timePenalty = Math.floor(input.elapsedMs / 3000);
  const scaled = Math.round((base + (input.streakBonus ?? 0) - attemptPenalty - timePenalty) * (input.difficultyMultiplier ?? 1));
  return Math.max(0, scaled);
}
async function checkRateLimit(kv: Deno.Kv, userId: string): Promise<boolean> {
  const now = Date.now();
  const key = [...RATE_KEY_PREFIX, userId];
  const existing = await kv.get<RateState>(key);
  const requests = (existing.value?.requests ?? []).filter((ts) => now - ts <= RATE_LIMIT_WINDOW_MS);
  if (requests.length >= RATE_LIMIT_MAX) return false;
  requests.push(now);
  await kv.set(key, { requests });
  return true;
}
async function logAntiCheat(kv: Deno.Kv, payload: Record<string, unknown>) {
  metrics.anti_cheat_events++;
  await kv.set(["v2", "anti_cheat", crypto.randomUUID()], { ...payload, created_at: new Date().toISOString() });
}

type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@lexisword.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function fetchPushSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) return [];
  return (await response.json()) as PushSubscriptionRow[];
}

async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).catch(() => {});
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string }): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const subscriptions = await fetchPushSubscriptions(userId);
  if (!subscriptions.length) return;
  const body = JSON.stringify(payload);
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        } as any,
        body
      );
      metrics.push_sent++;
    } catch (error: any) {
      metrics.push_failed++;
      const statusCode = Number(error?.statusCode ?? 0);
      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscription(sub.endpoint);
      }
    }
  }
}

async function handleCreateSession(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) return errorResponse("Unauthorized", 401);
  const kv = await Deno.openKv();
  if (!(await checkRateLimit(kv, auth.userId))) {
    metrics.rate_limited++;
    return errorResponse("Rate limit exceeded", 429);
  }
  const raw = await req.json();
  const mode = (raw?.mode ?? "daily") as GameMode;
  const dateKey = mode === "daily" || mode === "daily_speed" ? String(raw?.dateKey ?? getUtcDateKey()) : null;
  const resolvedDateKey = dateKey ?? getUtcDateKey();
  const challengeId = typeof raw?.challengeId === "string" ? raw.challengeId : undefined;
  const seed = await deriveSeed(mode, resolvedDateKey, challengeId);
  const puzzleId = `${mode}-${resolvedDateKey}-${seed.slice(0, 8)}`;
  const signature = await signValue(`${auth.userId}:${puzzleId}:${seed}`);
  const session: PuzzleSession = {
    id: crypto.randomUUID(),
    userId: auth.userId,
    mode,
    puzzleId,
    seed,
    signature,
    dateKey,
    solution: pickSolution(seed),
    guesses: [],
    status: "playing",
    startedAt: Date.now(),
    completedAt: null,
    maxAttempts: 6,
    finalized: false,
  };
  await kv.set([...SESSION_KEY_PREFIX, session.id], session);
  return jsonResponse({ sessionId: session.id, puzzleId: session.puzzleId, seed: session.seed, signature: session.signature, mode: session.mode, dateKey: session.dateKey, maxAttempts: session.maxAttempts });
}

async function handlePostGuess(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) return errorResponse("Unauthorized", 401);
  const kv = await Deno.openKv();
  if (!(await checkRateLimit(kv, auth.userId))) {
    metrics.rate_limited++;
    return errorResponse("Rate limit exceeded", 429);
  }
  const body = await req.json();
  const sessionId = String(body?.sessionId ?? "");
  const guess = String(body?.guess ?? "").toLowerCase().trim();
  if (!sessionId || guess.length !== 5 || !/^[a-z]{5}$/.test(guess)) return errorResponse("Invalid guess payload", 400);
  const sessionEntry = await kv.get<PuzzleSession>([...SESSION_KEY_PREFIX, sessionId]);
  const session = sessionEntry.value;
  if (!session) return errorResponse("Session not found", 404);
  if (session.userId !== auth.userId) {
    await logAntiCheat(kv, { type: "session_owner_mismatch", userId: auth.userId, sessionId });
    return errorResponse("Forbidden", 403);
  }
  if (session.status !== "playing") return errorResponse("Session already complete", 409);
  const letters = evaluateGuessAgainstSolution(guess, session.solution);
  const isWin = letters.every((letter) => letter.result === "correct");
  session.guesses = [...session.guesses, guess];
  const attempts = session.guesses.length;
  session.status = isWin ? "won" : attempts >= session.maxAttempts ? "lost" : "playing";
  if (session.status !== "playing") session.completedAt = Date.now();
  await kv.set([...SESSION_KEY_PREFIX, session.id], session);
  return jsonResponse({ sessionId: session.id, puzzleId: session.puzzleId, letters, status: session.status, attempts, isWin: session.status === "won" });
}

async function handleFinalize(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) return errorResponse("Unauthorized", 401);
  const kv = await Deno.openKv();
  const body = await req.json();
  const sessionId = String(body?.sessionId ?? "");
  const signature = String(body?.signature ?? "");
  const entry = await kv.get<PuzzleSession>([...SESSION_KEY_PREFIX, sessionId]);
  const session = entry.value;
  if (!session) return errorResponse("Session not found", 404);
  if (session.userId !== auth.userId) return errorResponse("Forbidden", 403);
  if (session.finalized) return jsonResponse({ score: 0, alreadyFinalized: true });
  if (session.status === "playing") return errorResponse("Session still in progress", 409);
  if (signature !== session.signature) {
    await logAntiCheat(kv, { type: "bad_signature", userId: auth.userId, sessionId });
    return errorResponse("Invalid signature", 403);
  }
  const elapsedMs = Math.max(0, (session.completedAt ?? Date.now()) - session.startedAt);
  const score = computeScore({ attempts: session.guesses.length, elapsedMs, won: session.status === "won", streakBonus: Number(body?.streakBonus ?? 0), difficultyMultiplier: Number(body?.difficultyMultiplier ?? 1) });
  session.finalized = true;
  await kv.set([...SESSION_KEY_PREFIX, session.id], session);
  return jsonResponse({ sessionId: session.id, mode: session.mode, status: session.status, attempts: session.guesses.length, elapsedMs, score, ratingDelta: session.mode === "challenge" || session.mode === "speed" ? (session.status === "won" ? 16 : -8) : 0, tierHint: computeTier(1200 + (session.status === "won" ? 16 : -8)) });
}

async function handleCreateChallenge(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) return errorResponse("Unauthorized", 401);
  const kv = await Deno.openKv();
  const body = await req.json();
  const opponentId = String(body?.opponentId ?? "");
  if (!opponentId) return errorResponse("opponentId is required", 400);
  const challengeId = crypto.randomUUID();
  const dateKey = getUtcDateKey();
  const seed = await deriveSeed("challenge", dateKey, challengeId);
  const challenge: ChallengeRecord = {
    id: challengeId,
    creatorId: auth.userId,
    opponentId,
    seed,
    puzzleId: `challenge-${challengeId.slice(0, 8)}`,
    solution: pickSolution(seed),
    timeLimitSeconds: typeof body?.timeLimitSeconds === "number" ? body.timeLimitSeconds : null,
    status: "pending",
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    creatorResult: null,
    opponentResult: null,
    winnerId: null,
  };
  await kv.set([...CHALLENGE_KEY_PREFIX, challengeId], challenge);
  await sendPushToUser(opponentId, {
    title: "New Lexis Challenge",
    body: "You have a new challenge waiting. Tap to play.",
    url: "/challenges",
  });
  return jsonResponse(challenge);
}

async function handleSubmitChallenge(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) return errorResponse("Unauthorized", 401);
  const kv = await Deno.openKv();
  const body = await req.json();
  const challengeId = String(body?.challengeId ?? "");
  const sessionId = String(body?.sessionId ?? "");
  if (!challengeId || !sessionId) return errorResponse("challengeId and sessionId are required", 400);
  const challengeEntry = await kv.get<ChallengeRecord>([...CHALLENGE_KEY_PREFIX, challengeId]);
  const challenge = challengeEntry.value;
  if (!challenge) return errorResponse("Challenge not found", 404);
  if (Date.now() > challenge.expiresAt) {
    challenge.status = "expired";
    await kv.set([...CHALLENGE_KEY_PREFIX, challenge.id], challenge);
    return errorResponse("Challenge expired", 409);
  }
  if (auth.userId !== challenge.creatorId && auth.userId !== challenge.opponentId) {
    await logAntiCheat(kv, { type: "challenge_actor_mismatch", userId: auth.userId, challengeId });
    return errorResponse("Forbidden", 403);
  }
  const sessionEntry = await kv.get<PuzzleSession>([...SESSION_KEY_PREFIX, sessionId]);
  const session = sessionEntry.value;
  if (!session) return errorResponse("Session not found", 404);
  if (session.seed !== challenge.seed || session.status === "playing") {
    await logAntiCheat(kv, { type: "challenge_session_invalid", userId: auth.userId, challengeId, sessionId });
    return errorResponse("Invalid challenge session", 403);
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
  await kv.set([...CHALLENGE_KEY_PREFIX, challenge.id], challenge);
  if (challenge.status === "completed") {
    const winnerText = challenge.winnerId ? "Winner decided. Check your result." : "Draw. Great duel.";
    await Promise.all([
      sendPushToUser(challenge.creatorId, {
        title: "Challenge Completed",
        body: winnerText,
        url: "/challenges",
      }),
      sendPushToUser(challenge.opponentId, {
        title: "Challenge Completed",
        body: winnerText,
        url: "/challenges",
      }),
    ]);
  }
  return jsonResponse(challenge);
}

async function handleDailyPushBroadcast(req: Request): Promise<Response> {
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) return errorResponse("Forbidden", 403);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Supabase service key not configured", 500);
  }

  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,preferences`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!profilesResponse.ok) return errorResponse("Could not fetch profiles", 500);
  const profiles = (await profilesResponse.json()) as Array<{ id: string; preferences?: Record<string, unknown> }>;

  let notified = 0;
  for (const profile of profiles) {
    if (profile.preferences?.notify_daily === true) {
      await sendPushToUser(profile.id, {
        title: "Lexis Daily Puzzle",
        body: "Today's puzzle is live. Keep your streak alive.",
        url: "/play",
      });
      notified += 1;
    }
  }
  return jsonResponse({ ok: true, users_notified: notified });
}

async function handleGetChallenge(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("id is required", 400);
  const kv = await Deno.openKv();
  const challenge = await kv.get<ChallengeRecord>([...CHALLENGE_KEY_PREFIX, id]);
  if (!challenge.value) return errorResponse("Challenge not found", 404);
  return jsonResponse(challenge.value);
}

async function handler(req: Request): Promise<Response> {
  const start = performance.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const { pathname } = new URL(req.url);
  const method = req.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  let response: Response;
  let isError = false;
  try {
    if (method === "GET" && pathname === "/health") {
      response = jsonResponse({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0", uptime_ms: Date.now() - SERVER_START });
    } else if (method === "GET" && pathname === "/metrics") {
      const routeMetrics: Record<string, { count: number; avg_duration_ms: number }> = {};
      for (const [path, data] of Object.entries(metrics.routes)) {
        routeMetrics[path] = { count: data.count, avg_duration_ms: Math.round(data.total_duration_ms / data.count) };
      }
      response = jsonResponse({
        total_requests: metrics.total_requests,
        total_errors: metrics.total_errors,
        rate_limited: metrics.rate_limited,
        anti_cheat_events: metrics.anti_cheat_events,
        push_sent: metrics.push_sent,
        push_failed: metrics.push_failed,
        uptime_ms: Date.now() - SERVER_START,
        routes: routeMetrics,
      });
    } else if (method === "POST" && pathname === "/v2/puzzles/session") {
      response = await handleCreateSession(req);
    } else if (method === "POST" && pathname === "/v2/puzzles/guess") {
      response = await handlePostGuess(req);
    } else if (method === "POST" && pathname === "/v2/puzzles/finalize") {
      response = await handleFinalize(req);
    } else if (method === "POST" && pathname === "/v2/challenges/create") {
      response = await handleCreateChallenge(req);
    } else if (method === "POST" && pathname === "/v2/challenges/submit") {
      response = await handleSubmitChallenge(req);
    } else if (method === "GET" && pathname === "/v2/challenges/get") {
      response = await handleGetChallenge(req);
    } else if (method === "POST" && pathname === "/v2/notifications/daily-broadcast") {
      response = await handleDailyPushBroadcast(req);
    } else {
      response = errorResponse("Not found", 404);
    }
  } catch (err) {
    isError = true;
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Unhandled route error", { path: pathname, method, error: message, request_id: requestId });
    response = errorResponse("Internal server error", 500);
  }
  const duration_ms = Math.round(performance.now() - start);
  recordMetric(pathname, duration_ms, isError);
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  for (const [k, v] of Object.entries(corsHeaders())) if (!headers.has(k)) headers.set(k, v);
  logger.request(method, pathname, response.status, duration_ms, { request_id: requestId });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const port = parseInt(Deno.env.get("PORT") ?? "8000");
logger.info("Lexis API server started", { port, env: Deno.env.get("DENO_ENV") ?? "production" });
serve(handler, { port });
