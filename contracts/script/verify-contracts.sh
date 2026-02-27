#!/usr/bin/env bash
# Verify all VaultForge contracts on opBNBScan testnet.
# Usage: bash scripts/verify-contracts.sh
# Requires: ETHERSCAN_API_KEY env var (BSCScan/Etherscan V2 key)

set -euo pipefail

CHAIN_ID=5611

contracts=(
  "0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8 src/ZKVerifier.sol:ZKVerifier"
  "0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28 src/VaultFactory.sol:VaultFactory"
  "0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF src/AgentRegistry.sol:AgentRegistry"
  "0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4 src/LTVOracle.sol:LTVOracle"
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
    --watch || echo "WARN: verification failed for $contract — retry later"
  echo ""
done

echo "Done. Check https://opbnb-testnet.bscscan.com for results."
