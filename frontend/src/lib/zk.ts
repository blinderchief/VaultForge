import type { Groth16Proof } from 'snarkjs'

export interface Asset {
  symbol: string
  amountUsd: number
}

export interface ZKProofResult {
  /** pA[2], pB[2][2], pC[2] flattened for Solidity */
  pA: readonly [bigint, bigint]
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]]
  pC: readonly [bigint, bigint]
  publicSignals: readonly bigint[]
  proofHash: string
  elapsedMs: number
}

/**
 * Convert snarkjs Groth16 proof to the Solidity-friendly format
 * expected by Vault.borrow(token, amount, pA[2], pB[2][2], pC[2], pubSignals[]).
 *
 * Note: pB coordinates are TRANSPOSED — snarkjs outputs [x0,x1][y0,y1]
 * but the Solidity verifier expects [y0,y1][x0,x1].
 */
function formatProofForSolidity(proof: Groth16Proof) {
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as const,
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ] as const,
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as const,
  }
}

/**
 * Generate a real Groth16 proof that sum(asset values) >= threshold.
 *
 * Circuit: CollateralThreshold(10)
 *   private inputs: asset_values[10]  (integer, 0-padded)
 *   public input:   threshold
 *   public outputs: commitment (Poseidon hash), sufficient (must be 1)
 */
export async function generateCollateralProof(
  assets: Asset[],
  thresholdUsd: number,
): Promise<ZKProofResult> {
  const snarkjs = await import('snarkjs')

  // Circuit expects exactly 10 integer values — pad with zeros
  const values: number[] = assets.map(a => Math.floor(a.amountUsd * 100))
  while (values.length < 10) values.push(0)
  if (values.length > 10) throw new Error('Circuit supports max 10 assets')

  const input = {
    asset_values: values,
    threshold: Math.floor(thresholdUsd * 100),
  }

  console.log('[ZK] Generating Groth16 proof for CollateralThreshold...')
  console.log('[ZK] Input:', { assetCount: assets.length, thresholdUsd })

  const startTime = performance.now()

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/zk/CollateralThreshold.wasm',
    '/zk/CollateralThreshold_final.zkey',
  )

  const elapsedMs = Math.round(performance.now() - startTime)
  console.log(`[ZK] Proof generated in ${elapsedMs}ms`)

  // Verify locally before submitting on-chain
  const vkeyResponse = await fetch('/zk/CollateralThreshold_verification_key.json')
  const vkey = await vkeyResponse.json()
  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof)

  if (!isValid) {
    throw new Error('Generated ZK proof failed local verification — circuit mismatch')
  }

  console.log('[ZK] Proof verified locally ✓')

  const { pA, pB, pC } = formatProofForSolidity(proof)
  const pubSignalsBigInt = publicSignals.map((s: string) => BigInt(s))

  return {
    pA,
    pB,
    pC,
    publicSignals: pubSignalsBigInt,
    proofHash: '0x' + pA[0].toString(16).slice(0, 16),
    elapsedMs,
  }
}

/**
 * Generate a real Groth16 proof for reputation score >= min_score.
 *
 * Circuit: ReputationScore()
 *   private inputs: repayment_history, collateral_ratio, account_age, tx_count,
 *                   w_repay, w_collateral, w_age, w_tx
 *   public input:   min_score
 *   public outputs: commitment (Poseidon hash of 4 metrics), qualified (must be 1)
 */
export async function generateReputationProof(params: {
  repaymentHistory: number
  collateralRatio: number
  accountAge: number
  txCount: number
  weights?: { repay: number; collateral: number; age: number; tx: number }
  minScore: number
}): Promise<ZKProofResult> {
  const snarkjs = await import('snarkjs')

  // Default weights: 40% repayment, 30% collateral, 15% age, 15% tx
  const w = params.weights ?? { repay: 4000, collateral: 3000, age: 1500, tx: 1500 }

  const input = {
    repayment_history: params.repaymentHistory,
    collateral_ratio: params.collateralRatio,
    account_age: params.accountAge,
    tx_count: params.txCount,
    w_repay: w.repay,
    w_collateral: w.collateral,
    w_age: w.age,
    w_tx: w.tx,
    min_score: params.minScore,
  }

  console.log('[ZK] Generating Groth16 proof for ReputationScore...')
  const startTime = performance.now()

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/zk/ReputationScore.wasm',
    '/zk/ReputationScore_final.zkey',
  )

  const elapsedMs = Math.round(performance.now() - startTime)
  console.log(`[ZK] ReputationScore proof generated in ${elapsedMs}ms`)

  const vkeyResponse = await fetch('/zk/ReputationScore_verification_key.json')
  const vkey = await vkeyResponse.json()
  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof)

  if (!isValid) {
    throw new Error('ReputationScore ZK proof failed local verification')
  }

  console.log('[ZK] ReputationScore proof verified locally ✓')

  const { pA, pB, pC } = formatProofForSolidity(proof)
  const pubSignalsBigInt = publicSignals.map((s: string) => BigInt(s))

  return {
    pA,
    pB,
    pC,
    publicSignals: pubSignalsBigInt,
    proofHash: '0x' + pA[0].toString(16).slice(0, 16),
    elapsedMs,
  }
}
