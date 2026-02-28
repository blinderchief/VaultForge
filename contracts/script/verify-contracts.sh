#!/usr/bin/env bash
# Verify all VaultForge contracts on opBNBScan testnet.
# Usage: bash scripts/verify-contracts.sh
# Requires: ETHERSCAN_API_KEY env var (BSCScan/Etherscan V2 key)

set -euo pipefail

CHAIN_ID=5611

contracts=(
  "0x2925896cABAd4c6B7c505495948F79b3e9308C54 src/ZKVerifier.sol:ZKVerifier"
  "0xb881fAf4e552780f65Ae8FC1053AD46134b71173 src/VaultFactory.sol:VaultFactory"
  "0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b src/AgentRegistry.sol:AgentRegistry"
  "0x953386f1309b2BdA061d895aBddB17b9Db706744 src/LTVOracle.sol:LTVOracle"
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
