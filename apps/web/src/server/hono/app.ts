import { Hono } from "hono";
import { challengesRoute } from "./routes/challenges";
import { notificationsRoute } from "./routes/notifications";
import { puzzlesRoute } from "./routes/puzzles";
import { metrics, recordMetric } from "./state";

const app = new Hono();
const serverStart = Date.now();

app.use("*", async (c, next) => {
  const start = performance.now();
  let isError = false;
  try {
    await next();
  } catch {
    isError = true;
    throw new Error("Unhandled route error");
  } finally {
    const durationMs = Math.round(performance.now() - start);
    recordMetric(new URL(c.req.url).pathname, durationMs, isError || c.res.status >= 500);
  }
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    uptime_ms: Date.now() - serverStart,
  });
});

app.get("/metrics", (c) => {
  const routeMetrics: Record<string, { count: number; avg_duration_ms: number }> = {};
  for (const [path, data] of Object.entries(metrics.routes)) {
    routeMetrics[path] = {
      count: data.count,
      avg_duration_ms: Math.round(data.total_duration_ms / data.count),
    };
  }
  return c.json({
    total_requests: metrics.total_requests,
    total_errors: metrics.total_errors,
    rate_limited: metrics.rate_limited,
    anti_cheat_events: metrics.anti_cheat_events,
    push_sent: metrics.push_sent,
    push_failed: metrics.push_failed,
    uptime_ms: Date.now() - serverStart,
    routes: routeMetrics,
  });
});

app.route("/v2/puzzles", puzzlesRoute);
app.route("/v2/challenges", challengesRoute);
app.route("/v2/notifications", notificationsRoute);

export { app };
