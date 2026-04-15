"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  const refreshUser = async () => {
    const u = await authService.getUser();
    setUser(u);
  };

  useEffect(() => {
    authService.getUser().then((u) => {
      setUser(u);
      setLoading(false);
      if (u) presenceService.startHeartbeat(u.id);
    });

    const { data: { subscription } } = authService.onAuthStateChange((u) => {
      if (!u && user) {
        presenceService.stopHeartbeat(user.id);
      }
      setUser(u);
      if (u) presenceService.startHeartbeat(u.id);
    });

    return () => {
      subscription.unsubscribe();
      if (user) presenceService.stopHeartbeat(user.id);
    };
  }, [user]);

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
