"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "../components/global/GlobalToast";
import { PwaInstallPrompt } from "../components/global/PwaInstallPrompt";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <PwaInstallPrompt />
      </ToastProvider>
    </AuthProvider>
  );
}
