import { getServerConfig } from "./config";

export interface AuthContext {
  userId: string;
}

export async function verifyAuthHeader(authHeader: string | null): Promise<AuthContext | null> {
  if (!authHeader) return null;
  const [, token] = authHeader.split(" ");
  if (!token) return null;

  const { supabaseUrl, supabaseAnonKey } = getServerConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) return null;
    return { userId: payload.id };
  } catch {
    return null;
  }
}
