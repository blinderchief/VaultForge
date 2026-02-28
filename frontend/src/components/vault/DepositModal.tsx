'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi'
import { useDeposit } from '@/hooks/useVault'
import { toast } from 'sonner'

const EXPLORER = 'https://opbnb-testnet.bscscan.com'

const ERC20_ABI = [
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
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

type Step = 'input' | 'approving' | 'signing' | 'confirming' | 'done' | 'error'

interface Props {
  vaultAddress: `0x${string}`
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function DepositModal({ vaultAddress, isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [token, setToken] = useState('')
  const [amount, setAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { address } = useAccount()
  const isValidToken = /^0x[a-fA-F0-9]{40}$/.test(token)
  const tokenAddr = isValidToken ? (token as `0x${string}`) : undefined

  // Read user's token balance
  const { data: rawBalance } = useReadContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddr && !!address },
  })
  const walletBalance = (rawBalance as bigint) ?? BigInt(0)
  const balanceNum = parseFloat(formatUnits(walletBalance, 18))

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

  // Deposit tx
  const { deposit, hash: depositHash, isPending: depositPending, isConfirming, isSuccess, error: depositError } =
    useDeposit(vaultAddress)

  // When approve confirms → submit deposit
  useEffect(() => {
    if (approveConfirmed && step === 'approving') {
      const amountWei = parseUnits(amount, 18)
      deposit(token as `0x${string}`, amountWei)
      setStep('signing')
    }
  }, [approveConfirmed, step, amount, token, deposit])

  useEffect(() => {
    if (isConfirming && (step === 'signing' || step === 'approving')) {
      setStep('confirming')
    }
  }, [isConfirming, step])

  useEffect(() => {
    if (isSuccess && step === 'confirming') {
      setStep('done')
      toast.success('Deposit confirmed on-chain')
      onSuccess?.()
    }
  }, [isSuccess, step, onSuccess])

  useEffect(() => {
    if (approveError && step === 'approving') {
      setErrorMsg(approveError.message?.split('\n')[0] ?? 'Approve transaction failed')
      setStep('error')
    }
  }, [approveError, step])

  useEffect(() => {
    if (depositError && step !== 'input' && step !== 'done') {
      setErrorMsg(depositError.message?.split('\n')[0] ?? 'Deposit transaction failed')
      setStep('error')
    }
  }, [depositError, step])

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
    if (!isValidToken) return toast.error('Invalid token address')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return toast.error('Enter a valid amount')
    if (parsed > balanceNum) return toast.error(`Insufficient balance. You have ${balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens`)

    const amountWei = parseUnits(amount, 18)
    setStep('approving')

    writeApprove({
      address: token as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [vaultAddress, amountWei],
    })
  }

  const handleSetMax = () => {
    if (walletBalance > BigInt(0)) setAmount(formatUnits(walletBalance, 18))
  }

  if (!isOpen) return null

  const amountExceedsBalance = parseFloat(amount || '0') > balanceNum && balanceNum > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
            Deposit Collateral
          </h3>
          <button onClick={handleClose} className="text-vf-text-muted hover:text-vf-text">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-4 flex gap-1">
          {(['input', 'approving', 'signing', 'confirming', 'done'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= (['input', 'approving', 'signing', 'confirming', 'done'] as const).indexOf(step === 'error' ? 'input' : step)
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

            {isValidToken && walletBalance > BigInt(0) && (
              <div className="mb-3 rounded border border-vf-border/50 bg-vf-surface/30 px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-vf-text-muted">Wallet Balance</span>
                  <span className="font-mono text-vf-text">{balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
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
                className={`w-full rounded border ${amountExceedsBalance ? 'border-red-500' : 'border-vf-border'} bg-vf-base px-3 py-2 pr-14 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan`}
              />
              {walletBalance > BigInt(0) && (
                <button
                  onClick={handleSetMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-vf-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold text-vf-cyan hover:bg-vf-cyan/20"
                >
                  MAX
                </button>
              )}
            </div>

            {amountExceedsBalance && (
              <p className="mb-3 text-xs text-red-400">
                Exceeds wallet balance of {balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
              </p>
            )}

            <p className="mb-4 text-xs text-vf-text-muted">
              Two transactions required: approve token spend, then deposit into vault.
            </p>

            <button
              onClick={handleContinue}
              disabled={amountExceedsBalance}
              className="w-full rounded px-4 py-2 font-mono text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--vf-cyan)', color: 'var(--vf-base)' }}
            >
              Approve &amp; Deposit
            </button>
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
              <p className="text-sm font-medium text-cyan-400">Confirm Deposit in Wallet</p>
              <p className="text-xs text-vf-text-muted">
                Approval confirmed. Now confirm the deposit transaction in your wallet.
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
                Deposit transaction submitted. Waiting for block confirmation on opBNB.
              </p>
              {depositHash && (
                <a
                  href={`${EXPLORER}/tx/${depositHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-cyan-400/70 hover:text-cyan-400"
                >
                  {depositHash.slice(0, 14)}…{depositHash.slice(-6)} ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <div className="text-center">
            <div className="rounded border border-green-500/30 bg-green-950/20 p-4">
              <p className="mb-1 text-lg font-bold text-green-400">Deposit Successful ✓</p>
              <p className="text-xs text-vf-text-muted">
                {amount} tokens deposited into your vault.
              </p>
              {depositHash && (
                <a
                  href={`${EXPLORER}/tx/${depositHash}`}
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
