import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthoritativeMode = "daily" | "infinite" | "challenge" | "daily_speed" | "speed";

interface ApiGuessResult {
  sessionId: string;
  puzzleId: string;
  letters: Array<{ letter: string; result: "correct" | "present" | "absent" }>;
  status: "playing" | "won" | "lost" | "expired";
  attempts: number;
  isWin: boolean;
}

interface ApiSession {
  sessionId: string;
  puzzleId: string;
  seed: string;
  signature: string;
  mode: AuthoritativeMode;
  dateKey: string | null;
  maxAttempts: number;
}

export class AuthoritativeGameService {
  private readonly baseUrl: string;
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
    const configuredBaseUrl = (process.env.NEXT_PUBLIC_GAME_API_URL ?? "/api").trim();
    this.baseUrl = configuredBaseUrl.replace(/\/+$/, "");
  }

  isEnabled(): boolean {
    return true;
  }

  private async authHeaders(): Promise<HeadersInit> {
    const { data } = await this.client.auth.getSession();
    const token = data.session?.access_token;
    return {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async createSession(mode: AuthoritativeMode, dateKey?: string, challengeId?: string): Promise<ApiSession | null> {
    if (!this.isEnabled()) return null;
    try {
      const res = await fetch(`${this.baseUrl}/v2/puzzles/session`, {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify({ mode, dateKey, challengeId }),
      });
      if (!res.ok) return null;
      return (await res.json()) as ApiSession;
    } catch {
      return null;
    }
  }

  async guess(sessionId: string, guess: string): Promise<ApiGuessResult | null> {
    if (!this.isEnabled()) return null;
    try {
      const res = await fetch(`${this.baseUrl}/v2/puzzles/guess`, {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify({ sessionId, guess }),
      });
      if (!res.ok) return null;
      return (await res.json()) as ApiGuessResult;
    } catch {
      return null;
    }
  }

  async finalize(sessionId: string, signature: string): Promise<{ score: number; ratingDelta: number } | null> {
    if (!this.isEnabled()) return null;
    try {
      const res = await fetch(`${this.baseUrl}/v2/puzzles/finalize`, {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify({ sessionId, signature }),
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return {
        score: Number(payload.score ?? 0),
        ratingDelta: Number(payload.ratingDelta ?? 0),
      };
    } catch {
      return null;
    }
  }
}

