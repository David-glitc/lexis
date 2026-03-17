"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error_description") || params.get("error");

      if (errorParam) {
        setError(errorParam);
        setTimeout(() => router.replace("/login"), 3000);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }
      }

      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }

      router.replace("/play");
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-red-400 text-sm text-center font-body max-w-xs">{error}</div>
        <p className="text-zinc-500 text-xs font-body">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-zinc-500 text-xs font-body">Signing you in...</p>
    </div>
  );
}
