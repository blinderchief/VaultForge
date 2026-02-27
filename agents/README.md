# VaultForge AI Agents

AI agent implementations for vault management on opBNB.

## Architecture

Agents register on-chain via `AgentRegistry.sol` (min 0.01 BNB stake), then execute vault actions through the `executeAction()` function. The `LTVOracle.sol` optimistic oracle validates agent-submitted LTV values with a 1-hour challenge window.

## Agent Types

| Agent | Purpose | Status |
|---|---|---|
| **LTV Optimizer** | Dynamically adjusts LTV ratio (110–130%) using SciPy/PuLP | ✅ Backend implementation |
| **Health Monitor** | Watches vault health factor, triggers rebalance | ✅ Backend implementation |
| **Yield Strategist** | Cross-protocol yield optimization | 🔜 Planned (Phase 2) |

## Running Agents

Agents are orchestrated by the FastAPI backend (`backend/app/services/optimizer.py`). To run:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The `/optimize` endpoint triggers the LTV optimization agent. The `/vaults/{id}/health` endpoint runs the health monitor.

## On-Chain Integration

- **Registration:** `AgentRegistry.registerAgent{value: 0.01 ether}()`
- **Execution:** `AgentRegistry.executeAction(vaultAddress, actionData)`
- **Fee claim:** `AgentRegistry.claimFee()` after profitable rebalances
- **Slashing:** Admin can slash misbehaving agents via `AgentRegistry.slashAgent()`

## Smart Contract

See [`contracts/src/AgentRegistry.sol`](../contracts/src/AgentRegistry.sol) for the on-chain agent framework.
