"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "../components/global/GlobalToast";

const PwaInstallPrompt = dynamic(
  () => import("../components/global/PwaInstallPrompt").then((mod) => mod.PwaInstallPrompt),
  { ssr: false }
);
const CookieConsent = dynamic(
  () => import("../components/global/CookieConsent").then((mod) => mod.CookieConsent),
  { ssr: false }
);
const NotificationPrompt = dynamic(
  () => import("../components/global/NotificationPrompt").then((mod) => mod.NotificationPrompt),
  { ssr: false }
);
const EngagementNotifications = dynamic(
  () => import("../components/global/EngagementNotifications").then((mod) => mod.EngagementNotifications),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <PwaInstallPrompt />
        <CookieConsent />
        <NotificationPrompt />
        <EngagementNotifications />
      </ToastProvider>
    </AuthProvider>
  );
}
