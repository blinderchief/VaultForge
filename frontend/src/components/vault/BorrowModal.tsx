'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { useBorrow } from '@/hooks/useVault'
import { VAULT_ABI } from '@/lib/contracts'
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

  const isValidToken = /^0x[a-fA-F0-9]{40}$/.test(token)
  const tokenAddr = isValidToken ? (token as `0x${string}`) : undefined

  // Read on-chain collateral & debt for the entered token
  const { data: rawCollateral } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'collateral',
    args: tokenAddr ? [tokenAddr] : undefined,
    query: { enabled: !!tokenAddr },
  })
  const { data: rawDebt } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'debt',
    args: tokenAddr ? [tokenAddr] : undefined,
    query: { enabled: !!tokenAddr },
  })

  const collateral = (rawCollateral as bigint) ?? BigInt(0)
  const currentDebt = (rawDebt as bigint) ?? BigInt(0)
  const availableToBorrow = collateral > currentDebt ? collateral - currentDebt : BigInt(0)
  const availableNum = parseFloat(formatUnits(availableToBorrow, 18))
  const collateralNum = parseFloat(formatUnits(collateral, 18))
  const currentDebtNum = parseFloat(formatUnits(currentDebt, 18))

  // Compute projected LTV after this borrow
  const projectedLtv = useMemo(() => {
    const amt = parseFloat(amount || '0')
    if (collateralNum <= 0 || isNaN(amt)) return 0
    return ((currentDebtNum + amt) / collateralNum) * 100
  }, [amount, collateralNum, currentDebtNum])

  const { borrow, hash, isPending, isConfirming, isSuccess, error } = useBorrow(vaultAddress)

  // Track wallet/tx state transitions
  useEffect(() => {
    if (isPending && step === 'proving') {
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
    if (!isValidToken) return toast.error('Invalid token address')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return toast.error('Enter a valid amount')
    if (parsed > availableNum) {
      return toast.error(
        `Exceeds available limit. Max borrow: ${availableNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens (collateral ${collateralNum} − debt ${currentDebtNum})`,
      )
    }
    setStep('warning')
  }

  const handleSetMax = () => {
    if (availableNum > 0) setAmount(formatUnits(availableToBorrow, 18))
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

  const amountExceedsLimit = parseFloat(amount || '0') > availableNum && availableNum > 0

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

            {/* Show on-chain balance info when token is valid */}
            {isValidToken && collateral > BigInt(0) && (
              <div className="mb-3 rounded border border-vf-border/50 bg-vf-surface/30 px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">Collateral</span>
                  <span className="font-mono text-vf-text">{collateralNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">Current Debt</span>
                  <span className="font-mono text-vf-text">{currentDebtNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-vf-border/30 pt-1 font-bold">
                  <span className="text-cyan-400">Available to Borrow</span>
                  <span className="font-mono text-cyan-400">{availableNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <label className="mb-1 block text-xs text-vf-text-muted">Amount</label>
            <div className="relative mb-1">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className={`w-full rounded border ${amountExceedsLimit ? 'border-red-500' : 'border-vf-border'} bg-vf-base px-3 py-2 pr-14 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan`}
              />
              {availableNum > 0 && (
                <button
                  onClick={handleSetMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-vf-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold text-vf-cyan hover:bg-vf-cyan/20"
                >
                  MAX
                </button>
              )}
            </div>

            {/* Projected LTV indicator */}
            {parseFloat(amount || '0') > 0 && collateralNum > 0 && (
              <p className={`mb-3 text-xs ${projectedLtv > 90 ? 'text-red-400' : projectedLtv > 75 ? 'text-yellow-400' : 'text-vf-text-muted'}`}>
                Projected LTV after borrow: <span className="font-mono font-bold">{projectedLtv.toFixed(1)}%</span>
                {projectedLtv > 90 && ' — Extremely risky!'}
                {projectedLtv > 75 && projectedLtv <= 90 && ' — High risk'}
              </p>
            )}

            {amountExceedsLimit && (
              <p className="mb-3 text-xs text-red-400">
                Exceeds available limit of {availableNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
              </p>
            )}

            <button
              onClick={handleContinue}
              disabled={amountExceedsLimit}
              className="w-full rounded px-4 py-2 font-mono text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="mt-3 space-y-1 rounded bg-black/20 px-3 py-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">Collateral</span>
                  <span className="text-vf-text">{collateralNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">Current Debt</span>
                  <span className="text-vf-text">{currentDebtNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">+ This Borrow</span>
                  <span className="text-cyan-400">{amount}</span>
                </div>
                <div className="flex justify-between border-t border-vf-border/30 pt-1 font-bold">
                  <span className="text-vf-text-muted">New LTV</span>
                  <span className={projectedLtv > 75 ? 'text-yellow-400' : 'text-vf-text'}>{projectedLtv.toFixed(1)}%</span>
                </div>
              </div>
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
