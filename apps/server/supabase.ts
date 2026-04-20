import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "https://deno.land/x/jose@v5.9.3/index.ts";

const supabaseProjectId = Deno.env.get("SUPABASE_PROJECT_ID")!;

const jwks = createRemoteJWKSet(
  new URL(`https://${supabaseProjectId}.supabase.co/auth/v1/keys`)
);

export interface AuthContext {
  userId: string;
  payload: JWTPayload;
}

export async function verifyAuthHeader(
  authHeader: string | null
): Promise<AuthContext | null> {
  try {
    if (!authHeader) return null;
    const [, token] = authHeader.split(" ");
    if (!token) return null;

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${supabaseProjectId}.supabase.co/auth/v1`
    });

    const userId = String(payload.sub ?? "");
    if (!userId) return null;

    return { userId, payload };
  } catch {
    return null;
  }
}

