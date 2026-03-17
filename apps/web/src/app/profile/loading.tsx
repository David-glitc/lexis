"use client";

import { AppShell } from "../../components/layout/app-shell";
import { LoadingStack } from "../../components/ui/loading-stack";

export default function Loading() {
  return (
    <AppShell header={<div className="font-display text-lg font-bold text-white">Profile</div>}>
      <div className="pt-4">
        <LoadingStack rows={4} />
      </div>
    </AppShell>
  );
}

