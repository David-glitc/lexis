"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { useAuth } from "../../providers/AuthProvider";
import { AdminService, type AdminStats, type PuzzleLog } from "../../services/AdminService";
import type { UserProfile } from "../../services/ProfileService";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";

const supabase = createClient();
const adminService = new AdminService(supabase);

type Tab = "overview" | "users" | "puzzles" | "system";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1 font-body">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
  );
}

function OverviewTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <div className="text-zinc-500 text-sm">Loading...</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-white text-lg font-bold">Dashboard Overview</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active Today" value={stats.activeToday} />
        <StatCard label="Puzzles Played" value={stats.totalPuzzlesPlayed.toLocaleString()} />
        <StatCard label="Challenges" value={stats.totalChallenges} />
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="text-sm text-zinc-400 mb-1">Average Win Rate</div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${stats.averageWinRate}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-1">{stats.averageWinRate}%</div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    if (search.trim()) {
      const results = await adminService.searchUsers(search);
      setUsers(results);
      setTotal(results.length);
    } else {
      const result = await adminService.getUsers(page, 20);
      setUsers(result.users);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleResetStats(userId: string) {
    if (!confirm("Reset all stats for this user?")) return;
    await adminService.resetUserStats(userId);
    loadUsers();
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Permanently delete this user and all their data?")) return;
    await adminService.deleteUser(userId);
    loadUsers();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-lg font-bold">Users</h2>
        <span className="text-xs text-zinc-500">{total} total</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus-visible:border-emerald-400 transition-colors"
        placeholder="Search by name or email..."
      />

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading...</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-white text-sm font-medium">{user.display_name || "Unnamed"}</div>
                  <div className="text-xs text-zinc-500">{user.email}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  user.ranking_tier === "master" ? "border-purple-500/30 text-purple-400" :
                  user.ranking_tier === "diamond" ? "border-cyan-500/30 text-cyan-400" :
                  user.ranking_tier === "platinum" ? "border-slate-400/30 text-slate-300" :
                  user.ranking_tier === "gold" ? "border-yellow-500/30 text-yellow-400" :
                  user.ranking_tier === "silver" ? "border-zinc-400/30 text-zinc-300" :
                  user.ranking_tier === "bronze" ? "border-orange-500/30 text-orange-400" :
                  "border-zinc-700 text-zinc-500"
                }`}>
                  {user.ranking_tier}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                <div>
                  <div className="text-white">{user.puzzles_played}</div>
                  <div className="text-zinc-600">Played</div>
                </div>
                <div>
                  <div className="text-white">{user.win_rate}%</div>
                  <div className="text-zinc-600">Win Rate</div>
                </div>
                <div>
                  <div className="text-white">{user.current_streak}</div>
                  <div className="text-zinc-600">Streak</div>
                </div>
                <div>
                  <div className="text-white">{user.max_streak}</div>
                  <div className="text-zinc-600">Best</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResetStats(user.id)}
                  className="flex-1 text-xs py-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  Reset Stats
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="flex-1 text-xs py-1.5 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!search.trim() && total > 20 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-zinc-500">Page {page + 1}</span>
          <Button size="sm" variant="ghost" disabled={(page + 1) * 20 >= total} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function PuzzlesTab() {
  const [logs, setLogs] = useState<PuzzleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getPuzzleLogs(50).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-white text-lg font-bold">Recent Puzzle Activity</h2>
      {logs.length === 0 ? (
        <p className="text-zinc-500 text-sm">No puzzle logs yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-mono">{log.puzzle_word.toUpperCase()}</div>
                <div className="text-xs text-zinc-500">{log.mode} • {new Date(log.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${log.won ? "text-emerald-400" : "text-red-400"}`}>
                  {log.won ? "Won" : "Lost"}
                </div>
                <div className="text-xs text-zinc-500">{log.attempts} attempts</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemTab() {
  const [health, setHealth] = useState<{ database: boolean; auth: boolean; storage: boolean } | null>(null);

  useEffect(() => {
    adminService.getSystemHealth().then(setHealth);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-white text-lg font-bold">System Health</h2>
      {!health ? (
        <div className="text-zinc-500 text-sm">Checking...</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HealthDot ok={health.database} />
              <span className="text-white text-sm">Database</span>
            </div>
            <span className={`text-xs ${health.database ? "text-emerald-400" : "text-red-400"}`}>
              {health.database ? "Connected" : "Error"}
            </span>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HealthDot ok={health.auth} />
              <span className="text-white text-sm">Authentication</span>
            </div>
            <span className={`text-xs ${health.auth ? "text-emerald-400" : "text-red-400"}`}>
              {health.auth ? "Active" : "Error"}
            </span>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HealthDot ok={health.storage} />
              <span className="text-white text-sm">Storage</span>
            </div>
            <span className={`text-xs ${health.storage ? "text-emerald-400" : "text-red-400"}`}>
              {health.storage ? "Available" : "Error"}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <div className="text-sm text-white mb-2">Environment</div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Supabase URL</span>
          <span className="text-zinc-400 font-mono truncate ml-2 max-w-[200px]">
            {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "Not set"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Runtime</span>
          <span className="text-zinc-400">Next.js + Vercel</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      adminService.getAdminStats().then(setStats);
    }
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell
        header={
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">Admin Dashboard</span>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-white text-lg">Admin Access Required</div>
          <p className="text-zinc-500 text-sm text-center">Sign in with an admin account to access the dashboard.</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tabItems: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "puzzles", label: "Puzzles" },
    { key: "system", label: "System" }
  ];

  const tabs = tabItems.map((t) => (
    <button
      key={t.key}
      onClick={() => setTab(t.key)}
      className={`flex-1 text-xs py-2 rounded-lg transition-colors font-body font-medium ${
        tab === t.key
          ? "bg-white text-black"
          : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white"
      }`}
    >
      {t.label}
    </button>
  ));

  return (
    <AppShell
      header={
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">Admin Dashboard</span>
            <span className="text-[10px] px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono uppercase tracking-wider">Admin</span>
          </div>
          <div className="flex gap-1.5">{tabs}</div>
        </div>
      }
      sidebar={false}
    >
      <div className="pt-2">
        {tab === "overview" && <OverviewTab stats={stats} />}
        {tab === "users" && <UsersTab />}
        {tab === "puzzles" && <PuzzlesTab />}
        {tab === "system" && <SystemTab />}
      </div>
    </AppShell>
  );
}
