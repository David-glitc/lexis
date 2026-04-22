import { Hono } from "hono";
import { getServerConfig } from "../lib/config";

export const notificationsRoute = new Hono();

notificationsRoute.post("/daily-broadcast", async (c) => {
  const { cronSecret, supabaseServiceRoleKey, supabaseUrl } = getServerConfig();
  const provided = c.req.header("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) return c.json({ error: "Forbidden" }, 403);
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return c.json({ error: "Supabase service key not configured" }, 500);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,preferences`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });
  if (!response.ok) {
    return c.json({ error: `Could not fetch profiles (${response.status})` }, 500);
  }
  const profiles = (await response.json()) as Array<{ id: string; preferences?: Record<string, unknown> }>;
  let usersNotified = 0;
  for (const profile of profiles) {
    if (profile.preferences?.notify_daily === true) usersNotified += 1;
  }
  return c.json({ ok: true, users_notified: usersNotified });
});
