import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const updateSession = async (request: NextRequest) => {
  const supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createClient(supabaseUrl, supabaseKey);

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  }

  return supabaseResponse;
};
