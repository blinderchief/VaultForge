pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/// @title CollateralThreshold
/// @notice Proves sum(asset_values) >= threshold WITHOUT revealing individual values.
///         - Private inputs:  asset_values[10] (up to 10 asset positions, 0-padded)
///         - Public inputs:   threshold (minimum total collateral value)
///         - Public outputs:  commitment (Poseidon hash of all asset values — binds proof to data)
///                            sufficient  (1 if sum >= threshold, must be 1 for valid proof)
///
/// The Vault.sol borrow() function passes pubSignals = [threshold, commitment, sufficient]
/// and the on-chain verifier checks the pairing. The contract then asserts sufficient == 1.

template CollateralThreshold(nAssets) {
    // ── Inputs ──────────────────────────────────────────────────────
    signal input asset_values[nAssets];  // private: value of each asset position
    signal input threshold;              // public:  minimum required total value

    // ── Outputs ─────────────────────────────────────────────────────
    signal output commitment;            // public: Poseidon hash binding proof to data
    signal output sufficient;            // public: 1 if total >= threshold

    // ── Step 1: Sum all asset values ────────────────────────────────
    signal cumulative[nAssets + 1];
    cumulative[0] <== 0;
    for (var i = 0; i < nAssets; i++) {
        cumulative[i + 1] <== cumulative[i] + asset_values[i];
    }
    signal totalValue <== cumulative[nAssets];

    // ── Step 2: Ensure all values are non-negative ──────────────────
    // Range check: each asset_value fits in 128 bits (prevents overflow tricks)
    // Using GreaterEqThan(128): asset_values[i] >= 0 is always true for field,
    // but we also need asset_values[i] < 2^128 to prevent wrapping.
    // We check: 2^128 - 1 >= asset_values[i]  (i.e., it fits in 128 bits)
    component rangeCheck[nAssets];
    for (var i = 0; i < nAssets; i++) {
        rangeCheck[i] = LessEqThan(128);
        rangeCheck[i].in[0] <== asset_values[i];
        rangeCheck[i].in[1] <== (1 << 128) - 1;
        rangeCheck[i].out === 1;
    }

    // ── Step 3: Compare totalValue >= threshold ─────────────────────
    // 252-bit comparator (full BN254 scalar field safe range)
    component gte = GreaterEqThan(252);
    gte.in[0] <== totalValue;
    gte.in[1] <== threshold;
    sufficient <== gte.out;

    // ── Step 4: Enforce that the proof is only valid if sufficient ───
    sufficient === 1;

    // ── Step 5: Poseidon commitment over all asset values ───────────
    // This binds the proof to specific data — verifier can check commitment
    // matches what was claimed off-chain.
    component hasher = Poseidon(nAssets);
    for (var i = 0; i < nAssets; i++) {
        hasher.inputs[i] <== asset_values[i];
    }
    commitment <== hasher.out;
}

// ── Main instantiation: 10 asset slots ──────────────────────────────
component main {public [threshold]} = CollateralThreshold(10);
