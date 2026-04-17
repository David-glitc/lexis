"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../utils/supabase/client";
import { AuthService } from "../services/AuthService";
import { PresenceService } from "../services/PresenceService";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const supabase = createClient();
const authService = new AuthService(supabase);
const presenceService = new PresenceService(supabase);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatUserIdRef = useRef<string | null>(null);

  const refreshUser = async () => {
    const u = await authService.getUser();
    setUser(u);
  };

  useEffect(() => {
    let active = true;

    authService.getUser().then((resolvedUser) => {
      if (!active) return;
      setUser(resolvedUser);
      setLoading(false);
      if (resolvedUser) {
        heartbeatUserIdRef.current = resolvedUser.id;
        presenceService.startHeartbeat(resolvedUser.id);
      }
    });

    const { data: { subscription } } = authService.onAuthStateChange((nextUser) => {
      const currentHeartbeatUserId = heartbeatUserIdRef.current;
      if (currentHeartbeatUserId && currentHeartbeatUserId !== nextUser?.id) {
        presenceService.stopHeartbeat(currentHeartbeatUserId);
        heartbeatUserIdRef.current = null;
      }

      setUser(nextUser);

      if (nextUser && heartbeatUserIdRef.current !== nextUser.id) {
        heartbeatUserIdRef.current = nextUser.id;
        presenceService.startHeartbeat(nextUser.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (heartbeatUserIdRef.current) {
        presenceService.stopHeartbeat(heartbeatUserIdRef.current);
        heartbeatUserIdRef.current = null;
      }
    };
  }, []);

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
