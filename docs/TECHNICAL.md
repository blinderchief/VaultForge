# VaultForge — Technical Documentation

> Architecture, local setup, deployment guide, and demo walkthrough for judges.

---

## Architecture Overview

VaultForge is a full-stack monorepo with five layers:

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 16 App Router (Vercel)                   │
│  Privy Auth → wagmi/viem → shadcn/ui + Tailwind v4           │
├──────────────────────────────────────────────────────────────┤
│  Backend — FastAPI + Python 3.12 (Railway / Docker)          │
│  LTV Optimizer (SciPy+PuLP) → ZK Orchestrator → slowapi      │
├──────────────────────────────────────────────────────────────┤
│  ZK Layer — Circom 2.2.3 + snarkjs (Groth16)                │
│  CollateralThreshold · LTVComputation · ReputationScore       │
├──────────────────────────────────────────────────────────────┤
│  Smart Contracts — Solidity 0.8.28 on opBNB (Chain ID 5611) │
│  VaultFactory · Vault · ZKVerifier · AgentRegistry · LTVOracle│
├──────────────────────────────────────────────────────────────┤
│  Data — Supabase Postgres (RLS) + Redis 7 (price cache)     │
│  12 migrations · Row-Level Security on every table            │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User** connects via Privy (social or wallet login)
2. **Frontend** sends `deployVault()` tx via wagmi → VaultFactory on opBNB
3. **VaultFactory** deploys an EIP-1167 minimal proxy clone of Vault
4. **User** deposits BNB/BEP-20 tokens into their personal vault
5. **Backend** generates a Groth16 ZK proof via snarkjs (private inputs: amounts; public: threshold)
6. **Frontend** sends `borrow()` tx with proof → Vault → ZKVerifier verifies on-chain
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

### Option A: Docker (Recommended — 3 Commands)

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge
cp .env.example .env    # Contract addresses pre-filled for opBNB testnet
docker compose up --build
```

Services start in order: **Postgres** (`:5432`) → **Redis** (`:6379`) → **Backend** (`:8000`) → **Frontend** (`:3000`)

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
forge test -vvv        # Run 38 tests (31 unit + 5 integration + 2 fuzz)

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

# 4. ZK Circuits (optional — pre-compiled artifacts included)
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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database (frontend) | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Database (backend) | Supabase → Settings → API |
| `SUPABASE_DB_URL` | Direct DB access | Supabase → Settings → Database |

Full variable list with descriptions: [`.env.example`](../.env.example)

---

## Deployed Contracts (opBNB Testnet)

| Contract | Address | Explorer |
|---|---|---|
| VaultFactory | `0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28) |
| Vault (Impl) | `0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A) |
| ZKVerifier | `0x849Ca487D5DeD85c93fc3600338a419B100833a8` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x849Ca487D5DeD85c93fc3600338a419B100833a8) |
| AgentRegistry | `0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF) |
| LTVOracle | `0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4) |

**Deployer:** [`0x97950A98980a2Fc61ea7eb043bb7666845f77071`](https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071)
**On-chain:** 7+ transactions, 3 vault clones deployed, `totalVaults() == 3`
**Full deployment data:** [`contracts/deployments/testnet.json`](../contracts/deployments/testnet.json)

Also see [`bsc.address`](../bsc.address) at repo root for a flat-file summary.

---

## Smart Contract Architecture

### VaultFactory.sol
- Deploys per-user vaults via **EIP-1167 minimal proxies** (207,659 gas per clone ≈ $0.0000002)
- One vault per wallet address enforced
- Emits `VaultDeployed(owner, vaultAddress)` for indexing

### Vault.sol
- **Non-custodial**: each user has their own contract instance
- `deposit()` / `withdraw()` — standard BNB and BEP-20 collateral management
- `borrow()` — requires valid Groth16 proof verified by ZKVerifier
- `seize()` — partial seizure only (max 50% of any token), admin-only
- `ReentrancyGuard` on all state-changing functions

### ZKVerifier.sol
- Verifies **Groth16 proofs** on-chain (bn128 curve)
- **Replay prevention**: proof hash + per-vault incrementing nonce
- Supports 3 circuit types: CollateralThreshold, LTVComputation, ReputationScore

### AgentRegistry.sol
- AI agents **stake 0.01 BNB** minimum to register
- `executeAction()` — agents call vault functions on behalf of users
- Fee distribution to agents on successful actions
- Admin can slash malicious agents (forfeit stake)

### LTVOracle.sol
- **Optimistic oracle pattern** — off-chain optimizer submits LTV, 1-hour challenge window
- LTV bounds enforced: 10% minimum, 90% maximum (1000–9000 bps)
- Anyone can challenge during window; finalizes automatically after expiry

### Security Invariants
- Partial seizure only — max 50% of any single token on default
- ZK proof required for every borrow — no exceptions
- Replay prevention — proof hash + per-vault incrementing nonce
- ReentrancyGuard on all external state-changing functions
- Non-custodial — each user has their own vault; no shared pool risk

---

## ZK Circuit Design

Three Groth16 circuits built with Circom 2.2.3:

| Circuit | Private Inputs | Public Inputs | Proves |
|---|---|---|---|
| **CollateralThreshold** | Token amounts, prices | Threshold value | Total collateral ≥ threshold |
| **LTVComputation** | Collateral value, debt | LTV ratio | LTV is correctly computed |
| **ReputationScore** | Repayment history | Minimum score | User reputation meets minimum |

- **Proving system:** Groth16 (constant-size proofs, ~200ms proving time)
- **Curve:** BN128 (native EVM precompile support)
- **Trusted setup:** Hermez `powersOfTau28_hez_final_14.ptau` ceremony
- **Proof size:** 3 group elements (pA, pB, pC) ≈ 256 bytes on-chain

---

## Database Schema

12 migrations in [`db/migrations/`](../db/migrations/), all with RLS enabled:

| Table | Purpose | RLS Policy |
|---|---|---|
| `users` | Wallet-authenticated user profiles | Own wallet only |
| `vaults` | Vault records with lifecycle states | Own vaults only |
| `vault_assets` | Collateral positions (ZK commitment hashes only — never plaintext) | Own vault assets |
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
# Smart Contracts — 38 tests
$ cd contracts && forge test
├── VaultTest: 31 passed (unit tests — deploy, deposit, borrow, repay, withdraw, seize, ZK verify)
├── IntegrationTest: 5 passed (full lifecycle: factory→vault→deposit→borrow→repay→withdraw)
└── CounterTest: 2 passed (fuzz tests)

# Backend — 34 tests, 98% coverage
$ cd backend && uv run pytest --cov=app -q
34 passed in 17.00s
TOTAL: 363 statements, 7 missed, 98% coverage

# Frontend — zero TypeScript errors
$ cd frontend && npm run build
✓ Compiled successfully in 12.9s (Next.js 16.1.6 Turbopack)
4 routes: /, /_not-found, /dashboard, /vault/create
```

---

## Demo Walkthrough

### Prerequisites
- MetaMask or any Web3 wallet with opBNB testnet configured
- Testnet BNB from [opBNB Bridge](https://opbnb-testnet-bridge.bnbchain.org/deposit)

### Step-by-Step

1. **Open the App** — Navigate to https://vaultforge.vercel.app (or `http://localhost:3000` locally)

2. **Connect Wallet** — Click "Connect" → Privy modal → choose MetaMask or social login. Ensure you're on opBNB testnet (Chain ID 5611).

3. **Deploy Your Vault** — On the dashboard, click "Create Vault". This sends a `deployVault()` transaction to VaultFactory. Confirm in MetaMask. Your personal vault contract is deployed (~207k gas).

4. **Deposit Collateral** — Select BNB or a BEP-20 token, enter amount, click "Deposit". Tokens transfer to your vault contract (non-custodial — only you control it).

5. **Generate ZK Proof** — Click "Borrow". The app generates a Groth16 proof client-side proving your collateral meets the threshold without revealing the actual amount. This takes ~1-2 seconds.

6. **Borrow Funds** — The proof is submitted on-chain. ZKVerifier.sol validates it. If valid, Vault.borrow() releases funds to your wallet. The entire flow is private — no one sees your balance.

7. **Monitor Health** — Dashboard shows vault health factor. AI agents (visible in the Agent panel) continuously optimize your LTV ratio through LTVOracle proposals.

8. **Repay & Withdraw** — Repay the loan (partial or full). Once debt is cleared, withdraw your collateral. Reputation score is updated via ZK circuit for future rate improvements.

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
cd contracts && forge test --gas-report   # Expect: 38/38 passing

# Backend
cd ../backend && uv sync && uv run pytest --cov=app -q   # Expect: 34/34, 98% cov

# Frontend
cd ../frontend && npm ci && npm run build   # Expect: 0 errors, 4 routes

# Full stack (Docker)
cd .. && cp .env.example .env && docker compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000/docs
```

No external API keys are required for running tests. Only Privy and Supabase credentials are needed for the live demo.
