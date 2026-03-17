"use client";

import { AppShell } from "../../components/layout/app-shell";
import { LoadingStack } from "../../components/ui/loading-stack";

export default function Loading() {
  return (
    <AppShell header={<h1 className="font-display text-lg font-bold tracking-wide text-white">Leaderboard</h1>}>
      <div className="pt-4">
        <LoadingStack rows={6} />
      </div>
    </AppShell>
  );
}

