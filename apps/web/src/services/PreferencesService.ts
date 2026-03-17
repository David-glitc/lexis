import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserPreferences {
  hard_mode: boolean;
  high_contrast: boolean;
  vibration: boolean;
  notify_challenges: boolean;
  notify_daily: boolean;
  hide_timer: boolean;
  music_enabled: boolean;
}

const DEFAULTS: UserPreferences = {
  hard_mode: false,
  high_contrast: false,
  vibration: false,
  notify_challenges: false,
  notify_daily: false,
  hide_timer: false,
  music_enabled: false,
};

export class PreferencesService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async get(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await this.client
        .from("profiles")
        .select("preferences")
        .eq("id", userId)
        .single();

      if (error || !data?.preferences) return { ...DEFAULTS };
      return { ...DEFAULTS, ...(data.preferences as Partial<UserPreferences>) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  async set(userId: string, prefs: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.get(userId);
      const merged = { ...current, ...prefs };
      await this.client
        .from("profiles")
        .update({ preferences: merged, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } catch {
      // DB unavailable
    }
  }

  async toggle(userId: string, key: keyof UserPreferences): Promise<boolean> {
    const current = await this.get(userId);
    const newValue = !current[key];
    await this.set(userId, { [key]: newValue });
    return newValue;
  }
}
