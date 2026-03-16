"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../providers/AuthProvider";
import { AppShell } from "../../components/layout/app-shell";
import { createClient } from "../../utils/supabase/client";
import { ProfileService, type UserProfile } from "../../services/ProfileService";
import { MusicToggle } from "../../components/global/MusicPlayer";
import { useToast } from "../../components/global/GlobalToast";

const supabase = createClient();
const profileService = new ProfileService(supabase);

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-[#538d4e]" : "bg-white/[0.08]"}`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function getAuthMethod(user: { app_metadata?: Record<string, unknown> } | null): string {
  const provider = user?.app_metadata?.provider as string | undefined;
  if (!provider) return "Unknown";
  if (provider === "email") return "Email OTP";
  if (provider === "google") return "Google";
  if (provider === "ethereum" || provider === "web3_ethereum") return "Ethereum";
  if (provider === "solana" || provider === "web3_solana") return "Solana";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hardMode, setHardMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [notifyChallenges, setNotifyChallenges] = useState(false);
  const [notifyDaily, setNotifyDaily] = useState(false);

  useEffect(() => {
    if (!user) return;
    profileService.getProfile(user.id).then((p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.display_name || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
      }
    });
  }, [user]);

  useEffect(() => {
    setHardMode(localStorage.getItem("lexis_hard_mode") === "1");
    setHighContrast(localStorage.getItem("lexis_high_contrast") === "1");
    setVibration(localStorage.getItem("lexis_vibration") === "1");
    setNotifyChallenges(localStorage.getItem("lexis_notify_challenges") === "1");
    setNotifyDaily(localStorage.getItem("lexis_notify_daily") === "1");
  }, []);

  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const timer = setTimeout(() => {
      profileService.isUsernameAvailable(username.toLowerCase()).then((available) => {
        setUsernameAvailable(available);
        setCheckingUsername(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [username, profile?.username]);

  function togglePref(key: string, value: boolean, setter: (v: boolean) => void) {
    setter(value);
    localStorage.setItem(key, value ? "1" : "0");
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await profileService.upsertProfile({
        id: user.id,
        display_name: displayName.trim(),
        bio: bio.trim(),
      });
      if (username && username !== profile?.username) {
        const { error } = await profileService.setUsername(user.id, username.toLowerCase());
        if (error) {
          toast(error, { type: "error" });
          setSaving(false);
          return;
        }
      }
      const updated = await profileService.getProfile(user.id);
      if (updated) setProfile(updated);
      toast("Profile saved", { type: "success" });
    } catch {
      toast("Failed to save profile", { type: "error" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AppShell header={<span className="font-display text-lg font-bold text-white">Settings</span>}>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell header={<span className="font-display text-lg font-bold text-white">Settings</span>}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-zinc-400 font-body text-sm">Sign in to access settings</p>
          <Link
            href="/login"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:scale-[1.02] active:scale-95 transition-transform font-body"
          >
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  const authMethod = getAuthMethod(user);

  return (
    <AppShell header={<span className="font-display text-lg font-bold text-white">Settings</span>}>
      <div className="space-y-5 pb-10">
        {/* Profile */}
        <SectionCard title="Profile">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-body text-zinc-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-body placeholder:text-zinc-600"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-zinc-400 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  maxLength={20}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-10 py-3 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-mono placeholder:text-zinc-600"
                  placeholder="username"
                />
                {username && username !== profile?.username && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : usernameAvailable === true ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : usernameAvailable === false ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : null}
                  </span>
                )}
              </div>
              {username && !/^[a-z0-9_]{3,20}$/.test(username) && (
                <p className="text-xs text-red-400 font-body mt-1">3-20 characters, a-z, 0-9, underscores only</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-body text-zinc-400 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-body placeholder:text-zinc-600 resize-none"
                placeholder="Tell the arena about yourself..."
              />
              <p className="text-xs text-zinc-600 font-mono text-right">{bio.length}/160</p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-3 bg-white text-black font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 font-body"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </SectionCard>

        {/* Account */}
        <SectionCard title="Account">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-zinc-400">Email</span>
              <span className="text-sm font-mono text-white">{user.email || "Web3 Wallet"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-zinc-400">Auth Method</span>
              <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-xs font-mono text-zinc-300">
                {authMethod}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-zinc-400">Stats & Profile</span>
              <Link href="/profile" className="text-sm font-body text-[#6abf5e] hover:underline">
                View full profile →
              </Link>
            </div>
            <button
              onClick={signOut}
              className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-full text-sm hover:bg-red-500/20 transition-colors font-body"
            >
              Sign Out
            </button>
          </div>
        </SectionCard>

        {/* Game Preferences */}
        <SectionCard title="Game Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-white">Hard Mode</p>
                <p className="text-xs font-body text-zinc-500">Revealed hints must be used in subsequent guesses</p>
              </div>
              <Toggle enabled={hardMode} onChange={(v) => togglePref("lexis_hard_mode", v, setHardMode)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-white">Music</p>
                <p className="text-xs font-body text-zinc-500">Ambient arena soundtrack</p>
              </div>
              <MusicToggle />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-white">High Contrast</p>
                <p className="text-xs font-body text-zinc-500">Improved color accessibility</p>
              </div>
              <Toggle enabled={highContrast} onChange={(v) => togglePref("lexis_high_contrast", v, setHighContrast)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-white">Keyboard Vibration</p>
                <p className="text-xs font-body text-zinc-500">Haptic feedback on key press</p>
              </div>
              <Toggle enabled={vibration} onChange={(v) => togglePref("lexis_vibration", v, setVibration)} />
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notifications">
          <div className="space-y-4">
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-body text-white">Challenge Notifications</p>
                  <p className="text-xs font-body text-zinc-500">When someone challenges you</p>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-500 uppercase">Coming soon</span>
              </div>
              <Toggle enabled={notifyChallenges} onChange={(v) => togglePref("lexis_notify_challenges", v, setNotifyChallenges)} />
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-body text-white">Daily Reminder</p>
                  <p className="text-xs font-body text-zinc-500">Remind me to play the daily puzzle</p>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-500 uppercase">Coming soon</span>
              </div>
              <Toggle enabled={notifyDaily} onChange={(v) => togglePref("lexis_notify_daily", v, setNotifyDaily)} />
            </div>
          </div>
        </SectionCard>

        {/* Data */}
        <SectionCard title="Data">
          <div className="space-y-3">
            <button
              onClick={() => toast("Export coming soon", { type: "info" })}
              className="w-full py-3 bg-white/[0.04] text-white border border-white/[0.08] font-medium rounded-full text-sm hover:bg-white/[0.08] transition-colors font-body"
            >
              Export My Data
            </button>
            <button
              onClick={() => toast("Contact support to delete your account", { type: "info" })}
              className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-medium rounded-full text-sm hover:bg-red-500/20 transition-colors font-body"
            >
              Delete Account
            </button>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
