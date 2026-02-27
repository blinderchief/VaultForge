'use client'

import { useCallback } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { VAULT_FACTORY_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts'

// ── Reads ──────────────────────────────────────────────────────────────────

/** Look up the vault clone address for a given user. Returns 0x0 if none. */
export function useGetVault(user: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.VaultFactory,
    abi: VAULT_FACTORY_ABI,
    functionName: 'getVault',
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  })
}

/** Total number of vault clones deployed by the factory. */
export function useTotalVaults() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.VaultFactory,
    abi: VAULT_FACTORY_ABI,
    functionName: 'totalVaults',
  })
}

// ── Writes ─────────────────────────────────────────────────────────────────

/** Deploy a new vault clone for the connected wallet. */
export function useDeployVault() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deploy = useCallback(
    (ownerAddress: `0x${string}`) => {
      writeContract({
        address: CONTRACT_ADDRESSES.VaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: 'deployVault',
        args: [ownerAddress],
      })
    },
    [writeContract],
  )

  return { deploy, hash, isPending, isConfirming, isSuccess, error }
}
