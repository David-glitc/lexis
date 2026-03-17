"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "../components/global/GlobalToast";
import { PwaInstallPrompt } from "../components/global/PwaInstallPrompt";
import { CookieConsent } from "../components/global/CookieConsent";
import { NotificationPrompt } from "../components/global/NotificationPrompt";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <PwaInstallPrompt />
        <CookieConsent />
        <NotificationPrompt />
      </ToastProvider>
    </AuthProvider>
  );
}
