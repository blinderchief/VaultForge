"use client";

import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useUserVaults } from "@/hooks/useUserVaults";
import { VaultCard } from "@/components/vault/VaultCard";
import Link from "next/link";

function SkeletonCard() {
  return (
    <div className="glass-card animate-pulse p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded bg-vf-surface-2" />
          <div className="h-3 w-40 rounded bg-vf-surface-2" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-8 rounded bg-vf-surface-2" />
            <div className="h-8 rounded bg-vf-surface-2" />
            <div className="h-8 rounded bg-vf-surface-2" />
            <div className="h-8 rounded bg-vf-surface-2" />
          </div>
        </div>
        <div className="h-[100px] w-[100px] rounded-full bg-vf-surface-2" />
      </div>
    </div>
  );
}

function AgentFeed() {
  const actions = [
    { id: "1", action_type: "rebalance", status: "completed", created_at: "2026-02-26T10:30:00Z" },
    { id: "2", action_type: "optimize_ltv", status: "proposed", created_at: "2026-02-26T10:25:00Z" },
    { id: "3", action_type: "risk_alert", status: "completed", created_at: "2026-02-26T10:20:00Z" },
  ];

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-bold text-vf-text">
        Agent Feed
      </h2>
      <div className="space-y-3">
        {actions.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-vf-border pb-2 last:border-0">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{
                background: a.status === "completed" ? "var(--vf-green)" : "var(--vf-amber)",
              }} />
              <span className="font-mono text-xs text-vf-text">{a.action_type}</span>
            </div>
            <span className="font-mono text-xs text-vf-text-muted">
              {new Date(a.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { authenticated } = usePrivy();

  // Pass REAL wallet address — never hardcoded
  const { vaults, isLoading } = useUserVaults(address);

  if (!authenticated || !isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vf-base p-6">
        <div className="glass-card flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-4xl">🔐</span>
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
            Connect your wallet
          </h2>
          <p className="text-sm text-vf-text-muted">
            Connect to see your vaults and start borrowing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vf-base p-6">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-vf-text">
          Dashboard
        </h1>
        <p className="mt-1 font-mono text-xs text-vf-text-muted">
          {address!.slice(0, 6)}…{address!.slice(-4)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vault grid */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-bold text-vf-text">
            Your Vaults
          </h2>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : vaults.length === 0 ? (
            <div className="glass-card flex h-40 flex-col items-center justify-center gap-3">
              <span className="text-2xl">➕</span>
              <span className="font-mono text-sm text-vf-text-muted">No vaults yet</span>
              <p className="text-xs text-vf-text-muted">
                Create your first ZK-private vault to start borrowing
              </p>
              <Link
                href="/vault/create"
                className="rounded border border-vf-cyan px-4 py-2 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10"
              >
                Create Vault →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vaults.map((v) => (
                <VaultCard key={v.id} vault={v} />
              ))}
            </div>
          )}
        </div>

        {/* Agent feed sidebar */}
        <div>
          <AgentFeed />
        </div>
      </div>
    </div>
  );
}
