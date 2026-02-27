'use client'

import { useCallback } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { VAULT_ABI } from '@/lib/contracts'

type Address = `0x${string}`

// ── Reads ──────────────────────────────────────────────────────────────────

/** Read collateral balance for a token in the vault. */
export function useGetCollateral(vault: Address | undefined, token: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'getCollateral',
    args: token ? [token] : undefined,
    query: { enabled: !!vault && !!token },
  })
}

/** Read debt balance for a token in the vault. */
export function useGetDebt(vault: Address | undefined, token: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'getDebt',
    args: token ? [token] : undefined,
    query: { enabled: !!vault && !!token },
  })
}

/** Check if the vault is in a defaulted state. */
export function useIsDefaulted(vault: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'isDefaulted',
    query: { enabled: !!vault },
  })
}

/** Read the vault owner address. */
export function useVaultOwner(vault: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'owner',
    query: { enabled: !!vault },
  })
}

// ── Writes ─────────────────────────────────────────────────────────────────

/**
 * Deposit ERC20 tokens into the vault.
 * Caller must have approved the vault to spend `amount` of `token` first.
 */
export function useDeposit(vault: Address | undefined) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const deposit = useCallback(
    (token: Address, amount: bigint) => {
      if (!vault) return
      writeContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [token, amount],
      })
    },
    [vault, writeContract],
  )

  return { deposit, hash, isPending, isConfirming, isSuccess, error }
}

/**
 * Borrow against collateral with a ZK proof.
 * Proof arrays follow Groth16 format: pA[2], pB[2][2], pC[2], pubSignals[].
 */
export function useBorrow(vault: Address | undefined) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const borrow = useCallback(
    (
      token: Address,
      amount: bigint,
      pA: readonly [bigint, bigint],
      pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
      pC: readonly [bigint, bigint],
      pubSignals: readonly bigint[],
    ) => {
      if (!vault) return
      writeContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: 'borrow',
        args: [token, amount, pA, pB, pC, [...pubSignals]],
      })
    },
    [vault, writeContract],
  )

  return { borrow, hash, isPending, isConfirming, isSuccess, error }
}

/**
 * Repay ERC20 debt to the vault.
 * Caller must have approved the vault to spend `amount` of `token` first.
 */
export function useRepay(vault: Address | undefined) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const repay = useCallback(
    (token: Address, amount: bigint) => {
      if (!vault) return
      writeContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: 'repay',
        args: [token, amount],
      })
    },
    [vault, writeContract],
  )

  return { repay, hash, isPending, isConfirming, isSuccess, error }
}

/** Withdraw collateral from the vault. Only the vault owner can call this. */
export function useWithdraw(vault: Address | undefined) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const withdraw = useCallback(
    (token: Address, amount: bigint) => {
      if (!vault) return
      writeContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [token, amount],
      })
    },
    [vault, writeContract],
  )

  return { withdraw, hash, isPending, isConfirming, isSuccess, error }
}
