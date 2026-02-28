'use client'

import { useState, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { useIsDefaulted } from '@/hooks/useVault'
import { VAULT_ABI } from '@/lib/contracts'
import VaultHealthGauge from './VaultHealthGauge'
import ZKProofBadge from '@/components/ui/ZKProofBadge'
import { BorrowModal } from './BorrowModal'
import { RepayModal } from './RepayModal'
import type { VaultRow } from '@/hooks/useUserVaults'

const EXPLORER = 'https://opbnb-testnet.bscscan.com'
// TestUSDC on opBNB testnet — the primary collateral/borrow token
const TUSDC_ADDRESS = '0x51795Ef0e9d2B37A89F077a2E2832ae4fd9764bE' as `0x${string}`

function ltvBpsToHealthScore(bps: number): number {
  return Math.max(0, Math.round(100 - (bps / 9000) * 100))
}

function formatTokenAmount(wei: bigint): string {
  const formatted = formatUnits(wei, 18)
  const num = parseFloat(formatted)
  if (num === 0) return '0'
  if (num < 0.01) return '<0.01'
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function VaultCard({ vault }: { vault: VaultRow }) {
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [repayOpen, setRepayOpen] = useState(false)

  const vaultAddr = vault.vault_contract_address as `0x${string}` | undefined

  // Read on-chain state directly
  const { data: defaulted } = useIsDefaulted(vaultAddr ?? undefined)

  const { data: onChainCollateral, refetch: refetchCollateral } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'collateral',
    args: [TUSDC_ADDRESS],
    query: { enabled: !!vaultAddr },
  })

  const { data: onChainDebt, refetch: refetchDebt } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'debt',
    args: [TUSDC_ADDRESS],
    query: { enabled: !!vaultAddr },
  })

  const deposited = (onChainCollateral as bigint) ?? BigInt(0)
  const borrowed = (onChainDebt as bigint) ?? BigInt(0)

  // Compute LTV from on-chain data
  const ltvBps = deposited > BigInt(0)
    ? Number((borrowed * BigInt(10000)) / deposited)
    : 0
  const displayLTV = ltvBps / 100
  const healthScore = ltvBpsToHealthScore(ltvBps)

  // Refetch on-chain data after a tx succeeds
  const handleTxSuccess = useCallback(() => {
    refetchCollateral()
    refetchDebt()
  }, [refetchCollateral, refetchDebt])

  return (
    <>
      <div className="glass-card-hover p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-[family-name:var(--font-syne)] text-sm font-bold text-vf-text">
                Vault
              </span>
              <span className="font-mono text-xs text-vf-text-muted">
                {vault.id.slice(0, 8)}…
              </span>
              <ZKProofBadge status={vault.status === 'active' && !defaulted ? 'verified' : 'pending'} />
            </div>

            {vaultAddr && (
              <a
                href={`${EXPLORER}/address/${vaultAddr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 inline-block font-mono text-xs text-cyan-400/70 hover:text-cyan-400"
              >
                {vaultAddr.slice(0, 10)}…{vaultAddr.slice(-4)} ↗
              </a>
            )}

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-vf-text-muted">Deposited</span>
                <p className="truncate font-mono text-sm text-vf-text" title={`${deposited} wei`}>
                  {formatTokenAmount(deposited)} tUSDC
                </p>
              </div>
              <div>
                <span className="text-vf-text-muted">Borrowed</span>
                <p className="truncate font-mono text-sm text-vf-text" title={`${borrowed} wei`}>
                  {formatTokenAmount(borrowed)} tUSDC
                </p>
              </div>
              <div>
                <span className="text-vf-text-muted">Available</span>
                <p className="truncate font-mono text-sm text-cyan-400">
                  {formatTokenAmount(deposited > borrowed ? deposited - borrowed : BigInt(0))} tUSDC
                </p>
              </div>
              <div>
                <span className="text-vf-text-muted">LTV</span>
                <p className={`font-mono text-sm ${displayLTV > 75 ? 'text-yellow-400' : displayLTV > 90 ? 'text-red-400' : 'text-vf-text'}`}>
                  {displayLTV.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-1 text-xs text-vf-text-muted">
              {defaulted ? (
                <span className="text-red-400">Vault defaulted</span>
              ) : vault.status === 'active' ? (
                <span className="capitalize text-green-400/70">Active</span>
              ) : (
                <span className="capitalize">{vault.status}</span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setBorrowOpen(true)}
                disabled={!vaultAddr || !!defaulted}
                className="rounded border border-vf-cyan px-4 py-1.5 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Borrow
              </button>
              <button
                onClick={() => setRepayOpen(true)}
                disabled={!vaultAddr}
                className="rounded border border-vf-border px-4 py-1.5 font-mono text-xs text-vf-text-muted transition-colors hover:border-vf-text-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                Repay
              </button>
            </div>
          </div>
          <VaultHealthGauge score={healthScore} size={100} />
        </div>
      </div>

      {vaultAddr && (
        <>
          <BorrowModal
            vaultAddress={vaultAddr}
            isOpen={borrowOpen}
            onClose={() => setBorrowOpen(false)}
            onSuccess={handleTxSuccess}
          />
          <RepayModal
            vaultAddress={vaultAddr}
            isOpen={repayOpen}
            onClose={() => setRepayOpen(false)}
            onSuccess={handleTxSuccess}
          />
        </>
      )}
    </>
  )
}
