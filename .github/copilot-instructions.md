# VaultForge — Copilot Instructions

You are building VaultForge: a non-custodial ZK-private intelligent collateral vault 
system on opBNB/BSC. Stack: Solidity 0.8.28 (Foundry), Circom 2.x ZK circuits, 
FastAPI + UV (Python 3.12), Next.js 16 App Router, Supabase Postgres.

Rules you ALWAYS follow:
- Read files before answering — never speculate about code you haven't seen
- No placeholder/TODO logic — implement fully or say you can't
- No over-engineering — only what's explicitly asked
- All secrets in env vars, never hardcoded
- RLS on every Supabase table, service key never exposed to frontend
- Smart contract invariants: partial seizure only, 48h timelock on admin functions
- ZK proof required before any borrow — no exceptions
```

---

### Step 2 — Use **Agent Mode** (not Chat or Edit)

Claude Opus 4.6 is available in VS Code in all modes: chat, ask, edit, and agent.  **Agent mode is what you want** — it lets Claude read your files, create files, run terminal commands, and iterate across your whole codebase autonomously. It's essentially what the `<investigate_before_answering>` guard in the prompt was protecting against — in Agent mode, Claude actually reads your files natively.

Switch to it: bottom of the Copilot Chat panel → model picker → **Claude Opus 4.6** → mode picker → **Agent**

---

### Step 3 — Don't paste the whole prompt at once. Break it by phase

In Agent mode, paste one phase at a time. Copilot has context limits per session and works best with focused tasks:
```
# Start a new Agent session for each phase

Phase 1 prompt:
"Set up the VaultForge monorepo. Create /frontend (Next.js 16 + wagmi + Privy + 
shadcn), /backend (FastAPI + UV pyproject.toml), /contracts (forge init, 
foundry.toml configured for opBNB testnet chainId 5611), /zk-circuits 
(circom + snarkjs), /db (Supabase migrations folder). Add .env.example 
listing ALL environment variables. Add 5 GitHub Actions workflows 
(test-contracts, test-backend, test-frontend, deploy-contracts, deploy-frontend). 
Verify: forge build, uv sync, npm run build all pass."
```

Then for Phase 2:
```
"Now implement the smart contracts. Start with VaultFactory.sol + Vault.sol..."
```

---

### Step 4 — Use `#file:` references to keep context sharp

Instead of relying on Claude to hunt for files, point it explicitly:
```
"Looking at #file:contracts/src/Vault.sol and #file:contracts/src/ZKVerifier.sol, 
implement the borrow() function with ZK proof verification and add the corresponding 
Foundry test in #file:contracts/test/VaultTest.t.sol"