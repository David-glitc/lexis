import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_TABLES = [
  "profiles",
  "puzzle_logs",
  "friendships",
  "challenges",
  "points_ledger",
  "daily_challenges",
  "push_subscriptions",
  "daily_puzzles",
  "puzzle_sessions",
  "player_ratings",
  "anti_cheat_events",
  "user_presence",
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function toIsoNow() {
  return new Date().toISOString();
}

async function getTableHealth(client, tableName) {
  const result = {
    table: tableName,
    ok: false,
    rowCount: null,
    sample: [],
    error: null,
  };

  const countQuery = await client.from(tableName).select("*", { count: "exact", head: true });
  if (countQuery.error) {
    result.error = countQuery.error.message;
    return result;
  }

  result.rowCount = countQuery.count ?? 0;

  const sampleQuery = await client
    .from(tableName)
    .select("*")
    .limit(3);

  if (sampleQuery.error) {
    result.error = sampleQuery.error.message;
    return result;
  }

  result.sample = sampleQuery.data ?? [];
  result.ok = true;
  return result;
}

async function run() {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startedAt = Date.now();
  const tableReports = [];
  for (const tableName of REQUIRED_TABLES) {
    // Sequential checks reduce pressure on database rate limits.
    // eslint-disable-next-line no-await-in-loop
    tableReports.push(await getTableHealth(client, tableName));
  }

  const healthyCount = tableReports.filter((r) => r.ok).length;
  const unhealthy = tableReports.filter((r) => !r.ok);
  const totalRowsAcrossReadableTables = tableReports
    .filter((r) => r.ok && typeof r.rowCount === "number")
    .reduce((acc, r) => acc + (r.rowCount ?? 0), 0);

  const summary = {
    timestamp: toIsoNow(),
    elapsedMs: Date.now() - startedAt,
    database: supabaseUrl,
    totalTablesExpected: REQUIRED_TABLES.length,
    healthyTables: healthyCount,
    unhealthyTables: unhealthy.length,
    totalRowsAcrossReadableTables,
    allHealthy: unhealthy.length === 0,
  };

  const report = {
    summary,
    unhealthyTables: unhealthy.map((item) => ({
      table: item.table,
      error: item.error,
    })),
    tables: tableReports,
  };

  const reportsDir = join(process.cwd(), "reports");
  await mkdir(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, `db-intel-${Date.now()}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nDB intelligence report written to: ${reportPath}`);
}

run().catch((error) => {
  console.error("DB intelligence failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
