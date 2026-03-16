import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const createBrowserSupabaseClient = () =>
  createClient(supabaseUrl, supabaseKey);

export { createBrowserSupabaseClient as createClient };
