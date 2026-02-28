# VaultForge — Local Setup Guide

> **Time to run:** ~5 minutes with Docker, ~10 minutes without Docker.
> **Prerequisites:** Git, Docker Desktop (recommended) OR Node.js 20+, Python 3.12+, Foundry.

---

## Option A: Docker (Recommended — One Command)

This starts the entire stack: Postgres, Redis, Backend, and Frontend.

### Step 1 — Clone the repository

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge
```

### Step 2 — Create your environment file

```bash
cp .env.example .env
```

Open `.env` in any editor and fill in the required values:

```ini
# ── REQUIRED for local dev ──────────────────────────────────────────
# These are already set to working defaults in .env.example:
OPBNB_TESTNET_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
NEXT_PUBLIC_CHAIN_ID=5611
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000

# ── Deployed contract addresses (already populated) ─────────────────
# These are pre-filled with our testnet deployment:
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xb881fAf4e552780f65Ae8FC1053AD46134b71173
NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x2925896cABAd4c6B7c505495948F79b3e9308C54
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b
NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x953386f1309b2BdA061d895aBddB17b9Db706744

# ── OPTIONAL (features degrade gracefully without these) ────────────
NEXT_PUBLIC_PRIVY_APP_ID=           # Get from https://dashboard.privy.io
PRIVY_APP_SECRET=                   # Privy dashboard → Settings → API Keys
NEXT_PUBLIC_SUPABASE_URL=           # Get from https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=          # Supabase → Settings → API (keep secret)
DEPLOYER_PRIVATE_KEY=               # Only needed for contract deployment
ETHERSCAN_API_KEY=                  # Only needed for contract verification
```

> **Note:** The app runs locally with just the RPC URL and contract addresses. Privy and Supabase are optional for local development — the UI will show connection prompts but the core vault logic works.

### Step 3 — Start everything

```bash
docker compose up --build
```

That's it. Docker Compose starts 4 services in order with health checks:

| Service | Port | URL | Health Check |
|---|---|---|---|
| **Postgres 16** | 5432 | `postgresql://postgres:vaultforge_local@localhost:5432/vaultforge` | `pg_isready` |
| **Redis 7** | 6379 | `redis://localhost:6379` | `redis-cli ping` |
| **Backend (FastAPI)** | 8000 | http://localhost:8000/docs | `GET /health` |
| **Frontend (Next.js)** | 3000 | http://localhost:3000 | HTTP 200 check |

### Step 4 — Open the app

- **Frontend:** http://localhost:3000
- **Backend API docs (Swagger):** http://localhost:8000/docs
- **Backend health check:** http://localhost:8000/health

### Stopping

```bash
# Stop all services
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v
```

---

## Option B: Manual Setup (Without Docker)

Use this if you prefer running services individually or if Docker isn't available.

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 20+ | https://nodejs.org |
| **Python** | 3.12+ | https://python.org |
| **UV** (Python package manager) | Latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Foundry** (Forge, Cast) | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **Git** | Any | https://git-scm.com |

### Step 1 — Clone and configure

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge
cp .env.example .env
# Edit .env with your values (see Option A, Step 2)
```

### Step 2 — Smart Contracts (Foundry)

```bash
cd contracts
forge install          # Install OpenZeppelin, forge-std
forge build            # Compile all contracts
forge test -vvv        # Run 53 tests (should all pass)
cd ..
```

Expected output:
```
[PASS] testDepositAndWithdraw() (gas: ...)
[PASS] testBorrowWithValidProof() (gas: ...)
...
Test result: ok. 38 passed; 0 failed;
```

### Step 3 — Backend (FastAPI + Python)

```bash
cd backend
uv sync                # Install all Python dependencies
uv run pytest          # Run 41 tests (should all pass)
uv run uvicorn app.main:app --reload --port 8000
# Backend now running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
cd ..
```

> **Note:** The backend expects Postgres at `SUPABASE_DB_URL`. For local dev without Supabase, the health endpoint and API docs still work. Set `SUPABASE_DB_URL=postgresql://postgres:vaultforge_local@localhost:5432/vaultforge` if running Postgres locally.

### Step 4 — Frontend (Next.js)

```bash
cd frontend
npm install            # Install all dependencies
npm run dev            # Start dev server with hot reload
# Frontend now running at http://localhost:3000
cd ..
```

For a production build:
```bash
npm run build          # Compiles TypeScript, generates static pages
npm start              # Runs production server on :3000
```

### Step 5 — ZK Circuits (Optional)

Only needed if you want to modify or recompile the Circom circuits:

```bash
cd zk-circuits
npm install            # Install snarkjs and dependencies
bash scripts/compile.sh  # Compile circuits and generate proving keys
cd ..
```

This compiles 3 circuits (CollateralThreshold, LTVComputation, ReputationScore) and generates the Groth16 proving/verification keys.

---

## Database Setup (Supabase)

VaultForge uses Supabase Postgres with Row-Level Security (RLS) on every table.

### Option 1: Use Supabase Cloud (Recommended)

1. Create a project at https://supabase.com/dashboard
2. Copy credentials to `.env`:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
   ```
3. Run migrations:
   ```bash
   # Migrations are in db/migrations/ — apply them in order
   psql $SUPABASE_DB_URL -f db/migrations/001_create_tables.sql
   # Or use the Supabase CLI:
   supabase db push
   ```

### Option 2: Local Postgres (Docker)

If using `docker compose up`, Postgres starts automatically with migrations applied from `db/migrations/`.

---

## Verifying Everything Works

After setup, verify each component:

```bash
# 1. Contracts compile and tests pass
cd contracts && forge test
# Expected: 53 passing tests

# 2. Backend starts and responds
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# 3. Frontend loads
curl -s http://localhost:3000 | head -1
# Expected: <!DOCTYPE html>

# 4. API docs accessible
# Open http://localhost:8000/docs in browser
# Expected: Swagger UI with all endpoints listed
```

---

## Deployed Testnet Contracts

VaultForge is already deployed on **opBNB Testnet** (Chain ID 5611). You can interact with the live contracts:

| Contract | Address | Explorer |
|---|---|---|
| **VaultFactory** | `0xb881fAf4e552780f65Ae8FC1053AD46134b71173` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xb881fAf4e552780f65Ae8FC1053AD46134b71173) |
| **Vault (impl)** | `0x45095a5b07Cd7231c4f1B12837b427a9a94AF1C0` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x45095a5b07Cd7231c4f1B12837b427a9a94AF1C0) |
| **ZKVerifier** | `0x2925896cABAd4c6B7c505495948F79b3e9308C54` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x2925896cABAd4c6B7c505495948F79b3e9308C54) |
| **AgentRegistry** | `0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b) |
| **LTVOracle** | `0x953386f1309b2BdA061d895aBddB17b9Db706744` | [opBNBScan](https://opbnb-testnet.bscscan.com/address/0x953386f1309b2BdA061d895aBddB17b9Db706744) |

Full deployment data: [`contracts/deployments/testnet.json`](../contracts/deployments/testnet.json)

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `docker compose up` fails with port conflict | Another service is using port 5432, 6379, 8000, or 3000. Stop the conflicting service or change ports in `docker-compose.yml` |
| `forge build` fails | Run `foundryup` to update Foundry. Ensure you're in the `contracts/` directory |
| `uv sync` fails | Install UV: `curl -LsSf https://astral.sh/uv/install.sh \| sh`. On Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| `npm install` fails | Ensure Node.js 20+: `node --version`. Delete `node_modules` and retry |
| Backend can't connect to Postgres | Check `SUPABASE_DB_URL` in `.env`. For Docker: it connects automatically. For manual: ensure Postgres is running on port 5432 |
| Frontend shows "connection refused" | Ensure backend is running on port 8000. Check `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in `.env` |
| ZK circuit compilation fails | Ensure `circom` is installed: `npm install -g circom`. Requires Node.js 20+ |

---

## Project Structure Reference

```
vaultforge/
├── contracts/              # Solidity 0.8.28 — Foundry
│   ├── src/                #   5 production contracts
│   ├── test/               #   53 tests (unit + integration + ZK verifier)
│   ├── script/             #   Deploy.s.sol, verify-contracts.sh
│   └── deployments/        #   testnet.json (deployed addresses)
├── backend/                # FastAPI + Python 3.12
│   ├── app/                #   API routes, optimizer, models
│   ├── tests/              #   41 pytest tests
│   ├── Dockerfile          #   Production container
│   └── pyproject.toml      #   UV dependencies
├── frontend/               # Next.js 16 + React 19
│   ├── src/app/            #   Pages, components, providers
│   ├── Dockerfile          #   Multi-stage production build
│   └── package.json        #   npm dependencies
├── zk-circuits/            # Circom 2.x — 3 Groth16 circuits
│   ├── circuits/           #   .circom source files
│   ├── build/              #   Compiled artifacts
│   └── scripts/            #   compile.sh
├── db/                     # Supabase migrations
│   └── migrations/         #   SQL files with RLS policies
├── docs/                   # Documentation
│   ├── SETUP.md            #   ← You are here
│   ├── ARCHITECTURE.md     #   System design & data flows
│   ├── USER_JOURNEY.md     #   User personas & flows
│   ├── BUSINESS_MODEL.md   #   Revenue, tokenomics, GTM
│   └── DEPENDENCIES.md     #   Full dependency inventory
├── docker-compose.yml      # One-command full stack
├── .env.example            # All env vars documented
└── README.md               # Project overview
```
