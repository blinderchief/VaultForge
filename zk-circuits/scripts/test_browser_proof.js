// Test real Groth16 proof generation using the compiled CollateralThreshold circuit.
// Run: node zk-circuits/scripts/test_browser_proof.js

const snarkjs = require('snarkjs')
const path = require('path')

async function testCollateralProof() {
  // Circuit: CollateralThreshold(10)
  //   private: asset_values[10]
  //   public:  threshold
  //   outputs: commitment, sufficient (must be 1)
  const input = {
    asset_values: [500000, 300000, 200000, 0, 0, 0, 0, 0, 0, 0],
    threshold: 800000,
  }

  console.log('=== CollateralThreshold Proof ===')
  console.log('Input:', JSON.stringify(input))
  console.log('Sum:', input.asset_values.reduce((a, b) => a + b, 0), '>= threshold:', input.threshold)
  console.log('Generating proof...')

  const start = Date.now()

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    path.join(__dirname, '../build/CollateralThreshold/CollateralThreshold_js/CollateralThreshold.wasm'),
    path.join(__dirname, '../build/CollateralThreshold/CollateralThreshold_final.zkey'),
  )

  console.log(`Proof generated in ${Date.now() - start}ms`)

  const vkey = require('../build/CollateralThreshold/CollateralThreshold_verification_key.json')
  const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof)
  console.log('Proof valid:', valid)
  console.log('Public signals:', publicSignals)
  console.log('  [0] commitment:', publicSignals[0])
  console.log('  [1] sufficient:', publicSignals[1])
  console.log('  [2] threshold:', publicSignals[2])
  console.log()

  if (!valid) {
    process.exit(1)
  }
}

async function testReputationProof() {
  // Circuit: ReputationScore()
  //   private: repayment_history, collateral_ratio, account_age, tx_count,
  //            w_repay, w_collateral, w_age, w_tx
  //   public:  min_score
  //   outputs: commitment, qualified (must be 1)
  const input = {
    repayment_history: 9500,   // 95% on-time
    collateral_ratio: 15000,   // 150%
    account_age: 365,          // 1 year
    tx_count: 100,
    w_repay: 4000,             // 40%
    w_collateral: 3000,        // 30%
    w_age: 1500,               // 15%
    w_tx: 1500,                // 15%
    min_score: 5000,           // minimum weighted score
  }

  console.log('=== ReputationScore Proof ===')
  console.log('Input:', JSON.stringify(input))
  console.log('Generating proof...')

  const start = Date.now()

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    path.join(__dirname, '../build/ReputationScore/ReputationScore_js/ReputationScore.wasm'),
    path.join(__dirname, '../build/ReputationScore/ReputationScore_final.zkey'),
  )

  console.log(`Proof generated in ${Date.now() - start}ms`)

  const vkey = require('../build/ReputationScore/ReputationScore_verification_key.json')
  const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof)
  console.log('Proof valid:', valid)
  console.log('Public signals:', publicSignals)
  console.log()

  if (!valid) {
    process.exit(1)
  }
}

async function main() {
  await testCollateralProof()
  await testReputationProof()
  console.log('✓ All proofs valid!')
}

main().catch(err => {
  console.error('FAILED:', err)
  process.exit(1)
})
