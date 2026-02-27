"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface VaultHealth {
  id: string;
  status: string;
  total_deposited: string;
  total_borrowed: string;
  current_ltv_bps: number;
  wallet_address: string;
  vault_contract_address: string | null;
}

/**
 * Subscribe to real-time vault changes via Supabase Realtime.
 * Returns the latest vault state for the given wallet.
 */
export function useVaultHealth(walletAddress: string | undefined) {
  const [vaults, setVaults] = useState<VaultHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    const addr = walletAddress.toLowerCase();

    // Initial fetch
    supabase
      .from("vaults")
      .select("id, status, total_deposited, total_borrowed, current_ltv_bps, wallet_address, vault_contract_address")
      .eq("wallet_address", addr)
      .then(({ data }) => {
        if (data) setVaults(data as VaultHealth[]);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`vaults:${addr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vaults",
          filter: `wallet_address=eq.${addr}`,
        },
        (payload) => {
          const updated = payload.new as VaultHealth;
          setVaults((prev) => {
            const idx = prev.findIndex((v) => v.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress]);

  if (!walletAddress) {
    return { vaults: [], loading: false };
  }

  return { vaults, loading };
}
