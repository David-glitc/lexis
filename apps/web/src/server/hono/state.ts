import type { ChallengeRecord, PuzzleSession } from "./types";

export const sessions = new Map<string, PuzzleSession>();
export const challenges = new Map<string, ChallengeRecord>();

export const metrics = {
  total_requests: 0,
  total_errors: 0,
  rate_limited: 0,
  anti_cheat_events: 0,
  push_sent: 0,
  push_failed: 0,
  routes: {} as Record<string, { count: number; total_duration_ms: number }>,
};

export function recordMetric(path: string, durationMs: number, isError: boolean): void {
  metrics.total_requests += 1;
  if (isError) metrics.total_errors += 1;
  if (!metrics.routes[path]) metrics.routes[path] = { count: 0, total_duration_ms: 0 };
  metrics.routes[path].count += 1;
  metrics.routes[path].total_duration_ms += durationMs;
}
