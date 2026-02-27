pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/// @title LTVComputation
/// @notice Proves that a loan-to-value ratio is within acceptable bounds
///         without revealing the actual collateral value or debt amount.
///
///         LTV = (debt * 10000) / collateral_value  (in basis points)
///         Proves: LTV <= max_ltv_bps
///
///         We avoid division in the circuit by checking the equivalent:
///           debt * 10000 <= max_ltv_bps * collateral_value
///
///         Private inputs: collateral_value, debt
///         Public inputs:  max_ltv_bps (maximum allowed LTV in basis points)
///         Public outputs: commitment (Poseidon(collateral_value, debt))
///                         withinBounds (1 if LTV is acceptable)

template LTVComputation() {
    // ── Private inputs ──────────────────────────────────────────────
    signal input collateral_value;   // total collateral value (same unit as debt)
    signal input debt;               // current outstanding debt

    // ── Public inputs ───────────────────────────────────────────────
    signal input max_ltv_bps;        // maximum LTV in basis points (e.g., 7500 = 75%)

    // ── Outputs ─────────────────────────────────────────────────────
    signal output commitment;        // Poseidon(collateral_value, debt)
    signal output withinBounds;      // 1 if LTV <= max_ltv_bps

    // ── Step 1: Range checks (128-bit) ──────────────────────────────
    component rc_col = LessEqThan(128);
    rc_col.in[0] <== collateral_value;
    rc_col.in[1] <== (1 << 128) - 1;
    rc_col.out === 1;

    component rc_debt = LessEqThan(128);
    rc_debt.in[0] <== debt;
    rc_debt.in[1] <== (1 << 128) - 1;
    rc_debt.out === 1;

    component rc_ltv = LessEqThan(16);
    rc_ltv.in[0] <== max_ltv_bps;
    rc_ltv.in[1] <== 10000;  // max 100%
    rc_ltv.out === 1;

    // ── Step 2: Ensure collateral_value > 0 ─────────────────────────
    component gt_zero = GreaterThan(128);
    gt_zero.in[0] <== collateral_value;
    gt_zero.in[1] <== 0;
    gt_zero.out === 1;

    // ── Step 3: LTV check without division ──────────────────────────
    // debt * 10000 <= max_ltv_bps * collateral_value
    // Equivalent to: max_ltv_bps * collateral_value >= debt * 10000
    signal lhs <== max_ltv_bps * collateral_value;
    signal rhs <== debt * 10000;

    component gte = GreaterEqThan(252);
    gte.in[0] <== lhs;
    gte.in[1] <== rhs;
    withinBounds <== gte.out;

    // Must be within bounds
    withinBounds === 1;

    // ── Step 4: Commitment ──────────────────────────────────────────
    component hasher = Poseidon(2);
    hasher.inputs[0] <== collateral_value;
    hasher.inputs[1] <== debt;
    commitment <== hasher.out;
}

component main {public [max_ltv_bps]} = LTVComputation();
