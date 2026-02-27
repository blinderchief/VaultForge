/**
 * VaultForge — ZK Proof Generation Wrapper
 *
 * Unified prover for all three circuits. Works in both Node.js and browser
 * (when bundled with a wasm-compatible bundler).
 *
 * Usage (Node.js):
 *   import { prove, verify, CircuitName } from "./prover";
 *
 *   const { proof, publicSignals } = await prove("CollateralThreshold", {
 *     asset_values: ["100000000000000000000", "50000000000000000000", ...],
 *     threshold: "100000000000000000000",
 *   });
 *
 *   const valid = await verify("CollateralThreshold", proof, publicSignals);
 */

import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";

// ── Types ───────────────────────────────────────────────────────────

export type CircuitName =
  | "CollateralThreshold"
  | "ReputationScore"
  | "LTVComputation";

export interface CollateralThresholdInput {
  asset_values: string[]; // 10 elements, 0-padded
  threshold: string;
}

export interface ReputationScoreInput {
  repayment_history: string;
  collateral_ratio: string;
  account_age: string;
  tx_count: string;
  w_repay: string;
  w_collateral: string;
  w_age: string;
  w_tx: string;
  min_score: string;
}

export interface LTVComputationInput {
  collateral_value: string;
  debt: string;
  max_ltv_bps: string;
}

export type CircuitInput =
  | CollateralThresholdInput
  | ReputationScoreInput
  | LTVComputationInput;

export interface Groth16Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ProofResult {
  proof: Groth16Proof;
  publicSignals: string[];
}

/** Solidity-compatible calldata for on-chain verification */
export interface SolidityCalldata {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

// ── Configuration ───────────────────────────────────────────────────

const BUILD_DIR =
  process.env.ZK_BUILD_DIR || path.resolve(__dirname, "..", "build");

function getCircuitPaths(name: CircuitName) {
  const circuitDir = path.join(BUILD_DIR, name);
  return {
    wasm: path.join(circuitDir, `${name}_js`, `${name}.wasm`),
    zkey: path.join(circuitDir, `${name}_final.zkey`),
    vkey: path.join(circuitDir, `${name}_verification_key.json`),
  };
}

// ── Core Functions ──────────────────────────────────────────────────

/**
 * Generate a Groth16 proof for the given circuit and inputs.
 */
export async function prove(
  circuit: CircuitName,
  input: CircuitInput
): Promise<ProofResult> {
  const paths = getCircuitPaths(circuit);

  if (!fs.existsSync(paths.wasm)) {
    throw new Error(
      `WASM not found: ${paths.wasm}. Run compile.sh ${circuit} first.`
    );
  }
  if (!fs.existsSync(paths.zkey)) {
    throw new Error(
      `zkey not found: ${paths.zkey}. Run compile.sh ${circuit} first.`
    );
  }

  const result = await snarkjs.groth16.fullProve(
    input as unknown as Record<string, unknown>,
    paths.wasm,
    paths.zkey
  );

  return { proof: result.proof as Groth16Proof, publicSignals: result.publicSignals };
}

/**
 * Verify a Groth16 proof off-chain using the verification key.
 */
export async function verify(
  circuit: CircuitName,
  proof: Groth16Proof,
  publicSignals: string[]
): Promise<boolean> {
  const paths = getCircuitPaths(circuit);

  if (!fs.existsSync(paths.vkey)) {
    throw new Error(
      `Verification key not found: ${paths.vkey}. Run compile.sh ${circuit} first.`
    );
  }

  const vkey = JSON.parse(fs.readFileSync(paths.vkey, "utf-8"));
  return snarkjs.groth16.verify(vkey, publicSignals, proof);
}

/**
 * Generate Solidity-compatible calldata from a proof.
 * Returns { pA, pB, pC, pubSignals } matching the ZKVerifier.sol interface.
 */
export async function toSolidityCalldata(
  proof: Groth16Proof,
  publicSignals: string[]
): Promise<SolidityCalldata> {
  const raw = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );

  // snarkjs returns a comma-separated string of args
  // Parse it into structured data
  const parsed = JSON.parse(`[${raw}]`);

  return {
    pA: parsed[0] as [string, string],
    pB: parsed[1] as [[string, string], [string, string]],
    pC: parsed[2] as [string, string],
    pubSignals: parsed[3] as string[],
  };
}

/**
 * Full pipeline: prove + generate Solidity calldata.
 * This is the primary function the backend/frontend will call.
 */
export async function proveAndExport(
  circuit: CircuitName,
  input: CircuitInput
): Promise<{ proof: ProofResult; calldata: SolidityCalldata }> {
  const result = await prove(circuit, input);
  const calldata = await toSolidityCalldata(result.proof, result.publicSignals);
  return { proof: result, calldata };
}
