import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyAuthHeader } from "./supabase.ts";

type LetterResult = "correct" | "present" | "absent";

interface EvaluatedLetter {
  letter: string;
  result: LetterResult;
}

function evaluateGuessAgainstSolution(guess: string, solution: string): EvaluatedLetter[] {
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

interface Friend {
  userId: string;
  username: string;
}

interface Challenge {
  id: string;
  creatorId: string;
  puzzleSeed: string;
  attemptLimit: number;
  createdAt: number;
}

interface ChallengeResult {
  challengeId: string;
  userId: string;
  attempts: number;
  elapsedMs: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  puzzlesSolved: number;
  streak: number;
  averageAttempts: number;
}

function computeScore(entry: LeaderboardEntry): number {
  const { puzzlesSolved, streak, averageAttempts } = entry;
  return puzzlesSolved * 5 + streak * 3 - averageAttempts * 2;
}

// ── Logger ──────────────────────────────────────────────────────────────

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

  warn(message: string, data?: Record<string, unknown>) {
    this.json("warn", message, data);
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

// ── Metrics ─────────────────────────────────────────────────────────────

const SERVER_START = Date.now();

const metrics = {
  total_requests: 0,
  total_errors: 0,
  routes: {} as Record<string, { count: number; total_duration_ms: number }>,
};

function recordMetric(path: string, duration_ms: number, isError: boolean) {
  metrics.total_requests++;
  if (isError) metrics.total_errors++;
  if (!metrics.routes[path]) {
    metrics.routes[path] = { count: 0, total_duration_ms: 0 };
  }
  metrics.routes[path].count++;
  metrics.routes[path].total_duration_ms += duration_ms;
}

// ── CORS ────────────────────────────────────────────────────────────────

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
  return {
    "content-type": "application/json",
    ...corsHeaders(),
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(extra),
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

// ── Interfaces ──────────────────────────────────────────────────────────

interface PuzzlePayload {
  puzzleId: string;
  seed: string;
  maxAttempts: number;
}

interface GuessRequestBody {
  puzzleId: string;
  guess: string;
}

interface FriendRequestBody {
  friendId: string;
  friendUsername: string;
}

interface ChallengeCreateBody {
  puzzleSeed: string;
  attemptLimit: number;
}

interface ChallengeResultBody {
  challengeId: string;
  attempts: number;
  elapsedMs: number;
}

// ── KV key prefixes ────────────────────────────────────────────────────

const SOLUTION_KEY_PREFIX = ["puzzle", "solution"] as const;
const FRIENDS_KEY_PREFIX = ["friends"] as const;
const CHALLENGE_KEY_PREFIX = ["challenge"] as const;
const CHALLENGE_RESULTS_PREFIX = ["challenge_result"] as const;
const LEADERBOARD_GLOBAL_PREFIX = ["leaderboard", "global"] as const;

// ── Route handlers ──────────────────────────────────────────────────────

async function getOrCreatePuzzle(kv: Deno.Kv): Promise<PuzzlePayload> {
  const puzzleId = "daily-001";
  const solutionKey = [...SOLUTION_KEY_PREFIX, puzzleId];
  const existing = await kv.get<string>(solutionKey);

  if (!existing.value) {
    const solution = "lexis";
    await kv.set(solutionKey, solution);
  }

  return {
    puzzleId,
    seed: puzzleId,
    maxAttempts: 6
  };
}

async function handleGetPuzzle(): Promise<Response> {
  const kv = await Deno.openKv();
  const payload = await getOrCreatePuzzle(kv);
  return jsonResponse(payload);
}

async function handlePostGuess(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) {
    return errorResponse("Unauthorized", 401);
  }

  const kv = await Deno.openKv();
  const body = (await req.json()) as GuessRequestBody;

  const solutionKey = [...SOLUTION_KEY_PREFIX, body.puzzleId];
  const solutionEntry = await kv.get<string>(solutionKey);
  const solution = solutionEntry.value ?? "lexis";

  const letters = evaluateGuessAgainstSolution(body.guess, solution);
  const isWin = letters.every((letter) => letter.result === "correct");

  return jsonResponse({
    puzzleId: body.puzzleId,
    letters,
    isWin,
    userId: auth.userId
  });
}

async function handleGetFriends(userId: string): Promise<Response> {
  const kv = await Deno.openKv();
  const prefix = [...FRIENDS_KEY_PREFIX, userId];
  const friends: Friend[] = [];

  for await (const entry of kv.list<Friend>({ prefix })) {
    if (entry.value) friends.push(entry.value);
  }

  return jsonResponse({ friends });
}

async function handlePostFriend(
  userId: string,
  body: FriendRequestBody
): Promise<Response> {
  const kv = await Deno.openKv();
  const friend: Friend = {
    userId: body.friendId,
    username: body.friendUsername
  };

  await kv.set([...FRIENDS_KEY_PREFIX, userId, friend.userId], friend);

  return jsonResponse({ friend });
}

async function handleCreateChallenge(userId: string, body: ChallengeCreateBody): Promise<Response> {
  const kv = await Deno.openKv();
  const id = crypto.randomUUID();
  const challenge: Challenge = {
    id,
    creatorId: userId,
    puzzleSeed: body.puzzleSeed,
    attemptLimit: body.attemptLimit,
    createdAt: Date.now()
  };

  await kv.set([...CHALLENGE_KEY_PREFIX, id], challenge);

  return jsonResponse(challenge);
}

async function handleSubmitChallengeResult(
  userId: string,
  body: ChallengeResultBody
): Promise<Response> {
  const kv = await Deno.openKv();
  const result: ChallengeResult = {
    challengeId: body.challengeId,
    userId,
    attempts: body.attempts,
    elapsedMs: body.elapsedMs
  };

  await kv.set(
    [...CHALLENGE_RESULTS_PREFIX, body.challengeId, userId],
    result
  );

  return jsonResponse(result);
}

async function handleGetGlobalLeaderboard(): Promise<Response> {
  const kv = await Deno.openKv();
  const prefix = LEADERBOARD_GLOBAL_PREFIX;
  const entries: (LeaderboardEntry & { score: number })[] = [];

  for await (const entry of kv.list<LeaderboardEntry>({ prefix })) {
    if (!entry.value) continue;
    const score = computeScore(entry.value);
    entries.push({ ...entry.value, score });
  }

  entries.sort((a, b) => b.score - a.score);

  return jsonResponse({ entries });
}

// ── Main handler with middleware ────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  const start = performance.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  let response: Response;
  let isError = false;

  try {
    if (method === "GET" && pathname === "/health") {
      response = jsonResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        uptime_ms: Date.now() - SERVER_START,
      });
    } else if (method === "GET" && pathname === "/metrics") {
      const routeMetrics: Record<string, { count: number; avg_duration_ms: number }> = {};
      for (const [path, data] of Object.entries(metrics.routes)) {
        routeMetrics[path] = {
          count: data.count,
          avg_duration_ms: Math.round(data.total_duration_ms / data.count),
        };
      }
      response = jsonResponse({
        total_requests: metrics.total_requests,
        total_errors: metrics.total_errors,
        uptime_ms: Date.now() - SERVER_START,
        routes: routeMetrics,
      });
    } else if (method === "GET" && pathname === "/puzzle") {
      response = await handleGetPuzzle();
    } else if (method === "POST" && pathname === "/guess") {
      response = await handlePostGuess(req);
    } else if (pathname === "/friends") {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) {
        response = errorResponse("Unauthorized", 401);
      } else if (method === "GET") {
        response = await handleGetFriends(auth.userId);
      } else if (method === "POST") {
        const body = (await req.json()) as FriendRequestBody;
        response = await handlePostFriend(auth.userId, body);
      } else {
        response = errorResponse("Not found", 404);
      }
    } else if (pathname === "/challenges" && method === "POST") {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) {
        response = errorResponse("Unauthorized", 401);
      } else {
        const body = (await req.json()) as ChallengeCreateBody;
        response = await handleCreateChallenge(auth.userId, body);
      }
    } else if (pathname === "/challenges/result" && method === "POST") {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) {
        response = errorResponse("Unauthorized", 401);
      } else {
        const body = (await req.json()) as ChallengeResultBody;
        response = await handleSubmitChallengeResult(auth.userId, body);
      }
    } else if (method === "GET" && pathname === "/leaderboard/global") {
      response = await handleGetGlobalLeaderboard();
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
  for (const [k, v] of Object.entries(corsHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }

  logger.request(method, pathname, response.status, duration_ms, { request_id: requestId });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Start ───────────────────────────────────────────────────────────────

const port = parseInt(Deno.env.get("PORT") ?? "8000");

logger.info("Lexis API server started", {
  port,
  env: Deno.env.get("DENO_ENV") ?? "production",
});

serve(handler, { port });
