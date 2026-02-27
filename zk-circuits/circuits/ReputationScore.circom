pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/// @title ReputationScore
/// @notice Proves a user's reputation score meets a minimum threshold
///         without revealing the individual scoring components.
///
///         Scoring model (weighted sum, all weights in basis points):
///           score = (repayment_history * w_repay +
///                    collateral_ratio  * w_collateral +
///                    account_age       * w_age +
///                    tx_count          * w_tx) / 10000
///
///         Private inputs: the 4 raw metrics + 4 weights
///         Public inputs:  min_score (threshold the score must meet)
///         Public outputs: commitment (Poseidon hash of metrics)
///                         qualified  (1 if score >= min_score)

template ReputationScore() {
    // ── Private inputs ──────────────────────────────────────────────
    signal input repayment_history;  // 0-10000 (basis points, e.g., 9500 = 95% on-time)
    signal input collateral_ratio;   // 0-30000 (e.g., 15000 = 150% collateralization)
    signal input account_age;        // days since first tx (e.g., 365)
    signal input tx_count;           // number of protocol interactions

    signal input w_repay;            // weight for repayment (bps, e.g., 4000 = 40%)
    signal input w_collateral;       // weight for collateral ratio
    signal input w_age;              // weight for account age
    signal input w_tx;               // weight for tx count

    // ── Public inputs ───────────────────────────────────────────────
    signal input min_score;          // minimum weighted score to qualify

    // ── Outputs ─────────────────────────────────────────────────────
    signal output commitment;        // Poseidon hash of raw metrics
    signal output qualified;         // 1 if score >= min_score

    // ── Step 1: Validate weights sum to 10000 (100%) ────────────────
    signal weight_sum;
    weight_sum <== w_repay + w_collateral + w_age + w_tx;
    weight_sum === 10000;

    // ── Step 2: Range checks on inputs (fit in 64 bits) ─────────────
    component rc[4];
    signal inputs_arr[4];
    inputs_arr[0] <== repayment_history;
    inputs_arr[1] <== collateral_ratio;
    inputs_arr[2] <== account_age;
    inputs_arr[3] <== tx_count;

    for (var i = 0; i < 4; i++) {
        rc[i] = LessEqThan(64);
        rc[i].in[0] <== inputs_arr[i];
        rc[i].in[1] <== (1 << 64) - 1;
        rc[i].out === 1;
    }

    // ── Step 3: Compute weighted score ──────────────────────────────
    // Each term: metric * weight. Sum all, then compare against min_score * 10000.
    // We avoid division in the circuit by comparing:
    //   (sum of metric*weight) >= min_score * 10000
    signal term_repay  <== repayment_history * w_repay;
    signal term_collat <== collateral_ratio  * w_collateral;
    signal term_age    <== account_age       * w_age;
    signal term_tx     <== tx_count          * w_tx;

    signal weighted_sum <== term_repay + term_collat + term_age + term_tx;
    signal scaled_threshold <== min_score * 10000;

    // ── Step 4: Compare weighted_sum >= scaled_threshold ─────────────
    component gte = GreaterEqThan(252);
    gte.in[0] <== weighted_sum;
    gte.in[1] <== scaled_threshold;
    qualified <== gte.out;

    // Must qualify
    qualified === 1;

    // ── Step 5: Commitment ──────────────────────────────────────────
    component hasher = Poseidon(4);
    hasher.inputs[0] <== repayment_history;
    hasher.inputs[1] <== collateral_ratio;
    hasher.inputs[2] <== account_age;
    hasher.inputs[3] <== tx_count;
    commitment <== hasher.out;
}

component main {public [min_score]} = ReputationScore();
