'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useRepay } from '@/hooks/useVault'
import { toast } from 'sonner'

const EXPLORER = 'https://opbnb-testnet.bscscan.com'

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

type Step = 'input' | 'warning' | 'approving' | 'signing' | 'confirming' | 'done' | 'error'

interface Props {
  vaultAddress: `0x${string}`
  isOpen: boolean
  onClose: () => void
}

export function RepayModal({ vaultAddress, isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [token, setToken] = useState('')
  const [amount, setAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Approve tx
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: approvePending,
    error: approveError,
  } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Repay tx
  const { repay, hash: repayHash, isPending: repayPending, isConfirming, isSuccess, error: repayError } =
    useRepay(vaultAddress)

  // When approve confirms → submit repay
  useEffect(() => {
    if (approveConfirmed && step === 'approving') {
      const amountWei = parseUnits(amount, 18)
      repay(token as `0x${string}`, amountWei)
      setStep('signing')
    }
  }, [approveConfirmed, step, amount, token, repay])

  // Repay pending → signing
  useEffect(() => {
    if (repayPending && step === 'signing') {
      // already in signing
    }
  }, [repayPending, step])

  // Repay confirming → confirming
  useEffect(() => {
    if (isConfirming && (step === 'signing' || step === 'approving')) {
      setStep('confirming')
    }
  }, [isConfirming, step])

  // Repay success → done
  useEffect(() => {
    if (isSuccess && step === 'confirming') {
      setStep('done')
      toast.success('Repayment confirmed on-chain')
    }
  }, [isSuccess, step])

  // Error handling
  useEffect(() => {
    if (approveError && step === 'approving') {
      setErrorMsg(approveError.message?.split('\n')[0] ?? 'Approve transaction failed')
      setStep('error')
    }
  }, [approveError, step])

  useEffect(() => {
    if (repayError && step !== 'input' && step !== 'done') {
      setErrorMsg(repayError.message?.split('\n')[0] ?? 'Repay transaction failed')
      setStep('error')
    }
  }, [repayError, step])

  const reset = useCallback(() => {
    setStep('input')
    setToken('')
    setAmount('')
    setErrorMsg('')
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleContinue = () => {
    if (!token || !amount) return toast.error('Fill in token address and amount')
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return toast.error('Invalid token address')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return toast.error('Enter a valid amount')
    setStep('warning')
  }

  // Warning → approve → repay
  const handleConfirmRepay = () => {
    const amountWei = parseUnits(amount, 18)
    setStep('approving')

    // First approve the vault to pull tokens via safeTransferFrom
    writeApprove({
      address: token as `0x${string}`,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [vaultAddress, amountWei],
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
            Repay
          </h3>
          <button onClick={handleClose} className="text-vf-text-muted hover:text-vf-text">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-4 flex gap-1">
          {(['input', 'warning', 'approving', 'signing', 'confirming', 'done'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= (['input', 'warning', 'approving', 'signing', 'confirming', 'done'] as const).indexOf(step === 'error' ? 'input' : step)
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
              <p className="mb-2 text-sm font-bold text-yellow-400">⚠ Confirm Repayment</p>
              <p className="text-xs text-vf-text-muted">
                You are about to repay{' '}
                <span className="font-mono text-vf-text">{amount}</span> tokens to vault{' '}
                <span className="font-mono text-vf-text">
                  {vaultAddress.slice(0, 10)}…{vaultAddress.slice(-4)}
                </span>
                .
              </p>
              <p className="mt-2 text-xs text-vf-text-muted">
                This requires two transactions: an ERC-20 token approval followed by the
                repay call. Your wallet will prompt you for each.
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
                onClick={handleConfirmRepay}
                className="flex-1 rounded px-4 py-2 font-mono text-sm font-bold transition-colors"
                style={{ background: 'var(--vf-cyan)', color: 'var(--vf-base)' }}
              >
                Approve &amp; Repay
              </button>
            </div>
          </>
        )}

        {/* ── STEP: approving ── */}
        {step === 'approving' && (
          <div className="flex items-center gap-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-cyan-400">
                {approvePending ? 'Approve in Wallet' : 'Waiting for Approval…'}
              </p>
              <p className="text-xs text-vf-text-muted">
                {approvePending
                  ? 'Approve the vault to spend your tokens.'
                  : 'Approval transaction submitted. Waiting for confirmation…'}
              </p>
              {approveHash && (
                <a
                  href={`${EXPLORER}/tx/${approveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-cyan-400/70 hover:text-cyan-400"
                >
                  {approveHash.slice(0, 14)}…{approveHash.slice(-6)} ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: signing ── */}
        {step === 'signing' && (
          <div className="flex items-center gap-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-cyan-400">Confirm Repay in Wallet</p>
              <p className="text-xs text-vf-text-muted">
                Approval confirmed. Now confirm the repay transaction in your wallet.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: confirming ── */}
        {step === 'confirming' && (
          <div className="flex items-center gap-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-cyan-400">Confirming on Chain…</p>
              <p className="text-xs text-vf-text-muted">
                Repay transaction submitted. Waiting for block confirmation on opBNB.
              </p>
              {repayHash && (
                <a
                  href={`${EXPLORER}/tx/${repayHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-cyan-400/70 hover:text-cyan-400"
                >
                  {repayHash.slice(0, 14)}…{repayHash.slice(-6)} ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <div className="text-center">
            <div className="rounded border border-green-500/30 bg-green-950/20 p-4">
              <p className="mb-1 text-lg font-bold text-green-400">Repayment Successful ✓</p>
              <p className="text-xs text-vf-text-muted">
                {amount} tokens repaid to your vault.
              </p>
              {repayHash && (
                <a
                  href={`${EXPLORER}/tx/${repayHash}`}
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
