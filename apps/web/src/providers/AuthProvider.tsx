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
  const userRef = useRef<User | null>(null);

  const refreshUser = async () => {
    const u = await authService.getUser();
    const current = userRef.current;
    const sameIdentity = current?.id === u?.id && current?.email === u?.email;
    if (sameIdentity) return;
    userRef.current = u;
    setUser(u);
  };

  useEffect(() => {
    let active = true;

    authService.getUser().then((resolvedUser) => {
      if (!active) return;
      userRef.current = resolvedUser;
      setUser(resolvedUser);
      setLoading(false);
      if (resolvedUser) {
        heartbeatUserIdRef.current = resolvedUser.id;
        presenceService.startHeartbeat(resolvedUser.id);
      }
    });

    const { data: { subscription } } = authService.onAuthStateChange((nextUser) => {
      const previousUser = userRef.current;
      const sameIdentity = previousUser?.id === nextUser?.id && previousUser?.email === nextUser?.email;
      const currentHeartbeatUserId = heartbeatUserIdRef.current;
      if (currentHeartbeatUserId && currentHeartbeatUserId !== nextUser?.id) {
        presenceService.stopHeartbeat(currentHeartbeatUserId);
        heartbeatUserIdRef.current = null;
      }

      userRef.current = nextUser;
      if (!sameIdentity) {
        setUser(nextUser);
      }

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
    userRef.current = null;
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
