#!/usr/bin/env bash
# Verify all VaultForge contracts on opBNBScan testnet.
# Usage: bash scripts/verify-contracts.sh
# Requires: ETHERSCAN_API_KEY env var (BSCScan/Etherscan V2 key)

set -euo pipefail

CHAIN_ID=5611

contracts=(
  "0x05bcAB91C51104853f796F5D7bd57EF8077E904D src/ZKVerifier.sol:ZKVerifier"
  "0xEd871ed2D9281B175B42597b50748B9Ee8e951F7 src/VaultFactory.sol:VaultFactory"
  "0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0 src/AgentRegistry.sol:AgentRegistry"
  "0x16165ad7A069Ada84F97a6311c9A62c700AC43d8 src/LTVOracle.sol:LTVOracle"
)

for entry in "${contracts[@]}"; do
  addr=$(echo "$entry" | cut -d' ' -f1)
  contract=$(echo "$entry" | cut -d' ' -f2)
  echo "--- Verifying $contract at $addr ---"
  forge verify-contract "$addr" "$contract" \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --compiler-version 0.8.28 \
    --optimizer-runs 200 \
    --evm-version paris \
    --skip-is-verified-check \
    --watch || echo "WARN: verification failed for $contract â€” retry later"
  echo ""
done

echo "Done. Check https://opbnb-testnet.bscscan.com for results."
