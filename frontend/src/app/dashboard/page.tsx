"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { useUserVaults } from "@/hooks/useUserVaults";
import { VaultCard } from "@/components/vault/VaultCard";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { VAULT_FACTORY_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";

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

function AgentFeed({ walletAddress }: { walletAddress?: string }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-actions", walletAddress],
    queryFn: () => api.agentActions(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const actions = data?.actions ?? [];

  const handleRunAgent = useCallback(async () => {
    setRunning(true);
    setRunError("");
    try {
      await api.triggerAgentRun();
      // Refresh the feed after a short delay for DB write
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["agent-actions", walletAddress] });
      }, 1500);
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : "Agent run failed");
    } finally {
      setRunning(false);
    }
  }, [walletAddress, queryClient]);

  const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
    optimize_ltv: { icon: "⚡", label: "LTV Optimization" },
    health_check: { icon: "💚", label: "Health Check" },
    rebalance: { icon: "⚖️", label: "Rebalance" },
    alert: { icon: "🚨", label: "Alert" },
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: "var(--vf-green, #22c55e)",
    proposed: "var(--vf-cyan, #06b6d4)",
    approved: "var(--vf-cyan, #06b6d4)",
    executing: "var(--vf-amber, #f59e0b)",
    failed: "#ef4444",
    rejected: "#6b7280",
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-syne)] text-base font-bold text-vf-text">
          Agent Feed
        </h2>
        <button
          onClick={handleRunAgent}
          disabled={running}
          className="rounded border border-vf-cyan/40 px-3 py-1 font-mono text-xs text-vf-cyan transition-all hover:bg-vf-cyan/10 disabled:opacity-50"
        >
          {running ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-vf-cyan border-t-transparent" />
              Analysing…
            </span>
          ) : (
            "Run Analysis"
          )}
        </button>
      </div>

      {runError && (
        <div className="mb-3 rounded border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-400">
          {runError}
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-full rounded bg-vf-surface-2" />
            <div className="h-6 w-full rounded bg-vf-surface-2" />
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-2xl">🤖</span>
            <p className="text-xs text-vf-text-muted">No agent actions yet</p>
            <p className="text-xs text-vf-text-muted/60">
              Click &quot;Run Analysis&quot; to trigger an AI-powered vault scan
            </p>
          </div>
        ) : (
          actions.map((a) => {
            const meta = ACTION_LABELS[a.action_type] ?? { icon: "📋", label: a.action_type };
            return (
              <div
                key={a.id}
                className="rounded border border-vf-border/50 bg-vf-surface/30 px-3 py-2 transition-colors hover:border-vf-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: STATUS_COLORS[a.status] ?? "#6b7280" }}
                    />
                    <span className="text-sm">
                      {meta.icon}
                    </span>
                    <span className="font-mono text-xs text-vf-text">{meta.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-vf-text-muted">
                    {new Date(a.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-vf-text-muted/70 capitalize">
                    {a.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { authenticated } = usePrivy();

  // Pass REAL wallet address — never hardcoded
  const { vaults, isLoading, refetch } = useUserVaults(address);

  // Also check on-chain if this wallet has a vault (fallback if backend is out of sync)
  const { data: onChainVault } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultFactory,
    abi: VAULT_FACTORY_ABI,
    functionName: "getVault",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const onChainVaultAddress = onChainVault as `0x${string}` | undefined;
  const hasOnChainVault =
    !!onChainVaultAddress &&
    onChainVaultAddress !== "0x0000000000000000000000000000000000000000";

  // If on-chain vault exists but backend doesn't know, sync it
  const syncAttempted = useRef(false);
  useEffect(() => {
    if (
      hasOnChainVault &&
      !isLoading &&
      vaults.length === 0 &&
      address &&
      !syncAttempted.current
    ) {
      syncAttempted.current = true;
      api
        .createVault({
          wallet_address: address,
          chain_id: 5611,
          vault_contract_address: onChainVaultAddress!,
          total_deposited: "0",
        })
        .then(() => refetch?.())
        .catch(() => {}); // non-fatal
    }
  }, [hasOnChainVault, isLoading, vaults.length, address, onChainVaultAddress, refetch]);

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
            hasOnChainVault ? (
              <div className="glass-card flex h-40 flex-col items-center justify-center gap-3">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <span className="font-mono text-sm text-vf-text-muted">
                  Syncing vault from chain…
                </span>
                <p className="font-mono text-xs text-cyan-400/70">
                  {onChainVaultAddress!.slice(0, 10)}…{onChainVaultAddress!.slice(-4)}
                </p>
              </div>
            ) : (
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
            )
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
          <AgentFeed walletAddress={address} />
        </div>
      </div>
    </div>
  );
}
