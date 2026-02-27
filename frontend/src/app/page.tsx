"use client";

import { useQuery } from "@tanstack/react-query";
import { WalletButton } from "@/components/wallet/WalletButton";
import { api } from "@/lib/api";

/* ── Live protocol stats from backend /metrics ────────────────────── */
function LiveStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: api.metrics,
    staleTime: 60_000,
    retry: 1,
  });

  const stats = [
    {
      label: "Total Value Locked",
      value: data ? `$${data.tvl.toLocaleString()}` : "--",
    },
    {
      label: "Active Vaults",
      value: data ? data.active_vaults.toString() : "--",
    },
    {
      label: "Avg LTV",
      value: data ? `${data.avg_ltv.toFixed(1)}%` : "--",
    },
    {
      label: "vs Venus Static",
      value: "150%",
    },
  ];

  return (
    <div className="mb-8 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded border border-vf-border bg-vf-surface/40 p-3 text-center"
        >
          <span
            className={`block font-mono text-lg font-bold text-vf-cyan ${
              isLoading ? "animate-pulse" : ""
            }`}
          >
            {isLoading ? "…" : stat.value}
          </span>
          <span className="block text-[10px] text-vf-text-muted">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-vf-base p-6">
      <h1 className="mb-3 font-[family-name:var(--font-syne)] text-4xl font-bold text-vf-text">
        VaultForge
      </h1>
      <p className="mb-8 max-w-md text-center font-mono text-sm text-vf-text-muted">
        Non-custodial ZK-private intelligent collateral vaults on opBNB/BSC
      </p>
      <LiveStats />
      <div className="mb-6">
        <WalletButton />
      </div>
      <div className="flex gap-4">
        <a
          href="/dashboard"
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10"
        >
          Dashboard
        </a>
        <a
          href="/vault/create"
          className="rounded px-6 py-2 font-mono text-sm font-bold"
          style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
        >
          Create Vault
        </a>
      </div>
    </div>
  );
}
