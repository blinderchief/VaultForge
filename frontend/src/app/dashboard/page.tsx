"use client";

import { useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { useUserVaults } from "@/hooks/useUserVaults";
import { VaultCard } from "@/components/vault/VaultCard";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
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
  const { data, isLoading } = useQuery({
    queryKey: ["agent-actions", walletAddress],
    queryFn: () => api.agentActions(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
    retry: 1,
  });

  const actions = data?.actions ?? [];

  return (
    <div className="glass-card p-5">
      <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-bold text-vf-text">
        Agent Feed
      </h2>
      <div className="space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-full rounded bg-vf-surface-2" />
            <div className="h-6 w-full rounded bg-vf-surface-2" />
          </div>
        ) : actions.length === 0 ? (
          <p className="text-xs text-vf-text-muted">No agent actions yet</p>
        ) : (
          actions.map((a) => (
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
          ))
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
