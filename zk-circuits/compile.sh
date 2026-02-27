#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# VaultForge — ZK Circuit Compilation & Trusted Setup Pipeline
# ──────────────────────────────────────────────────────────────────────
# Usage:  ./compile.sh <circuit_name>        (e.g. ./compile.sh CollateralThreshold)
#         ./compile.sh all                   (compiles all circuits)
#
# Prerequisites:
#   - circom 2.1.x  (https://docs.circom.io/getting-started/installation/)
#   - snarkjs       (npm install -g snarkjs  -- or use local via npx)
#   - Node.js >=18
#
# What this script does (per circuit):
#   1. Compile .circom → .r1cs + .wasm + .sym
#   2. Download ptau file (powers of tau ceremony) if not cached
#   3. Generate circuit-specific zkey (Groth16)
#   4. Export verification key (JSON)
#   5. Export Solidity verifier contract
#
# NOTE: The ptau file used here (powersOfTau28_hez_final_16.ptau) supports
#       circuits up to 2^16 = 65536 constraints. For production, use a
#       larger ceremony file if your circuit exceeds this.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/circuits"
BUILD_DIR="$SCRIPT_DIR/build"
PTAU_DIR="$SCRIPT_DIR/ptau"

# Powers of Tau parameters
PTAU_SIZE=16  # 2^16 = 65536 constraints max
PTAU_FILE="powersOfTau28_hez_final_${PTAU_SIZE}.ptau"
PTAU_URL="https://storage.googleapis.com/zkevm/ptau/${PTAU_FILE}"

# All available circuits
ALL_CIRCUITS=("CollateralThreshold" "ReputationScore" "LTVComputation")

# ── Helpers ──────────────────────────────────────────────────────────

log()  { echo -e "\033[1;34m[VaultForge ZK]\033[0m $*"; }
ok()   { echo -e "\033[1;32m  ✓\033[0m $*"; }
fail() { echo -e "\033[1;31m  ✗\033[0m $*" >&2; exit 1; }

check_deps() {
    command -v circom >/dev/null 2>&1 || fail "circom not found. Install: https://docs.circom.io/getting-started/installation/"
    command -v node   >/dev/null 2>&1 || fail "node not found."
    # snarkjs via npx or global
    if ! command -v snarkjs >/dev/null 2>&1; then
        SNARKJS="npx snarkjs"
    else
        SNARKJS="snarkjs"
    fi
    ok "Dependencies found (circom, node, snarkjs)"
}

download_ptau() {
    mkdir -p "$PTAU_DIR"
    if [ -f "$PTAU_DIR/$PTAU_FILE" ]; then
        ok "ptau file already cached: $PTAU_FILE"
        return
    fi
    log "Downloading ptau file ($PTAU_FILE) ..."
    curl -L -o "$PTAU_DIR/$PTAU_FILE" "$PTAU_URL"
    ok "Downloaded $PTAU_FILE"
}

compile_circuit() {
    local name="$1"
    local src="$CIRCUITS_DIR/${name}.circom"
    local out="$BUILD_DIR/$name"

    if [ ! -f "$src" ]; then
        fail "Circuit not found: $src"
    fi

    log "═══════════════════════════════════════════════════════════"
    log "Compiling: $name"
    log "═══════════════════════════════════════════════════════════"

    mkdir -p "$out"

    # ── Step 1: Compile circom → r1cs + wasm + sym ───────────────
    log "Step 1/5: Compiling circom circuit..."
    circom "$src" \
        --r1cs "$out/${name}.r1cs" \
        --wasm "$out/${name}_js" \
        --sym  "$out/${name}.sym" \
        --O1 \
        -l "$SCRIPT_DIR/node_modules"
    ok "Compiled: ${name}.r1cs, ${name}_js/, ${name}.sym"

    # Print circuit info
    $SNARKJS r1cs info "$out/${name}.r1cs"

    # ── Step 2: Download ptau (shared across circuits) ───────────
    download_ptau

    # ── Step 3: Generate circuit-specific zkey (Groth16) ─────────
    log "Step 3/5: Generating proving key (zkey) ..."
    $SNARKJS groth16 setup \
        "$out/${name}.r1cs" \
        "$PTAU_DIR/$PTAU_FILE" \
        "$out/${name}_0000.zkey"
    ok "Initial zkey generated"

    # Contribute to ceremony (non-interactive, single contributor for dev)
    # In production, use a multi-party ceremony
    $SNARKJS zkey contribute \
        "$out/${name}_0000.zkey" \
        "$out/${name}_final.zkey" \
        --name="VaultForge Dev Contribution" \
        -v -e="$(head -c 64 /dev/urandom | xxd -p)"
    ok "Contributed to zkey ceremony"

    # Clean up intermediate zkey
    rm -f "$out/${name}_0000.zkey"

    # ── Step 4: Export verification key (JSON) ───────────────────
    log "Step 4/5: Exporting verification key..."
    $SNARKJS zkey export verificationkey \
        "$out/${name}_final.zkey" \
        "$out/${name}_verification_key.json"
    ok "Verification key: ${name}_verification_key.json"

    # ── Step 5: Export Solidity verifier ─────────────────────────
    log "Step 5/5: Exporting Solidity verifier..."
    $SNARKJS zkey export solidityverifier \
        "$out/${name}_final.zkey" \
        "$out/${name}_Verifier.sol"
    ok "Solidity verifier: ${name}_Verifier.sol"

    log "Done: $name"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    local target="${1:-}"

    if [ -z "$target" ]; then
        echo "Usage: $0 <circuit_name|all>"
        echo ""
        echo "Available circuits:"
        for c in "${ALL_CIRCUITS[@]}"; do
            echo "  - $c"
        done
        exit 0
    fi

    check_deps

    if [ "$target" = "all" ]; then
        for circuit in "${ALL_CIRCUITS[@]}"; do
            compile_circuit "$circuit"
        done
        log "All circuits compiled successfully!"
    else
        compile_circuit "$target"
    fi
}

main "$@"
