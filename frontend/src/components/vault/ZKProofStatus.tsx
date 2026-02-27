'use client'

interface Props {
  status: 'idle' | 'generating' | 'verified' | 'error'
  proofHash?: string
  elapsedMs?: number
  errorMessage?: string
}

export function ZKProofStatus({ status, proofHash, elapsedMs, errorMessage }: Props) {
  return (
    <div className={`rounded-lg border p-4 transition-colors ${statusStyle[status]}`}>
      {status === 'idle' && (
        <div className="flex items-center gap-2">
          <ShieldIcon />
          <span className="text-gray-400 text-sm">ZK privacy proof ready</span>
        </div>
      )}

      {status === 'generating' && (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <div>
            <p className="text-cyan-400 text-sm font-medium">Generating Groth16 proof…</p>
            <p className="text-xs text-gray-400 mt-1">
              Computing zero-knowledge proof of collateral sufficiency.
              This takes 5–15 seconds.
            </p>
            <div className="mt-2 h-1.5 w-full rounded bg-gray-800 overflow-hidden">
              <div className="h-full w-2/3 rounded bg-cyan-500/60 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex items-center gap-2">
          <ShieldCheckIcon />
          <div>
            <p className="text-green-400 text-sm font-medium">
              ✓ ZK Proof Generated &amp; Verified
            </p>
            <p className="text-xs text-gray-400">
              Your asset values are mathematically hidden.
              {elapsedMs != null && ` Verified locally in ${elapsedMs}ms.`}
            </p>
            {proofHash && (
              <p className="text-xs font-mono text-gray-500 mt-1">
                Proof: {proofHash}…
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2">
          <ShieldXIcon />
          <div>
            <p className="text-red-400 text-sm font-medium">ZK Proof Failed</p>
            {errorMessage && (
              <p className="text-xs text-gray-400 mt-1">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const statusStyle: Record<Props['status'], string> = {
  idle: 'border-gray-700 bg-gray-900/40',
  generating: 'border-cyan-500/30 bg-cyan-950/20',
  verified: 'border-green-500/30 bg-green-950/20',
  error: 'border-red-500/30 bg-red-950/20',
}

// ── Inline SVG icons (no external dependency) ──────────────────────

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  )
}

function ShieldXIcon() {
  return (
    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 10l4 4m0-4l-4 4" />
    </svg>
  )
}
