import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export type PresenceStatus = "offline" | "online" | "idle" | "playing";

export class PresenceService {
  private client: SupabaseClient;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private channel: RealtimeChannel | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async updatePresence(userId: string, status: PresenceStatus): Promise<void> {
    await this.client.from("user_presence").upsert({
      user_id: userId,
      status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  startHeartbeat(userId: string): void {
    if (this.heartbeatHandle) clearInterval(this.heartbeatHandle);
    this.updatePresence(userId, "online").catch(() => {});
    this.heartbeatHandle = setInterval(() => {
      this.updatePresence(userId, "online").catch(() => {});
    }, 20_000);
  }

  stopHeartbeat(userId: string): void {
    if (this.heartbeatHandle) clearInterval(this.heartbeatHandle);
    this.heartbeatHandle = null;
    this.updatePresence(userId, "offline").catch(() => {});
  }

  subscribe(onChange: () => void): () => void {
    this.channel = this.client
      .channel("presence-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        onChange();
      })
      .subscribe();

    return () => {
      if (this.channel) {
        this.client.removeChannel(this.channel);
      }
      this.channel = null;
    };
  }
}

