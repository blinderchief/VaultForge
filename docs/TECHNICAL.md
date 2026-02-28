# VaultForge â€” Technical Documentation

> Architecture, local setup, deployment guide, and demo walkthrough for judges.

---

## Architecture Overview

VaultForge is a full-stack monorepo with five layers:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Frontend â€” Next.js 16 App Router (Vercel)                   â”‚
â”‚  Privy Auth â†’ wagmi/viem â†’ shadcn/ui + Tailwind v4           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Backend â€” FastAPI + Python 3.12 (Railway / Docker)          â”‚
â”‚  LTV Optimizer (SciPy+PuLP) â†’ ZK Orchestrator â†’ slowapi      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  ZK Layer â€” Circom 2.2.3 + snarkjs (Groth16)                â”‚
â”‚  CollateralThreshold Â· LTVComputation Â· ReputationScore       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Smart Contracts â€” Solidity 0.8.28 on opBNB (Chain ID 5611) â”‚
â”‚  VaultFactory Â· Vault Â· ZKVerifier Â· AgentRegistry Â· LTVOracleâ”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Data â€” Supabase Postgres (RLS) + Redis 7 (price cache)     â”‚
â”‚  12 migrations Â· Row-Level Security on every table            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Data Flow

1. **User** connects via Privy (social or wallet login)
2. **Frontend** sends `deployVault()` tx via wagmi â†’ VaultFactory on opBNB
3. **VaultFactory** deploys an EIP-1167 minimal proxy clone of Vault
4. **User** deposits BNB/BEP-20 tokens into their personal vault
5. **Backend** generates a Groth16 ZK proof via snarkjs (private inputs: amounts; public: threshold)
6. **Frontend** sends `borrow()` tx with proof â†’ Vault â†’ ZKVerifier verifies on-chain
7. **AI Agent** (registered via AgentRegistry) monitors vault health, submits LTV optimizations to LTVOracle
8. **LTVOracle** accepts optimistic LTV updates with a 1-hour challenge window
9. **Supabase** stores vault metadata, proof records, agent actions with RLS enforcement

For the full component diagram with every data flow labeled, see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| L2 Network | opBNB Testnet | Chain ID 5611 |
| Smart Contracts | Solidity + Foundry | 0.8.28 / forge 1.5.0 |
| Contract Libraries | OpenZeppelin v5 | Clones, ReentrancyGuard, Ownable |
| ZK Proofs | Circom + snarkjs (Groth16) | 2.2.3 / 0.7.5 |
| Frontend | Next.js + React + TypeScript | 16.1.6 / 19.2.3 / 5.x |
| Wallet Auth | Privy | 3.14.1 |
| Web3 | wagmi + viem | 3.5.0 / 2.46.0 |
| UI | Tailwind CSS v4 + shadcn/ui | 4.x |
| Backend | FastAPI + Python + UV | 0.115+ / 3.12 |
| Optimization | SciPy + PuLP | 1.14+ / 2.9+ |
| Database | Supabase Postgres | RLS + Realtime |
| Cache | Redis 7 | Price feed TTL 30s |
| CI/CD | GitHub Actions | 5 workflows |
| Containers | Docker Compose | 4 services |

---

## Local Setup

### Option A: Docker (Recommended â€” 3 Commands)

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge
cp .env.example .env    # Contract addresses pre-filled for opBNB testnet
docker compose up --build
```

Services start in order: **Postgres** (`:5432`) â†’ **Redis** (`:6379`) â†’ **Backend** (`:8000`) â†’ **Frontend** (`:3000`)

| Service | URL | Health Check |
|---|---|---|
| Frontend | http://localhost:3000 | Page loads |
| Backend API | http://localhost:8000/docs | Swagger UI |
| Backend Health | http://localhost:8000/health | `{"status":"ok"}` |
| Postgres | localhost:5432 | `pg_isready` |
| Redis | localhost:6379 | `redis-cli ping` |

### Option B: Manual Setup

```bash
# 1. Smart Contracts
cd contracts
forge build            # Compile Solidity
forge test -vvv        # Run 53 tests (unit + integration + ZK verifier)

# 2. Backend
cd ../backend
uv sync                # Install Python dependencies
uv run pytest --cov    # Run 34 tests (98% coverage)
uv run uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd ../frontend
npm install
npm run build          # Verify zero TypeScript errors
npm run dev            # http://localhost:3000

# 4. ZK Circuits (optional â€” pre-compiled artifacts included)
cd ../zk-circuits
npm install
bash scripts/compile.sh
```

### Environment Variables

Copy `.env.example` to `.env`. All contract addresses are pre-filled for opBNB testnet. You only need to add:

| Variable | Required For | Where to Get |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Wallet auth | [Privy Dashboard](https://dashboard.privy.io) |
| `PRIVY_APP_SECRET` | Backend JWT verification | Privy Dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Database | [Supabase Dashboard](https://supabase.com/dashboard) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database (frontend) | Supabase â†’ Settings â†’ API |
| `SUPABASE_SERVICE_ROLE_KEY` | Database (backend) | Supabase â†’ Settings â†’ API |
| `SUPABASE_DB_URL` | Direct DB access | Supabase â†’ Settings â†’ Database |

Full variable list with descriptions: [`.env.example`](../.env.example)

---

## Deployed Contracts (opBNB Testnet)

| Contract | Address | Explorer |
|---|---|---|
| VaultFactory | `0xEd871ed2D9281B175B42597b50748B9Ee8e951F7` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xEd871ed2D9281B175B42597b50748B9Ee8e951F7) |
| Vault (Impl) | `0x671419bb5a8CeF7547f661212030F998B7992ACE` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x671419bb5a8CeF7547f661212030F998B7992ACE) |
| ZKVerifier | `0x05bcAB91C51104853f796F5D7bd57EF8077E904D` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x05bcAB91C51104853f796F5D7bd57EF8077E904D) |
| AgentRegistry | `0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0) |
| LTVOracle | `0x16165ad7A069Ada84F97a6311c9A62c700AC43d8` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x16165ad7A069Ada84F97a6311c9A62c700AC43d8) |

**Deployer:** [`0x97950A98980a2Fc61ea7eb043bb7666845f77071`](https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071)
**On-chain:** 7+ transactions, 3 vault clones deployed, `totalVaults() == 3`
**Full deployment data:** [`contracts/deployments/testnet.json`](../contracts/deployments/testnet.json)

Also see [`bsc.address`](../bsc.address) at repo root for a flat-file summary.

---

## Smart Contract Architecture

### VaultFactory.sol
- Deploys per-user vaults via **EIP-1167 minimal proxies** (207,659 gas per clone â‰ˆ $0.0000002)
- One vault per wallet address enforced
- Emits `VaultDeployed(owner, vaultAddress)` for indexing

### Vault.sol
- **Non-custodial**: each user has their own contract instance
- `deposit()` / `withdraw()` â€” standard BNB and BEP-20 collateral management
- `borrow()` â€” requires valid Groth16 proof verified by ZKVerifier
- `seize()` â€” partial seizure only (max 50% of any token), admin-only
- `ReentrancyGuard` on all state-changing functions

### ZKVerifier.sol
- Verifies **Groth16 proofs** on-chain (bn128 curve)
- **Replay prevention**: proof hash + per-vault incrementing nonce
- Supports 3 circuit types: CollateralThreshold, LTVComputation, ReputationScore

### AgentRegistry.sol
- AI agents **stake 0.01 BNB** minimum to register
- `executeAction()` â€” agents call vault functions on behalf of users
- Fee distribution to agents on successful actions
- Admin can slash malicious agents (forfeit stake)

### LTVOracle.sol
- **Optimistic oracle pattern** â€” off-chain optimizer submits LTV, 1-hour challenge window
- LTV bounds enforced: 10% minimum, 90% maximum (1000â€“9000 bps)
- Anyone can challenge during window; finalizes automatically after expiry

### Security Invariants
- Partial seizure only â€” max 50% of any single token on default
- ZK proof required for every borrow â€” no exceptions
- Replay prevention â€” proof hash + per-vault incrementing nonce
- ReentrancyGuard on all external state-changing functions
- Non-custodial â€” each user has their own vault; no shared pool risk

---

## ZK Circuit Design

Three Groth16 circuits built with Circom 2.2.3:

| Circuit | Private Inputs | Public Inputs | Proves |
|---|---|---|---|
| **CollateralThreshold** | Token amounts, prices | Threshold value | Total collateral â‰¥ threshold |
| **LTVComputation** | Collateral value, debt | LTV ratio | LTV is correctly computed |
| **ReputationScore** | Repayment history | Minimum score | User reputation meets minimum |

- **Proving system:** Groth16 (constant-size proofs, ~200ms proving time)
- **Curve:** BN128 (native EVM precompile support)
- **Trusted setup:** Hermez `powersOfTau28_hez_final_14.ptau` ceremony
- **Proof size:** 3 group elements (pA, pB, pC) â‰ˆ 256 bytes on-chain

---

## Database Schema

12 migrations in [`db/migrations/`](../db/migrations/), all with RLS enabled:

| Table | Purpose | RLS Policy |
|---|---|---|
| `users` | Wallet-authenticated user profiles | Own wallet only |
| `vaults` | Vault records with lifecycle states | Own vaults only |
| `vault_assets` | Collateral positions (ZK commitment hashes only â€” never plaintext) | Own vault assets |
| `loans` | Borrow records linked to ZK proofs | Own loans |
| `zk_proofs` | Groth16 proof storage with status lifecycle | Own proofs |
| `agents` | AI agent registry (mirrors AgentRegistry.sol) | Public read |
| `agent_actions` | Action log for agent operations | Own vault actions |
| `oracle_feeds` | Token price feed snapshots | Public read |
| `ltv_optimizations` | LTV optimization proposals with challenge window | Own optimizations |
| `notifications` | User-facing event alerts | Own notifications |
| `audit_log` | Immutable append-only audit trail | Own audit entries |

**Privacy design:** `vault_assets.collateral_commitment` stores 32-byte Poseidon hashes, never plaintext amounts. Enforced by `CHECK(length(collateral_commitment) = 32)`.

---

## Test Results

All tests passing as of 2026-02-27:

```
# Smart Contracts â€” 53 tests
$ cd contracts && forge test
â”œâ”€â”€ VaultTest: 31 passed (unit tests â€” deploy, deposit, borrow, repay, withdraw, seize, ZK verify)
â”œâ”€â”€ IntegrationTest: 5 passed (full lifecycle: factoryâ†’vaultâ†’depositâ†’borrowâ†’repayâ†’withdraw)
â””â”€â”€ CounterTest: 2 passed (fuzz tests)

# Backend â€” 34 tests, 98% coverage
$ cd backend && uv run pytest --cov=app -q
34 passed in 17.00s
TOTAL: 363 statements, 7 missed, 98% coverage

# Frontend â€” zero TypeScript errors
$ cd frontend && npm run build
âœ“ Compiled successfully in 12.9s (Next.js 16.1.6 Turbopack)
4 routes: /, /_not-found, /dashboard, /vault/create
```

---

## Demo Walkthrough

### Prerequisites
- MetaMask or any Web3 wallet with opBNB testnet configured
- Testnet BNB from [opBNB Bridge](https://opbnb-testnet-bridge.bnbchain.org/deposit)

### Step-by-Step

1. **Open the App** â€” Navigate to https://vaultforge-nu.vercel.app (or `http://localhost:3000` locally)

2. **Connect Wallet** â€” Click "Connect" â†’ Privy modal â†’ choose MetaMask or social login. Ensure you're on opBNB testnet (Chain ID 5611).

3. **Deploy Your Vault** â€” On the dashboard, click "Create Vault". This sends a `deployVault()` transaction to VaultFactory. Confirm in MetaMask. Your personal vault contract is deployed (~207k gas).

4. **Deposit Collateral** â€” Select BNB or a BEP-20 token, enter amount, click "Deposit". Tokens transfer to your vault contract (non-custodial â€” only you control it).

5. **Generate ZK Proof** â€” Click "Borrow". The app generates a Groth16 proof client-side proving your collateral meets the threshold without revealing the actual amount. This takes ~1-2 seconds.

6. **Borrow Funds** â€” The proof is submitted on-chain. ZKVerifier.sol validates it. If valid, Vault.borrow() releases funds to your wallet. The entire flow is private â€” no one sees your balance.

7. **Monitor Health** â€” Dashboard shows vault health factor. AI agents (visible in the Agent panel) continuously optimize your LTV ratio through LTVOracle proposals.

8. **Repay & Withdraw** â€” Repay the loan (partial or full). Once debt is cleared, withdraw your collateral. Reputation score is updated via ZK circuit for future rate improvements.

### API Endpoints (Swagger)

Visit `https://<backend-url>/docs` for interactive API documentation:

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Backend health check |
| `/api/v1/vault/{address}` | GET | Get vault details |
| `/api/v1/vault/create` | POST | Register new vault |
| `/api/v1/optimize/ltv` | POST | Run LTV optimization |
| `/api/v1/agent/register` | POST | Register AI agent |
| `/api/v1/positions/{wallet}` | GET | Get portfolio positions |

---

## Reproducibility

To verify everything works from scratch:

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge

# Contracts
cd contracts && forge test --gas-report   # Expect: 53/53 passing

# Backend
cd ../backend && uv sync && uv run pytest --cov=app -q   # Expect: 34/34, 98% cov

# Frontend
cd ../frontend && npm ci && npm run build   # Expect: 0 errors, 4 routes

# Full stack (Docker)
cd .. && cp .env.example .env && docker compose up --build
# Frontend â†’ http://localhost:3000
# Backend  â†’ http://localhost:8000/docs
```

No external API keys are required for running tests. Only Privy and Supabase credentials are needed for the live demo.
