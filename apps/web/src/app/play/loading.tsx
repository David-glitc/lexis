"use client";

import { AppShell } from "../../components/layout/app-shell";
import { LoadingStack } from "../../components/ui/loading-stack";

export default function Loading() {
  return (
    <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Play</h1>} sidebar={false}>
      <div className="pt-4">
        <LoadingStack rows={4} />
      </div>
    </AppShell>
  );
}

