import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getPublicSiteUrl } from "../utils/site-url";

export class AuthService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async sendOtp(email: string): Promise<{ error: string | null }> {
    const emailRedirectTo = `${getPublicSiteUrl()}/auth/callback`;
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo }
    });
    return { error: error?.message ?? null };
  }

  async verifyOtp(email: string, token: string): Promise<{ error: string | null }> {
    const { error } = await this.client.auth.verifyOtp({
      email,
      token,
      type: "email"
    });
    return { error: error?.message ?? null };
  }

  async signInWithGoogle(redirectTo?: string): Promise<{ error: string | null }> {
    const resolvedRedirectTo = redirectTo ?? `${getPublicSiteUrl()}/auth/callback`;
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: resolvedRedirectTo }
    });
    return { error: error?.message ?? null };
  }

  async signInWithEthereum(): Promise<{ error: string | null }> {
    try {
      const { data, error } = await (this.client.auth as any).signInWithWeb3({
        chain: "ethereum",
        statement: "Sign in to Lexis — The Infinite Word Puzzle Arena"
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      if (typeof window !== "undefined" && !(window as any).ethereum) {
        return { error: "No Ethereum wallet detected. Install MetaMask or another wallet extension." };
      }
      return { error: err?.message ?? "Web3 sign-in failed" };
    }
  }

  async signInWithSolana(): Promise<{ error: string | null }> {
    try {
      const { data, error } = await (this.client.auth as any).signInWithWeb3({
        chain: "solana",
        statement: "Sign in to Lexis — The Infinite Word Puzzle Arena"
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      if (typeof window !== "undefined" && !(window as any).solana) {
        return { error: "No Solana wallet detected. Install Phantom or another wallet extension." };
      }
      return { error: err?.message ?? "Web3 sign-in failed" };
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getUser(): Promise<User | null> {
    const { data } = await this.client.auth.getUser();
    return data.user;
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
}
