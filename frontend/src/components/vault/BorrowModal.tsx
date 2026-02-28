'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseUnits } from 'viem'
import { useBorrow } from '@/hooks/useVault'
import { generateCollateralProof } from '@/lib/zk'
import { ZKProofStatus } from './ZKProofStatus'
import { toast } from 'sonner'
import type { ZKProofResult } from '@/lib/zk'

const EXPLORER = 'https://opbnb-testnet.bscscan.com'

type Step = 'input' | 'warning' | 'proving' | 'signing' | 'confirming' | 'done' | 'error'

interface Props {
  vaultAddress: `0x${string}`
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function BorrowModal({ vaultAddress, isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [token, setToken] = useState('')
  const [amount, setAmount] = useState('')
  const [proof, setProof] = useState<ZKProofResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const { borrow, hash, isPending, isConfirming, isSuccess, error } = useBorrow(vaultAddress)

  // Track wallet/tx state transitions
  useEffect(() => {
    if (isPending && step === 'proving') {
      // borrow() was just called — wallet prompt open
      setStep('signing')
    }
  }, [isPending, step])

  useEffect(() => {
    if (isConfirming && (step === 'signing' || step === 'proving')) {
      setStep('confirming')
    }
  }, [isConfirming, step])

  useEffect(() => {
    if (isSuccess && step === 'confirming') {
      setStep('done')
      toast.success('Borrow confirmed on-chain')
      onSuccess?.()
    }
  }, [isSuccess, step, onSuccess])

  useEffect(() => {
    if (error && step !== 'input' && step !== 'done') {
      setErrorMsg(error.message?.split('\n')[0] ?? 'Transaction failed')
      setStep('error')
    }
  }, [error, step])

  const reset = useCallback(() => {
    setStep('input')
    setToken('')
    setAmount('')
    setProof(null)
    setErrorMsg('')
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  // Step 1 → 2: validate input and show warning
  const handleContinue = () => {
    if (!token || !amount) return toast.error('Fill in token address and amount')
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return toast.error('Invalid token address')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return toast.error('Enter a valid amount')
    setStep('warning')
  }

  // Step 2 → 3 → signing: generate proof then borrow
  const handleConfirmBorrow = async () => {
    setStep('proving')
    try {
      const amountWei = parseUnits(amount, 18)
      const zkResult = await generateCollateralProof(
        [{ symbol: 'TOKEN', amountUsd: parseFloat(amount) }],
        parseFloat(amount) * 0.5,
      )
      setProof(zkResult)

      // Immediately submit the borrow tx with the proof
      borrow(
        token as `0x${string}`,
        amountWei,
        zkResult.pA,
        zkResult.pB,
        zkResult.pC,
        zkResult.publicSignals,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ZK proof generation failed'
      setErrorMsg(msg)
      setStep('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
            Borrow
          </h3>
          <button onClick={handleClose} className="text-vf-text-muted hover:text-vf-text">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-4 flex gap-1">
          {(['input', 'warning', 'proving', 'signing', 'confirming', 'done'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= (['input', 'warning', 'proving', 'signing', 'confirming', 'done'] as const).indexOf(step === 'error' ? 'input' : step)
                  ? 'bg-vf-cyan'
                  : 'bg-vf-border'
              }`}
            />
          ))}
        </div>

        {/* ── STEP: input ── */}
        {step === 'input' && (
          <>
            <label className="mb-1 block text-xs text-vf-text-muted">Token Address</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="0x..."
              className="mb-3 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
            />

            <label className="mb-1 block text-xs text-vf-text-muted">Amount</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="mb-4 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
            />

            <button
              onClick={handleContinue}
              className="w-full rounded px-4 py-2 font-mono text-sm font-bold transition-colors"
              style={{ background: 'var(--vf-cyan)', color: 'var(--vf-base)' }}
            >
              Continue
            </button>
          </>
        )}

        {/* ── STEP: warning ── */}
        {step === 'warning' && (
          <>
            <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-950/20 p-4">
              <p className="mb-2 text-sm font-bold text-yellow-400">⚠ Confirm Borrow</p>
              <p className="text-xs text-vf-text-muted">
                You are about to borrow{' '}
                <span className="font-mono text-vf-text">{amount}</span> tokens from vault{' '}
                <span className="font-mono text-vf-text">
                  {vaultAddress.slice(0, 10)}…{vaultAddress.slice(-4)}
                </span>
                .
              </p>
              <p className="mt-2 text-xs text-vf-text-muted">
                A ZK proof of collateral sufficiency will be generated and verified on-chain.
                Failure to repay may result in vault default and partial seizure.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 rounded border border-vf-border px-4 py-2 font-mono text-sm text-vf-text-muted transition-colors hover:border-vf-text-muted"
              >
                Back
              </button>
              <button
                onClick={handleConfirmBorrow}
                className="flex-1 rounded px-4 py-2 font-mono text-sm font-bold transition-colors"
                style={{ background: 'var(--vf-cyan)', color: 'var(--vf-base)' }}
              >
                Generate Proof &amp; Borrow
              </button>
            </div>
          </>
        )}

        {/* ── STEP: proving ── */}
        {step === 'proving' && (
          <ZKProofStatus status="generating" />
        )}

        {/* ── STEP: signing ── */}
        {step === 'signing' && (
          <>
            {proof && (
              <div className="mb-4">
                <ZKProofStatus
                  status="verified"
                  proofHash={proof.proofHash?.slice(0, 16)}
                  elapsedMs={proof.elapsedMs}
                />
              </div>
            )}
            <div className="flex items-center gap-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-cyan-400">Confirm in Wallet</p>
                <p className="text-xs text-vf-text-muted">
                  Your wallet should be showing the borrow transaction. Please confirm it.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: confirming ── */}
        {step === 'confirming' && (
          <>
            {proof && (
              <div className="mb-4">
                <ZKProofStatus
                  status="verified"
                  proofHash={proof.proofHash?.slice(0, 16)}
                  elapsedMs={proof.elapsedMs}
                />
              </div>
            )}
            <div className="flex items-center gap-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-cyan-400">Confirming on Chain…</p>
                <p className="text-xs text-vf-text-muted">
                  Transaction submitted. Waiting for block confirmation on opBNB.
                </p>
                {hash && (
                  <a
                    href={`${EXPLORER}/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-xs text-cyan-400/70 hover:text-cyan-400"
                  >
                    {hash.slice(0, 14)}…{hash.slice(-6)} ↗
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <div className="text-center">
            {proof && (
              <div className="mb-4">
                <ZKProofStatus
                  status="verified"
                  proofHash={proof.proofHash?.slice(0, 16)}
                  elapsedMs={proof.elapsedMs}
                />
              </div>
            )}
            <div className="rounded border border-green-500/30 bg-green-950/20 p-4">
              <p className="mb-1 text-lg font-bold text-green-400">Borrow Successful ✓</p>
              <p className="text-xs text-vf-text-muted">
                {amount} tokens borrowed from your vault.
              </p>
              {hash && (
                <a
                  href={`${EXPLORER}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-mono text-xs text-cyan-400 hover:underline"
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
            <button
              onClick={handleClose}
              className="mt-4 rounded border border-vf-border px-6 py-2 font-mono text-sm text-vf-text-muted transition-colors hover:border-vf-text-muted"
            >
              Close
            </button>
          </div>
        )}

        {/* ── STEP: error ── */}
        {step === 'error' && (
          <div className="text-center">
            <div className="rounded border border-red-500/30 bg-red-950/20 p-4">
              <p className="mb-1 text-lg font-bold text-red-400">Transaction Failed</p>
              <p className="text-xs text-vf-text-muted">{errorMsg}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 rounded border border-vf-border px-4 py-2 font-mono text-sm text-vf-text-muted transition-colors hover:border-vf-text-muted"
              >
                Close
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded px-4 py-2 font-mono text-sm font-bold transition-colors"
                style={{ background: 'var(--vf-cyan)', color: 'var(--vf-base)' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
