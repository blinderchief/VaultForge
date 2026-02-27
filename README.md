# VaultForge

Non-custodial ZK-private collateral vaults with AI-optimized LTV on opBNB.

## Live Links

| Resource | URL |
|---|---|
| **App** | https://vaultforge-nu.vercel.app |
| **Backend API** | https://vaultforge-nu.vercel.app (see `/docs` on Railway deployment) |
| **VaultFactory** | [`0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28`](https://opbnb-testnet.bscscan.com/address/0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28) |
| **ZKVerifier** | [`0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8`](https://opbnb-testnet.bscscan.com/address/0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8) |
| **Explorer** | [opBNB Testnet Scanner](https://opbnb-testnet.bscscan.com) |

---

## The Problem

Over $1.2 trillion in crypto assets sit idle in wallets. Owners can't access credit without liquidation risk or exposing their positions on-chain. Protocols like Venus and Aave demand 150%+ overcollateralization, and every position is public — visible to MEV bots and competitors.

VaultForge solves this with per-user non-custodial vaults on opBNB. Users deposit collateral, generate Groth16 zero-knowledge proofs to borrow without revealing balances, and rely on AI agents to dynamically optimize their Loan-to-Value ratio down to 110–130% — freeing locked capital while preserving privacy.

The system enforces partial seizure only (max 50%), requires ZK proof verification for every borrow, and uses an optimistic oracle with a challenge window for LTV updates. All operations settle on opBNB at sub-cent gas costs.

---

## Repository Structure

```
vaultforge/
├── contracts/           Solidity 0.8.28 — Foundry (5 contracts, 53 tests)
│   ├── src/             VaultFactory, Vault, ZKVerifier, AgentRegistry, LTVOracle
│   ├── test/            Unit, integration, and ZK verifier tests
│   ├── script/          Deployment and verification scripts
│   └── deployments/     Deployed addresses and metadata
├── frontend/            Next.js 16 + React 19 + wagmi + Privy + snarkjs
│   ├── src/app/         Pages: landing, dashboard, vault creation wizard
│   ├── src/components/  BorrowModal, RepayModal, VaultCard, Navbar
│   ├── src/hooks/       useVault, useVaultFactory, useUserVaults
│   ├── src/lib/         api.ts, contracts.ts, zk.ts, wagmi.ts
│   └── public/zk/       WASM + zkey artifacts for browser-side proving
├── backend/             FastAPI + Python 3.12 + UV
│   ├── app/             Routes, CVaR optimizer, Supabase integration
│   └── tests/           34 pytest tests
├── zk-circuits/         Circom 2.x — 3 Groth16 circuits
│   ├── circuits/        CollateralThreshold, LTVComputation, ReputationScore
│   └── build/           Compiled R1CS, WASM, zkey files
├── db/                  Supabase Postgres migrations (12 files, RLS on all)
├── docs/                Architecture, business model, user journey
├── docker-compose.yml   One-command full stack
└── .env.example         All environment variables documented
```

---

## Quick Start

### With Docker

```bash
git clone https://github.com/blinderchief/VaultForge.git && cd VaultForge
cp .env.example .env  # Fill in your keys
docker compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000/docs
```

### Without Docker

```bash
# Frontend
cd frontend && npm install && cp .env.example .env.local  # fill in values
npm run dev  # http://localhost:3000

# Backend
cd backend && uv sync && cp .env.example .env  # fill in values
uv run uvicorn app.main:app --reload --port 8000

# Contracts (build + test only)
cd contracts && forge build && forge test
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy authentication app ID | [dashboard.privy.io](https://dashboard.privy.io) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (RLS enforced) | Supabase → Settings → API |
| `NEXT_PUBLIC_OPBNB_RPC` | opBNB Testnet RPC endpoint | `https://opbnb-testnet-rpc.bnbchain.org` |
| `NEXT_PUBLIC_CHAIN_ID` | Target chain ID | `5611` |
| `NEXT_PUBLIC_VAULT_FACTORY_ADDRESS` | VaultFactory contract address | `contracts/deployments/testnet.json` |
| `NEXT_PUBLIC_VAULT_IMPL_ADDRESS` | Vault implementation address | `contracts/deployments/testnet.json` |
| `NEXT_PUBLIC_ZK_VERIFIER_ADDRESS` | ZKVerifier contract address | `contracts/deployments/testnet.json` |
| `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS` | AgentRegistry contract address | `contracts/deployments/testnet.json` |
| `NEXT_PUBLIC_LTV_ORACLE_ADDRESS` | LTVOracle contract address | `contracts/deployments/testnet.json` |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL | Railway URL or `http://localhost:8000` |

### Backend (`backend/.env`)

| Variable | Description | Where to get it |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) | Supabase → Settings → API |
| `OPBNB_RPC_URL` | opBNB Testnet RPC | `https://opbnb-testnet-rpc.bnbchain.org` |
| `VAULT_FACTORY_ADDRESS` | VaultFactory contract address | `contracts/deployments/testnet.json` |
| `ZK_VERIFIER_ADDRESS` | ZKVerifier contract address | `contracts/deployments/testnet.json` |
| `ZERION_API_KEY` | Zerion API key for portfolio data | [developers.zerion.io](https://developers.zerion.io) |
| `INTERNAL_API_KEY` | API key for agent endpoints | Generate: `openssl rand -hex 32` |
| `CORS_ORIGINS` | Allowed CORS origins | Comma-separated URLs |
| `ENVIRONMENT` | Runtime environment | `development` or `production` |

---

## Deployed Contracts (opBNB Testnet — Chain ID 5611)

| Contract | Address | What it does |
|---|---|---|
| **VaultFactory** | [`0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28`](https://opbnb-testnet.bscscan.com/address/0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28) | Deploys per-user vault clones via EIP-1167 minimal proxies |
| **Vault (Impl)** | [`0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A`](https://opbnb-testnet.bscscan.com/address/0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A) | Collateral custody, ZK-gated borrow, partial seizure (max 50%) |
| **ZKVerifier** | [`0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8`](https://opbnb-testnet.bscscan.com/address/0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8) | Real Groth16 on-chain proof verification with replay prevention |
| **AgentRegistry** | [`0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF`](https://opbnb-testnet.bscscan.com/address/0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF) | AI agent staking (0.01 BNB min), execution, fee distribution, slashing |
| **LTVOracle** | [`0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4`](https://opbnb-testnet.bscscan.com/address/0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4) | Optimistic LTV updates with 1-hour challenge window, 10–90% bounds |

> **Deployer:** [`0x97950A98980a2Fc61ea7eb043bb7666845f77071`](https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071)
> **Total deployment gas:** 3,688,663 ≈ $0.000004 USD

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **L2 Network** | opBNB (Chain ID 5611) | Sub-cent gas, <1s finality |
| **Smart Contracts** | Solidity 0.8.28 + Foundry | Fuzz testing, fast compilation |
| **Contract Patterns** | OpenZeppelin v5 (Clones, ReentrancyGuard) | Audited minimal proxies |
| **ZK Proofs** | Circom 2.x + snarkjs (Groth16) | Constant-size proofs, cheap on-chain verification |
| **Frontend** | Next.js 16 + React 19 + TypeScript 5 | App Router, React Compiler |
| **Wallet Auth** | Privy + wagmi 3.5 + viem 2.46 | Embedded wallets, type-safe contract calls |
| **Styling** | Tailwind CSS v4 | Utility-first dark theme |
| **Backend API** | FastAPI + Python 3.12 + UV | Async, auto-generated OpenAPI docs |
| **Optimization** | SciPy (SLSQP + CVaR) | Portfolio-based LTV optimization |
| **Database** | Supabase Postgres + RLS | Row-level security, real-time subscriptions |
| **CI/CD** | GitHub Actions | Test + deploy contracts, backend, frontend |
| **Containerization** | Docker Compose | One-command full stack |

---

## Running Tests

```bash
# Smart contracts — 53 tests (unit + integration + ZK verifier)
cd contracts && forge test -v

# Backend — 34 tests
cd backend && uv run pytest -v

# Frontend — TypeScript compilation + lint
cd frontend && npm run build && npm run lint
```

---

## Deployment

1. **Contracts** — Already deployed to opBNB Testnet. To redeploy:
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --rpc-url $OPBNB_TESTNET_RPC_URL --broadcast
   ```

2. **Backend (Railway)** — Connect GitHub repo → set env vars → push to `main`.

3. **Frontend (Vercel)** — Connect GitHub repo → set env vars → push to `main`. Auto-deploys on every push.

---

## License

[MIT](./LICENSE) — Copyright © 2026 VaultForge Contributors
