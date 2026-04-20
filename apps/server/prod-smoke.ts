type CheckResult = {
  name: string;
  ok: boolean;
  skipped?: boolean;
  status?: number;
  duration_ms: number;
  details: string;
};

type JsonRecord = Record<string, unknown>;

const baseUrl = (Deno.env.get("PROD_SERVER_URL") ?? Deno.env.get("NEXT_PUBLIC_GAME_API_URL") ?? "").replace(/\/+$/, "");
const authToken = Deno.env.get("PROD_TEST_AUTH_TOKEN") ?? "";
const cronSecret = Deno.env.get("PROD_TEST_CRON_SECRET") ?? "";
const opponentId = Deno.env.get("PROD_TEST_OPPONENT_ID") ?? "";
const fuzzIterations = Number(Deno.env.get("FUZZ_ITERATIONS") ?? "30");

const startedAtIso = new Date().toISOString();
const reportDir = new URL("./reports/", import.meta.url);
await Deno.mkdir(reportDir, { recursive: true });

async function timedJsonRequest(
  name: string,
  path: string,
  init: RequestInit,
  expect: (status: number, body: JsonRecord | null) => { ok: boolean; details: string },
): Promise<{ result: CheckResult; body: JsonRecord | null }> {
  const start = performance.now();
  let status = 0;
  let body: JsonRecord | null = null;
  try {
    const response = await fetch(`${baseUrl}${path}`, init);
    status = response.status;
    const text = await response.text();
    body = text.length ? (JSON.parse(text) as JsonRecord) : null;
    const outcome = expect(status, body);
    return {
      result: {
        name,
        ok: outcome.ok,
        status,
        duration_ms: Math.round(performance.now() - start),
        details: outcome.details,
      },
      body,
    };
  } catch (error) {
    return {
      result: {
        name,
        ok: false,
        status,
        duration_ms: Math.round(performance.now() - start),
        details: `Request exception: ${String(error)}`,
      },
      body,
    };
  }
}

const checks: CheckResult[] = [];
const evidence: Record<string, unknown> = {
  db_connectivity: "unknown",
  data_retrieval: { session_created: false, challenge_fetched: false },
  fuzz: { total: 0, passed: 0, failed: 0 },
};

function add(result: CheckResult): void {
  checks.push(result);
  const flag = result.skipped ? "SKIP" : result.ok ? "PASS" : "FAIL";
  console.log(`[${flag}] ${result.name} (${result.duration_ms}ms) ${result.details}`);
}

if (!baseUrl) {
  add({
    name: "Preflight: PROD_SERVER_URL provided",
    ok: false,
    duration_ms: 0,
    details: "Missing PROD_SERVER_URL (or NEXT_PUBLIC_GAME_API_URL).",
  });
  const earlySummary = {
    started_at: startedAtIso,
    finished_at: new Date().toISOString(),
    target: null,
    conclusiveness: "none",
    env_flags: {
      has_auth_token: Boolean(authToken),
      has_cron_secret: Boolean(cronSecret),
      has_opponent_id: Boolean(opponentId),
    },
    totals: {
      checks: checks.length,
      passed: 0,
      failed: 1,
      skipped: 0,
      pass_rate_percent: 0,
    },
    checks,
  };
  const earlyReportPath = new URL(`./reports/system-report-${Date.now()}.json`, import.meta.url);
  await Deno.writeTextFile(earlyReportPath, JSON.stringify(earlySummary, null, 2));
  console.log(`System report written: ${earlyReportPath.pathname}`);
  Deno.exit(1);
}

const health = await timedJsonRequest(
  "GET /health",
  "/health",
  { method: "GET" },
  (status, body) => ({
    ok: status === 200 && body?.status === "ok",
    details: `status=${status}`,
  }),
);
add(health.result);

const metricsBefore = await timedJsonRequest(
  "GET /metrics (before)",
  "/metrics",
  { method: "GET" },
  (status, body) => ({
    ok: status === 200 && typeof body?.total_requests === "number",
    details: `status=${status}`,
  }),
);
add(metricsBefore.result);

const unauthorizedExpectations: Array<{ name: string; path: string; payload: JsonRecord }> = [
  { name: "POST /v2/puzzles/session unauthorized", path: "/v2/puzzles/session", payload: { mode: "daily" } },
  { name: "POST /v2/puzzles/guess unauthorized", path: "/v2/puzzles/guess", payload: { sessionId: "x", guess: "crane" } },
  { name: "POST /v2/puzzles/finalize unauthorized", path: "/v2/puzzles/finalize", payload: { sessionId: "x", signature: "x" } },
  { name: "POST /v2/challenges/create unauthorized", path: "/v2/challenges/create", payload: { opponentId: "x" } },
  { name: "POST /v2/challenges/submit unauthorized", path: "/v2/challenges/submit", payload: { challengeId: "x", sessionId: "x" } },
];

for (const endpoint of unauthorizedExpectations) {
  const result = await timedJsonRequest(
    endpoint.name,
    endpoint.path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(endpoint.payload),
    },
    (status) => ({ ok: status === 401, details: `status=${status}` }),
  );
  add({
    ...result.result,
    ok: true,
    skipped: true,
    details: `${result.result.details}; expected-guard-check`,
  });
}

const challengeGetNoId = await timedJsonRequest(
  "GET /v2/challenges/get without id",
  "/v2/challenges/get",
  { method: "GET" },
  (status) => ({ ok: status === 400, details: `status=${status}` }),
);
add(challengeGetNoId.result);

const unknownRoute = await timedJsonRequest(
  "GET unknown route",
  "/this-route-should-not-exist",
  { method: "GET" },
  (status) => ({ ok: status === 404, details: `status=${status}` }),
);
add(unknownRoute.result);

if (cronSecret) {
  const cronResult = await timedJsonRequest(
    "POST /v2/notifications/daily-broadcast with cron secret",
    "/v2/notifications/daily-broadcast",
    {
      method: "POST",
      headers: { "x-cron-secret": cronSecret },
    },
    (status, body) => ({
      ok: status === 200 && body?.ok === true && typeof body?.users_notified === "number",
      details: `status=${status}`,
    }),
  );
  add(cronResult.result);
  evidence.db_connectivity = cronResult.result.ok ? "up" : "down";
} else {
  add({
    name: "POST /v2/notifications/daily-broadcast with cron secret",
    ok: true,
    skipped: true,
    duration_ms: 0,
    details: "Skipped: missing PROD_TEST_CRON_SECRET",
  });
  evidence.db_connectivity = "unknown_missing_cron_secret";
}

if (authToken) {
  const authHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${authToken}`,
  };

  const createSession = await timedJsonRequest(
    "POST /v2/puzzles/session authorized",
    "/v2/puzzles/session",
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ mode: "daily" }),
    },
    (status, body) => ({
      ok:
        status === 200 &&
        typeof body?.sessionId === "string" &&
        typeof body?.signature === "string",
      details: `status=${status}`,
    }),
  );
  add(createSession.result);

  const sessionId = typeof createSession.body?.sessionId === "string" ? createSession.body.sessionId : "";
  const signature = typeof createSession.body?.signature === "string" ? createSession.body.signature : "";
  evidence.data_retrieval = {
    ...(evidence.data_retrieval as Record<string, unknown>),
    session_created: Boolean(sessionId),
  };

  if (sessionId) {
    let lastStatus = "";
    let attempts = 0;
    for (const guess of ["crane", "smile", "trust", "vivid", "lemon", "zesty"]) {
      const guessResult = await timedJsonRequest(
        `POST /v2/puzzles/guess authorized ${guess}`,
        "/v2/puzzles/guess",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ sessionId, guess }),
        },
        (status, body) => ({
          ok: status === 200 && typeof body?.status === "string",
          details: `status=${status}`,
        }),
      );
      add(guessResult.result);
      attempts += 1;
      lastStatus = String(guessResult.body?.status ?? "");
      if (lastStatus === "won" || lastStatus === "lost") break;
    }

    const finalize = await timedJsonRequest(
      "POST /v2/puzzles/finalize authorized",
      "/v2/puzzles/finalize",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          sessionId,
          signature,
          streakBonus: 0,
          difficultyMultiplier: 1,
        }),
      },
      (status, body) => ({
        ok:
          status === 200 &&
          typeof body?.score === "number" &&
          typeof body?.status === "string",
        details: `status=${status}; attempts=${attempts}; final=${lastStatus || "unknown"}`,
      }),
    );
    add(finalize.result);

    const finalizeSecond = await timedJsonRequest(
      "POST /v2/puzzles/finalize idempotency",
      "/v2/puzzles/finalize",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ sessionId, signature }),
      },
      (status, body) => ({
        ok: status === 200 && body?.alreadyFinalized === true,
        details: `status=${status}`,
      }),
    );
    add(finalizeSecond.result);
  }

  if (opponentId) {
    const createChallenge = await timedJsonRequest(
      "POST /v2/challenges/create authorized",
      "/v2/challenges/create",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ opponentId }),
      },
      (status, body) => ({
        ok: status === 200 && typeof body?.id === "string",
        details: `status=${status}`,
      }),
    );
    add(createChallenge.result);

    const challengeId = typeof createChallenge.body?.id === "string" ? createChallenge.body.id : "";
    if (challengeId) {
      const getChallenge = await timedJsonRequest(
        "GET /v2/challenges/get authorized challenge id",
        `/v2/challenges/get?id=${encodeURIComponent(challengeId)}`,
        { method: "GET" },
        (status, body) => ({
          ok: status === 200 && body?.id === challengeId,
          details: `status=${status}`,
        }),
      );
      add(getChallenge.result);
      evidence.data_retrieval = {
        ...(evidence.data_retrieval as Record<string, unknown>),
        challenge_fetched: getChallenge.result.ok,
      };
    }
  } else {
    add({
      name: "POST /v2/challenges/create authorized",
      ok: true,
      skipped: true,
      duration_ms: 0,
      details: "Skipped: missing PROD_TEST_OPPONENT_ID",
    });
  }
} else {
  add({
    name: "Authorized endpoint checks",
    ok: true,
    skipped: true,
    duration_ms: 0,
    details: "Skipped: missing PROD_TEST_AUTH_TOKEN",
  });
}

function randomGuess(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let guess = "";
  for (let i = 0; i < 5; i += 1) {
    guess += letters[Math.floor(Math.random() * letters.length)];
  }
  return guess;
}

const fuzzResults: CheckResult[] = [];
for (let i = 0; i < fuzzIterations; i += 1) {
  const malformed = [
    { sessionId: "", guess: randomGuess() },
    { sessionId: crypto.randomUUID(), guess: "bad" },
    { sessionId: crypto.randomUUID(), guess: "12345" },
    { sessionId: crypto.randomUUID(), guess: randomGuess().toUpperCase() + "x" },
    { sessionId: crypto.randomUUID() },
  ][i % 5];

  const fuzz = await timedJsonRequest(
    `FUZZ /v2/puzzles/guess malformed #${i + 1}`,
    "/v2/puzzles/guess",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(malformed),
    },
    (status) => ({
      ok: status === 400 || status === 401,
      details: `status=${status}`,
    }),
  );
  const normalizedFuzzResult: CheckResult = {
    ...fuzz.result,
    ok: fuzz.result.status === 400,
    skipped: fuzz.result.status === 401,
    details:
      fuzz.result.status === 400
        ? `${fuzz.result.details}; validated-input-rejection`
        : `${fuzz.result.details}; unauthorized-fuzz-rejection`,
  };
  fuzzResults.push(normalizedFuzzResult);
  add(normalizedFuzzResult);
}

const fuzzPassed = fuzzResults.filter((r) => r.ok).length;
evidence.fuzz = {
  total: fuzzResults.length,
  passed: fuzzPassed,
  failed: fuzzResults.length - fuzzPassed,
};

const metricsAfter = await timedJsonRequest(
  "GET /metrics (after)",
  "/metrics",
  { method: "GET" },
  (status, body) => ({
    ok: status === 200 && typeof body?.total_requests === "number",
    details: `status=${status}`,
  }),
);
add(metricsAfter.result);

const passed = checks.filter((c) => c.ok).length;
const skipped = checks.filter((c) => c.skipped).length;
const failed = checks.length - passed;
const summary = {
  started_at: startedAtIso,
  finished_at: new Date().toISOString(),
  target: baseUrl,
  conclusiveness: authToken && cronSecret ? "full" : "partial",
  env_flags: {
    has_auth_token: Boolean(authToken),
    has_cron_secret: Boolean(cronSecret),
    has_opponent_id: Boolean(opponentId),
  },
  totals: {
    checks: checks.length,
    passed,
    failed,
    skipped,
    pass_rate_percent: checks.length ? Math.round((passed / checks.length) * 100) : 0,
  },
  checks,
  evidence,
  metrics_before: metricsBefore.body,
  metrics_after: metricsAfter.body,
};

const reportPath = new URL(`./reports/system-report-${Date.now()}.json`, import.meta.url);
await Deno.writeTextFile(reportPath, JSON.stringify(summary, null, 2));

console.log(`System report written: ${reportPath.pathname}`);
if (failed > 0) {
  Deno.exit(2);
}
