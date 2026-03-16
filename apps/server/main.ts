import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  computeScore,
  evaluateGuessAgainstSolution,
  type Challenge,
  type ChallengeResult,
  type Friend,
  type LeaderboardEntry
} from "../../packages/shared/src/index.ts";
import { verifyAuthHeader } from "./supabase.ts";

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

const SOLUTION_KEY_PREFIX = ["puzzle", "solution"] as const;
const FRIENDS_KEY_PREFIX = ["friends"] as const;
const CHALLENGE_KEY_PREFIX = ["challenge"] as const;
const CHALLENGE_RESULTS_PREFIX = ["challenge_result"] as const;
const LEADERBOARD_GLOBAL_PREFIX = ["leaderboard", "global"] as const;

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

  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

async function handlePostGuess(req: Request): Promise<Response> {
  const auth = await verifyAuthHeader(req.headers.get("authorization"));
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const kv = await Deno.openKv();
  const body = (await req.json()) as GuessRequestBody;

  const solutionKey = [...SOLUTION_KEY_PREFIX, body.puzzleId];
  const solutionEntry = await kv.get<string>(solutionKey);
  const solution = solutionEntry.value ?? "lexis";

  const letters = evaluateGuessAgainstSolution(body.guess, solution);
  const isWin = letters.every((letter) => letter.result === "correct");

  return new Response(
    JSON.stringify({
      puzzleId: body.puzzleId,
      letters,
      isWin,
      userId: auth.userId
    }),
    {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    }
  );
}

function notFound() {
  return new Response("Not found", { status: 404 });
}

async function handleGetFriends(userId: string): Promise<Response> {
  const kv = await Deno.openKv();
  const prefix = [...FRIENDS_KEY_PREFIX, userId];
  const friends: Friend[] = [];

  for await (const entry of kv.list<Friend>({ prefix })) {
    if (entry.value) friends.push(entry.value);
  }

  return new Response(JSON.stringify({ friends }), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
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

  return new Response(JSON.stringify({ friend }), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

async function handleCreateChallenge(userId: string, body: ChallengeCreateBody) {
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

  return new Response(JSON.stringify(challenge), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

async function handleSubmitChallengeResult(
  userId: string,
  body: ChallengeResultBody
) {
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

  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
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

  return new Response(JSON.stringify({ entries }), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

serve((req) => {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/health") {
    return new Response("ok", {
      headers: { "content-type": "text/plain" }
    });
  }

  if (req.method === "GET" && url.pathname === "/puzzle") {
    return handleGetPuzzle();
  }

  if (req.method === "POST" && url.pathname === "/guess") {
    return handlePostGuess(req);
  }

  if (url.pathname === "/friends") {
    return (async () => {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) return new Response("Unauthorized", { status: 401 });

      if (req.method === "GET") {
        return handleGetFriends(auth.userId);
      }
      if (req.method === "POST") {
        const body = (await req.json()) as FriendRequestBody;
        return handlePostFriend(auth.userId, body);
      }
      return notFound();
    })();
  }

  if (url.pathname === "/challenges") {
    return (async () => {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) return new Response("Unauthorized", { status: 401 });

      if (req.method === "POST") {
        const body = (await req.json()) as ChallengeCreateBody;
        return handleCreateChallenge(auth.userId, body);
      }
      return notFound();
    })();
  }

  if (url.pathname === "/challenges/result" && req.method === "POST") {
    return (async () => {
      const auth = await verifyAuthHeader(req.headers.get("authorization"));
      if (!auth) return new Response("Unauthorized", { status: 401 });
      const body = (await req.json()) as ChallengeResultBody;
      return handleSubmitChallengeResult(auth.userId, body);
    })();
  }

  if (req.method === "GET" && url.pathname === "/leaderboard/global") {
    return handleGetGlobalLeaderboard();
  }

  return notFound();
}, { port: 8000 });

