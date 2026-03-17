"use client";

import { AppShell } from "../../components/layout/app-shell";
import { LoadingStack } from "../../components/ui/loading-stack";

export default function Loading() {
  return (
    <AppShell header={<div className="font-display text-lg font-bold text-white">About</div>}>
      <div className="pt-4">
        <LoadingStack rows={2} />
      </div>
    </AppShell>
  );
}

