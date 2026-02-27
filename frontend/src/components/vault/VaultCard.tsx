'use client'

import { useState } from 'react'
import { useIsDefaulted } from '@/hooks/useVault'
import VaultHealthGauge from './VaultHealthGauge'
import ZKProofBadge from '@/components/ui/ZKProofBadge'
import { BorrowModal } from './BorrowModal'
import { RepayModal } from './RepayModal'
import type { VaultRow } from '@/hooks/useUserVaults'

const EXPLORER = 'https://opbnb-testnet.bscscan.com'

function ltvBpsToHealthScore(bps: number): number {
  // 0 bps → 100 score, 9000 bps → 0 score
  return Math.max(0, Math.round(100 - (bps / 9000) * 100))
}

export function VaultCard({ vault }: { vault: VaultRow }) {
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [repayOpen, setRepayOpen] = useState(false)

  const vaultAddr = vault.vault_contract_address as `0x${string}` | undefined

  // Read on-chain defaulted state
  const { data: defaulted } = useIsDefaulted(vaultAddr ?? undefined)

  const displayLTV = vault.current_ltv_bps / 100
  const healthScore = ltvBpsToHealthScore(vault.current_ltv_bps)
  const deposited = BigInt(vault.total_deposited || '0')
  const borrowed = BigInt(vault.total_borrowed || '0')

  return (
    <>
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
                  {displayLTV.toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-vf-text-muted">Status</span>
                <p className="font-mono text-sm capitalize text-vf-text">
                  {defaulted ? 'defaulted' : vault.status}
                </p>
              </div>
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
          />
          <RepayModal
            vaultAddress={vaultAddr}
            isOpen={repayOpen}
            onClose={() => setRepayOpen(false)}
          />
        </>
      )}
    </>
  )
}
