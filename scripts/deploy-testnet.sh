#!/usr/bin/env bash
set -euo pipefail

# ── VaultForge: Deploy contracts to opBNB Testnet ────────────────────
# Requires: DEPLOYER_PRIVATE_KEY and OPBNB_TESTNET_RPC_URL in .env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

source "$ROOT_DIR/.env" 2>/dev/null || true

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set. Copy .env.example to .env and fill it in."
  exit 1
fi

RPC="${OPBNB_TESTNET_RPC_URL:-https://opbnb-testnet-rpc.bnbchain.org}"

echo "==> Deploying VaultForge contracts to opBNB Testnet ($RPC)..."
cd "$ROOT_DIR/contracts"

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --verify \
  -vvv

echo "==> Deploy complete. Check broadcast/ for transaction receipts."
