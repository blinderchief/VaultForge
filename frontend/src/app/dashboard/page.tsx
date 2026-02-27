"use client";

import VaultHealthGauge from "@/components/vault/VaultHealthGauge";
import ZKProofBadge from "@/components/ui/ZKProofBadge";
import { useVaultHealth, type VaultHealth } from "@/hooks/useVaultHealth";
import { useState } from "react";

// Placeholder wallet — in production this comes from Privy
const DEMO_WALLET = "0x0000000000000000000000000000000000000001";

function ltvToHealthScore(ltvBps: number): number {
  // 0 bps → 100 score, 9000 bps → 0 score
  return Math.max(0, Math.round(100 - (ltvBps / 9000) * 100));
}

function VaultCard({ vault }: { vault: VaultHealth }) {
  const score = ltvToHealthScore(vault.current_ltv_bps);
  const deposited = BigInt(vault.total_deposited || "0");
  const borrowed = BigInt(vault.total_borrowed || "0");

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-[family-name:var(--font-syne)] text-sm font-bold text-vf-text">
              Vault
            </span>
            <span className="font-mono text-xs text-vf-text-muted">
              {vault.id.slice(0, 8)}…
            </span>
            <ZKProofBadge status={vault.status === "active" ? "verified" : "pending"} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-vf-text-muted">Deposited</span>
              <p className="font-mono text-sm text-vf-text">
                {deposited.toLocaleString()} wei
              </p>
            </div>
            <div>
              <span className="text-vf-text-muted">Borrowed</span>
              <p className="font-mono text-sm text-vf-text">
                {borrowed.toLocaleString()} wei
              </p>
            </div>
            <div>
              <span className="text-vf-text-muted">LTV</span>
              <p className="font-mono text-sm text-vf-text">
                {(vault.current_ltv_bps / 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-vf-text-muted">Status</span>
              <p className="font-mono text-sm capitalize text-vf-text">
                {vault.status}
              </p>
            </div>
          </div>
        </div>
        <VaultHealthGauge score={score} size={100} />
      </div>
    </div>
  );
}

interface AgentAction {
  id: string;
  action_type: string;
  status: string;
  created_at: string;
}

function AgentFeed() {
  // Static demo data — would come from Supabase Realtime in production
  const actions: AgentAction[] = [
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
  const [wallet] = useState(DEMO_WALLET);
  const { vaults, loading } = useVaultHealth(wallet);

  return (
    <div className="min-h-screen bg-vf-base p-6">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-vf-text">
          Dashboard
        </h1>
        <p className="mt-1 font-mono text-xs text-vf-text-muted">
          {wallet.slice(0, 6)}…{wallet.slice(-4)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vault grid */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-bold text-vf-text">
            Your Vaults
          </h2>
          {loading ? (
            <div className="glass-card flex h-40 items-center justify-center">
              <span className="font-mono text-sm text-vf-text-muted animate-pulse">
                Loading…
              </span>
            </div>
          ) : vaults.length === 0 ? (
            <div className="glass-card flex h-40 flex-col items-center justify-center gap-3">
              <span className="font-mono text-sm text-vf-text-muted">No vaults yet</span>
              <a
                href="/vault/create"
                className="rounded border border-vf-cyan px-4 py-2 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10"
              >
                Create Vault
              </a>
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
