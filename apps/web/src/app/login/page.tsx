"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { AuthService } from "../../services/AuthService";
import { ProfileService } from "../../services/ProfileService";
import { useAuth } from "../../providers/AuthProvider";
import { LexisLogo } from "../../components/ui/lexis-logo";

const supabase = createClient();
const authService = new AuthService(supabase);
const profileService = new ProfileService(supabase);

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function EthereumIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 1.5l-7 11.5 7 4 7-4-7-11.5z" fill="#627EEA" />
      <path d="M5 13l7 4 7-4-7 9.5L5 13z" fill="#627EEA" opacity="0.6" />
    </svg>
  );
}

function SolanaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 17.5h13.5l2.5-3H6.5L4 17.5z" fill="#9945FF" />
      <path d="M4 6.5h13.5l2.5 3H6.5L4 6.5z" fill="#14F195" />
      <path d="M4 12h13.5l2.5-1.5H6.5L4 12z" fill="#00C2FF" />
    </svg>
  );
}

function OtpInput({ length, value, onChange }: { length: number; value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(idx: number, char: string) {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("");
    arr[idx] = char;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (char && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border border-white/10 bg-white/[0.04] text-white outline-none focus:border-[#6abf5e] focus:bg-white/[0.06] transition-all"
        />
      ))}
    </div>
  );
}

function Web3Onboarding({ user, onComplete, onSkip }: {
  user: { id: string };
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const timer = setTimeout(() => {
      profileService.isUsernameAvailable(username).then((available) => {
        setUsernameAvailable(available);
        setCheckingUsername(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  async function handleContinue() {
    if (!displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await profileService.upsertProfile({
        id: user.id,
        display_name: displayName.trim(),
      });
      if (username) {
        const result = await profileService.setUsername(user.id, username);
        if (result.error) {
          setError(result.error);
          setSubmitting(false);
          return;
        }
      }
      onComplete();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center px-6 relative noise">
      <div className="orb w-[400px] h-[400px] bg-[#538d4e] top-[-100px] right-[-100px]" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <LexisLogo size={32} />
            <span className="font-display text-lg font-bold tracking-[0.15em] text-white">LEXIS</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Complete Your Profile</h1>
          <p className="text-sm text-zinc-400 font-body">Set up your arena identity</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-body text-zinc-400 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-body placeholder:text-zinc-600"
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-10 py-3.5 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-mono placeholder:text-zinc-600"
                placeholder="username"
              />
              {username && /^[a-z0-9_]{3,20}$/.test(username) && (
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

          {error && (
            <div className="text-sm text-center text-red-400 bg-red-500/10 rounded-xl p-3 border border-red-500/20 font-body">
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={submitting || !displayName.trim()}
            className="w-full py-3.5 bg-white text-black font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 font-body"
          >
            {submitting ? "Setting up..." : "Continue to Arena"}
          </button>
          <button
            onClick={onSkip}
            className="w-full text-xs text-zinc-500 hover:text-white transition-colors font-body py-2"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setNeedsOnboarding(null);
      return;
    }
    if (user.email) {
      setNeedsOnboarding(false);
      return;
    }
    profileService.getProfile(user.id).then((profile) => {
      setNeedsOnboarding(!profile?.username);
    });
  }, [user]);

  async function handleSendOtp() {
    if (!email.trim()) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await authService.sendOtp(email.trim());
    if (error) {
      setMessage(error);
    } else {
      setStep("otp");
      setMessage("A 6-digit code has been sent to your email.");
    }
    setSubmitting(false);
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await authService.verifyOtp(email.trim(), otpCode);
    if (error) {
      setMessage(error);
    }
    setSubmitting(false);
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    setMessage(null);
    const { error } = await authService.signInWithGoogle(`${window.location.origin}/auth/callback`);
    if (error) {
      setMessage(error);
      setSubmitting(false);
    }
  }

  async function handleEthereumLogin() {
    setSubmitting(true);
    setMessage(null);
    const { error } = await authService.signInWithEthereum();
    if (error) setMessage(error);
    setSubmitting(false);
  }

  async function handleSolanaLogin() {
    setSubmitting(true);
    setMessage(null);
    const { error } = await authService.signInWithSolana();
    if (error) setMessage(error);
    setSubmitting(false);
  }

  async function handleSignOut() {
    await authService.signOut();
    setStep("email");
    setOtpCode("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (user && needsOnboarding === true) {
    return (
      <Web3Onboarding
        user={user}
        onComplete={() => router.push("/play")}
        onSkip={() => router.push("/play")}
      />
    );
  }

  if (user && needsOnboarding === false) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center px-6 relative noise">
        <div className="orb w-[400px] h-[400px] bg-[#538d4e] top-[-100px] right-[-100px]" />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
              <LexisLogo size={32} />
              <span className="font-display text-lg font-bold tracking-[0.15em] text-white">LEXIS</span>
            </Link>
            <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-display font-bold text-white">
                {(user.email?.[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-zinc-400 font-body">{user.email ?? "Web3 Wallet Connected"}</p>
          </div>

          <div className="space-y-3">
            <Link href="/play">
              <button className="w-full py-3.5 bg-white text-black font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform font-body">
                Enter the Arena
              </button>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 bg-white/[0.06] text-white border border-white/10 font-medium rounded-full text-sm hover:bg-white/10 transition-colors font-body"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center px-6 relative noise">
      <div className="orb w-[500px] h-[500px] bg-[#538d4e] top-[-100px] left-[-200px]" />
      <div className="orb w-[300px] h-[300px] bg-[#b59f3b] bottom-[-50px] right-[-100px]" style={{ animationDelay: "8s" }} />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <LexisLogo size={32} />
            <span className="font-display text-lg font-bold tracking-[0.15em] text-white">LEXIS</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-white mb-2">Enter the Arena</h1>
          <p className="text-sm text-zinc-400 font-body">Sign in to track progress, compete, and train</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-white/10 bg-white/[0.04] text-white text-sm font-medium hover:bg-white/[0.08] transition-colors disabled:opacity-50 font-body mb-4"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleEthereumLogin}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-white/10 bg-white/[0.04] text-white text-xs font-medium hover:bg-white/[0.08] transition-colors disabled:opacity-50 font-body"
          >
            <EthereumIcon />
            Ethereum
          </button>
          <button
            onClick={handleSolanaLogin}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-white/10 bg-white/[0.04] text-white text-xs font-medium hover:bg-white/[0.08] transition-colors disabled:opacity-50 font-body"
          >
            <SolanaIcon />
            Solana
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#060606] px-3 text-zinc-500 font-mono">or use email</span>
          </div>
        </div>

        {step === "email" ? (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none focus:border-[#6abf5e] transition-colors font-body placeholder:text-zinc-600"
              placeholder="you@example.com"
            />
            <button
              onClick={handleSendOtp}
              disabled={submitting || !email.trim()}
              className="w-full py-3.5 bg-white text-black font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 font-body"
            >
              {submitting ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-center text-sm text-zinc-300 font-body">
              Enter the 6-digit code sent to<br />
              <span className="text-white font-medium">{email}</span>
            </p>
            <OtpInput length={6} value={otpCode} onChange={setOtpCode} />
            <button
              onClick={handleVerifyOtp}
              disabled={submitting || otpCode.length !== 6}
              className="w-full py-3.5 bg-white text-black font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 font-body"
            >
              {submitting ? "Verifying..." : "Verify & Sign In"}
            </button>
            <button
              onClick={() => { setStep("email"); setOtpCode(""); setMessage(null); }}
              className="w-full text-xs text-zinc-500 hover:text-white transition-colors font-body"
            >
              ← Use a different email
            </button>
          </div>
        )}

        {message && (
          <div className="mt-4 text-sm text-center text-zinc-300 bg-white/[0.04] rounded-xl p-3 border border-white/[0.06] font-body">
            {message}
          </div>
        )}

        <p className="text-[10px] text-center text-zinc-600 mt-8 font-body">
          By signing in, you agree to compete with honor.
        </p>
      </div>
    </div>
  );
}
