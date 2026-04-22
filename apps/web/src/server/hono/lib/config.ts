export function getServerConfig() {
  return {
    gameSeedSecret: process.env.GAME_SEED_SECRET ?? "lexis-dev-secret",
    cronSecret: process.env.CRON_SECRET ?? "",
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}
