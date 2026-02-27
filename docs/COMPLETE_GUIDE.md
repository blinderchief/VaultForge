# VaultForge — Complete Application Guide

> Non-custodial ZK-private intelligent collateral vault system on opBNB/BSC

This guide covers **everything**: architecture, user flows, every component, every contract, every API endpoint, and how to test it all.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Smart Contracts (On-Chain)](#2-smart-contracts-on-chain)
3. [ZK Circuits (Zero-Knowledge Proofs)](#3-zk-circuits-zero-knowledge-proofs)
4. [Backend (FastAPI)](#4-backend-fastapi)
5. [Frontend (Next.js)](#5-frontend-nextjs)
6. [Database (Supabase Postgres)](#6-database-supabase-postgres)
7. [User Journey — Step by Step](#7-user-journey--step-by-step)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Testing Guide](#9-testing-guide)
10. [FAQ — Questions You'll Be Asked](#10-faq--questions-youll-be-asked)

---

## 1. Architecture Overview

```
┌── Frontend (Next.js 16) ────────────────────────────────────────┐
│  Privy wallet connect → wagmi contract calls → snarkjs ZK proofs │
│  React Query → Backend API → Dashboard, Vault Create, Borrow     │
└─── calls ──┬──────────────────────────────┬─────────────────────┘
             │ HTTP REST                     │ wagmi/viem
             ▼                               ▼
┌── Backend (FastAPI) ──┐        ┌── Smart Contracts (opBNB) ─────┐
│  /vault/create        │        │  VaultFactory (EIP-1167 clones) │
│  /vault/by-wallet/:w  │        │  Vault (deposit/borrow/repay)   │
│  /optimize-ltv        │        │  ZKVerifier (Groth16 on-chain)  │
│  /agent/actions/:w    │        │  AgentRegistry                  │
│  /positions/:w        │        │  LTVOracle                      │
│  /metrics, /health    │        └─────────────────────────────────┘
└───────┬───────────────┘
        │ Supabase service_role_key
        ▼
┌── Database (Supabase Postgres) ───────────────────────────────────┐
│  users · vaults · vault_assets · loans · zk_proofs · agents       │
│  agent_actions · oracle_feeds · ltv_optimizations · notifications  │
│  audit_log    — All with Row Level Security (RLS)                 │
└───────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Layer | Technology | Why |
|-------|-----------|-----|
| **Smart Contracts** | Solidity 0.8.28 + Foundry | Non-custodial vaults. User's assets stay in their own contract clone. No central custody. |
| **ZK Circuits** | Circom 2.x + Groth16 | Privacy. Users prove collateral sufficiency *without revealing exact balances*. Proof is verified on-chain before any borrow. |
| **Frontend** | Next.js 16 + wagmi + Privy | Modern React with native Web3 wallet integration. Privy supports email/social login + hardware wallets. |
| **Backend** | FastAPI + SciPy | AI-powered LTV optimization using CVaR portfolio mathematics. Also serves as a secure proxy to Supabase (RLS). |
| **Database** | Supabase Postgres | Off-chain metadata: vault records, loan tracking, agent actions, oracle prices. All tables have RLS. |

### Deployed Addresses (opBNB Testnet — Chain ID 5611)

| Contract | Address |
|----------|---------|
| VaultFactory | `0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28` |
| Vault Implementation | `0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A` |
| ZKVerifier | `0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8` |
| AgentRegistry | `0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF` |
| LTVOracle | `0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4` |
| Deployer Wallet | `0x97950A98980a2Fc61ea7eb043bb7666845f77071` |

---

## 2. Smart Contracts (On-Chain)

### 2.1 VaultFactory.sol

**Purpose**: Deploys per-user vault clones using EIP-1167 minimal proxy pattern.

**Key mechanics**:
- One vault per user (enforced: `userVaults[owner] != address(0)` check)
- `deployVault(address vaultOwner)` → clones the Vault implementation → calls `vault.initialize(owner, zkVerifier)` → emits `VaultDeployed(owner, vault)`
- Admin can update ZK verifier via `setZKVerifier()` (only affects future vaults)
- Inherits `Ownable` + `ReentrancyGuard`

**Why EIP-1167?** Gas-efficient. Instead of deploying full contract code for each user, we deploy a tiny proxy (~45 bytes) that delegates all calls to a shared implementation. Each user's vault has its own storage but shares the code.

### 2.2 Vault.sol

**Purpose**: The core vault — holds collateral, manages debt, enforces partial seizure.

**Functions**:
| Function | Access | What It Does |
|----------|--------|-------------|
| `initialize(owner, zkVerifier)` | Once (clone init) | Sets owner and ZK verifier |
| `deposit(token, amount)` | Owner only | Pulls ERC-20 tokens from owner via `safeTransferFrom` |
| `withdraw(token, amount)` | Owner only | Returns tokens (only if no debt on that token) |
| `borrow(token, amount, pA, pB, pC, pubSignals)` | Owner only | **ZK-gated**. Verifies Groth16 proof on-chain, checks replay protection, then transfers tokens |
| `repay(token, amount)` | Anyone | Repays debt (anyone can repay on behalf) |
| `triggerDefault(token)` | Anyone (if debt > 0) | Marks vault as defaulted |
| `seize(token)` | Anyone (if defaulted) | Partial seizure: `min(debt × 1.05, collateral × 0.5)` |

**Critical invariants**:
- **ZK proof required before any borrow** — the `borrow()` function calls `zkVerifier.verifyProof(pA, pB, pC, pubSignals)` and reverts with `InvalidProof()` if it fails
- **Replay prevention** — each proof's hash is recorded via `zkVerifier.markProofUsed(proofHash, nonce)`. Reusing a proof reverts with `ProofAlreadyUsed()`
- **Partial seizure only** — max 50% of any single collateral token can be seized, even if debt exceeds that. This is the `MAX_SEIZURE_RATIO = 0.5e18` constant

### 2.3 ZKVerifier.sol

**Purpose**: On-chain Groth16 proof verifier with replay protection.

**How it works**:
1. Contains hardcoded verification key parameters (alpha, beta, gamma, delta, IC points) from the trusted setup
2. `verifyProof(pA, pB, pC, pubSignals)` → Performs elliptic curve pairing checks → Returns `true` if valid
3. `markProofUsed(proofHash, nonce)` → Records the proof hash to prevent replay
4. `isProofUsed(proofHash)` → Check if a proof has been used
5. `vaultNonce(vault)` → Returns current nonce for a vault (auto-incremented)

### 2.4 AgentRegistry.sol

**Purpose**: Registry for AI agents that can propose actions on vaults.

**Key features**:
- Agents register with a stake amount
- Tracks operator addresses, total fees earned
- Used for the autonomous agent system that suggests LTV optimizations

### 2.5 LTVOracle.sol

**Purpose**: On-chain oracle for LTV ratios.

**Key features**:
- Stores per-vault suggested LTV values (in basis points, 0-10000)
- Can be updated by authorized agents
- Used as a reference for vault health calculations

---

## 3. ZK Circuits (Zero-Knowledge Proofs)

### 3.1 What Problem They Solve

Traditional DeFi requires revealing exact collateral amounts on-chain. VaultForge uses ZK proofs so users can **prove their collateral is sufficient without revealing the actual values**.

### 3.2 CircuitsWe have 3 Circom circuits compiled with Groth16:

#### CollateralThreshold.circom
- **Inputs** (private): Array of asset USD values
- **Inputs** (public): Minimum threshold
- **Proves**: "My total collateral ≥ threshold" without revealing individual amounts
- **Used by**: `borrow()` function — proves you have enough collateral to borrow

#### LTVComputation.circom
- **Inputs** (private): Collateral value, debt value
- **Inputs** (public): Max LTV ratio
- **Proves**: "My LTV ratio is within the allowed range"

#### ReputationScore.circom
- **Inputs** (private): Repayment history, account age, etc.
- **Inputs** (public): Minimum reputation threshold
- **Proves**: "My reputation score meets minimum requirements"

### 3.3 How Proof Generation Works (Browser-Side)

```
User clicks "Borrow" →
  Frontend calls generateCollateralProof(assets, threshold) →
    1. Dynamically imports snarkjs
    2. Loads WASM file from /public/zk/CollateralThreshold.wasm
    3. Loads proving key from /public/zk/CollateralThreshold_final.zkey
    4. snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)
    5. Local verification: snarkjs.groth16.verify(vkey, publicSignals, proof)
    6. Formats proof for Solidity: transposes pB matrix
    7. Returns { pA, pB, pC, publicSignals, proofHash, elapsedMs }
```

This takes 5-15 seconds in the browser. The proof is then passed to the smart contract's `borrow()` function where it's verified on-chain.

---

## 4. Backend (FastAPI)

### 4.1 Configuration

All config in `backend/app/core/config.py` via pydantic-settings. Reads from `.env`:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `API_KEY` | Internal API key for agent endpoints |
| `ZERION_API_KEY` | Zerion portfolio API key |
| `CORS_ORIGINS` | Allowed CORS origins |

### 4.2 API Endpoints

| Method | Path | Rate Limit | Auth | Purpose |
|--------|------|------------|------|---------|
| `GET` | `/health` | — | — | Health check with timestamp |
| `GET` | `/metrics` | — | — | TVL, active vaults, average LTV |
| `POST` | `/vault/create` | 10/min | — | Register vault in DB (with optional contract address) |
| `GET` | `/vault/by-wallet/{wallet}` | 30/min | — | List all vaults for a wallet |
| `GET` | `/vault/{id}/health` | 30/min | — | Vault health metrics |
| `POST` | `/optimize-ltv` | 20/min | — | AI-powered LTV optimization |
| `POST` | `/agent/action` | 50/min | X-API-Key | Record agent action (internal) |
| `GET` | `/agent/actions/{wallet}` | 30/min | — | List recent agent actions |
| `GET` | `/positions/{wallet}` | 20/min | — | Portfolio positions (Zerion proxy) |

### 4.3 LTV Optimization Engine

The core AI feature. Located in `backend/app/services/ltv_optimizer.py`.

**Algorithm**: SciPy SLSQP (Sequential Least Squares Programming) to minimize CVaR (Conditional Value-at-Risk).

**How it works**:
1. Receives a list of assets with USD values and volatilities
2. Builds a covariance matrix (intra-bucket correlation = 0.6, cross-bucket = 0.2)
3. Minimizes portfolio CVaR at 95% confidence level
4. Maps CVaR → LTV: lower risk → higher allowed LTV
   - CVaR = 0 → 90% LTV (max)
   - CVaR ≥ 0.5 → 10% LTV (min)
5. Returns suggested LTV in basis points + optimal asset weights

**Why this matters**: Traditional DeFi uses static LTV (e.g., Venus = 150%). VaultForge dynamically adjusts LTV based on the portfolio's actual risk profile. Lower-volatility portfolios get higher LTV → more capital efficiency.

### 4.4 Oracle Service

`backend/app/services/oracle_service.py` — Multi-source price aggregator.

- Fetches from **Binance** and **CoinGecko** simultaneously
- Returns median price (more robust than single source)
- Supports BNB, ETH, BTC, USDT, USDC

---

## 5. Frontend (Next.js)

### 5.1 Provider Stack

```
Root Layout
└── Providers.tsx
    └── PrivyProvider (wallet/auth)
        └── QueryClientProvider (react-query)
            └── WagmiProvider (chain interactions)
                └── App Pages
```

**Privy** handles wallet connection. Supports MetaMask, WalletConnect, email, Google. Chains locked to opBNB Testnet (5611).

### 5.2 Pages

#### Landing Page (`/`)
- Displays VaultForge branding
- **LiveStats** component: fetches `/metrics` from backend, shows TVL, Active Vaults, Avg LTV
- WalletButton for connection
- Navigation to Dashboard and Create Vault

#### Dashboard Page (`/dashboard`)
- **Auth guard**: redirects if not connected
- **VaultCard grid**: fetches user's vaults from backend `GET /vault/by-wallet/{wallet}`
- **AgentFeed sidebar**: fetches real agent actions from `GET /agent/actions/{wallet}`
- Each VaultCard shows: deposited amount, borrowed amount, LTV %, status, health gauge
- VaultCard includes **Borrow** and **Repay** buttons that open modals

#### Create Vault Page (`/vault/create`)
- 4-step wizard:
  1. **Connect** — Connect wallet via Privy
  2. **Configure** — Confirm opBNB Testnet
  3. **Deposit** — Enter ERC-20 token address + amount. Shows AI LTV optimization preview (calls `/optimize-ltv` in preview mode)
  4. **Confirm** — Executes 3 on-chain transactions:
     - TX1: `VaultFactory.deployVault(owner)` → deploys personal vault clone
     - TX2: `ERC20.approve(vaultAddress, amount)` → approves vault to spend tokens
     - TX3: `Vault.deposit(token, amount)` → deposits collateral
  5. After deposit: registers vault in backend → generates ZK proof → redirects to dashboard

### 5.3 Key Components

#### BorrowModal
6-step state machine: `input → warning → proving → signing → confirming → done`
1. User enters token address + amount
2. Warning screen explains ZK proof generation
3. Generates Groth16 proof in browser (5-15 seconds)
4. Calls `Vault.borrow(token, amount, pA, pB, pC, pubSignals)` via wagmi
5. On-chain ZK verification + borrow execution
6. Success screen with explorer link

#### RepayModal
7-step state machine: `input → warning → approving → signing → confirming → done`
1. User enters token address + amount
2. TX1: `ERC20.approve(vaultAddress, amount)`
3. TX2: `Vault.repay(token, amount)`
4. Both transactions confirmed on-chain

#### VaultCard
- Displays vault data from Supabase
- Health gauge (0-100 score based on LTV)
- ZK Proof badge (verified/pending)
- Opens BorrowModal / RepayModal
- Links to block explorer

#### WalletButton
- Connect/disconnect via Privy
- Network switching (warns if not on opBNB)
- Copy address, view on explorer

### 5.4 Hooks

| Hook | Purpose |
|------|---------|
| `useVaultFactory` | Read/write VaultFactory contract (deploy, read user vault) |
| `useVault` | Read/write Vault contract (deposit, borrow, repay, withdraw, getCollateral, getDebt) |
| `useUserVaults` | Fetch vaults from backend API + 15-second polling |

### 5.5 Libraries

| File | Purpose |
|------|---------|
| `lib/api.ts` | Typed REST client for all backend endpoints |
| `lib/contracts.ts` | ABIs + addresses for VaultFactory, Vault, ZKVerifier, AgentRegistry |
| `lib/wagmi.ts` | wagmi config with opBNB Testnet chain |
| `lib/supabase.ts` | Supabase client (anon key, for potential direct reads) |
| `lib/zk.ts` | Browser-side snarkjs Groth16 proof generation |
| `lib/viem.ts` | Public viem client, `getVaultAddressFromTxHash()` for decoding deploy events |

---

## 6. Database (Supabase Postgres)

### 6.1 Table Overview

11 tables, all with Row Level Security (RLS):

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 1 | `users` | Wallet accounts | `wallet_address` (unique), `reputation_score` |
| 2 | `vaults` | Vault records | `vault_contract_address`, `status` (pending/active/defaulted/liquidating/closed), `total_deposited`, `total_borrowed`, `current_ltv_bps` |
| 3 | `vault_assets` | Per-vault collateral | `token_address`, `amount`, `collateral_commitment` (Poseidon hash — never plaintext) |
| 4 | `loans` | Loan records | `principal`, `outstanding_balance`, `interest_rate_bps`, `proof_id` (FK → zk_proofs) |
| 5 | `zk_proofs` | Proof records | `circuit_name` enum, `proof_data` (JSONB), `public_signals` (JSONB), `proof_hash` (unique) |
| 6 | `agents` | Registered AI agents | `operator_address`, `stake_amount`, `total_fees_earned` |
| 7 | `agent_actions` | Agent activity log | `action_type`, `status` (6 states), `parameters` (JSONB), `result` (JSONB) |
| 8 | `oracle_feeds` | Price data | `token_address`, `price_usd`, `source` (Binance/CoinGecko/etc), `confidence` |
| 9 | `ltv_optimizations` | Optimization results | `suggested_ltv_bps`, `challenge_deadline` |
| 10 | `notifications` | User alerts | `type` (12 types), `severity` (4 levels), `read` status |
| 11 | `audit_log` | **Immutable** audit trail | `action` (21 types), `old_value`/`new_value` (JSONB). Triggers prevent UPDATE and DELETE. |

### 6.2 Security Measures

- **RLS on every table** — enforced at the Postgres level
- **Service role key** used only by backend — bypasses RLS for authorized operations
- **Anon key** on frontend — limited access (reads only where RLS permits)
- **Immutable audit log** — database triggers prevent any modification or deletion of audit records
- **Collateral commitments** stored as Poseidon hashes, never plaintext amounts
- **Proof hashes** are unique — prevents duplicate proof submission

---

## 7. User Journey — Step by Step

### 7.1 First Visit

1. User opens https://vaultforge-nu.vercel.app
2. Sees landing page with VaultForge branding and live protocol stats
3. Stats (TVL, Active Vaults, Avg LTV) are fetched from backend `/metrics`
4. User clicks "Connect Wallet"

### 7.2 Wallet Connection

1. Privy modal opens — user can connect with MetaMask, WalletConnect, email, or Google
2. If user's wallet is on wrong network → "Switch to opBNB Testnet" button appears
3. wagmi detects chain ID 5611 → connection complete
4. WalletButton shows truncated address + "opBNB" badge

### 7.3 Creating a Vault

1. User navigates to `/vault/create`
2. **Step 1** (Connect): Already connected → Continue
3. **Step 2** (Configure): Confirms opBNB Testnet → Next
4. **Step 3** (Deposit):
   - Enters ERC-20 token contract address
   - Enters amount (in token units, 18 decimals)
   - If amount > 10 USD: backend `/optimize-ltv` is called in "preview" mode
   - Shows AI optimization result: suggested LTV %, CVaR %, comparison with Venus/Aave
5. **Step 4** (Confirm):
   - Summary shown: network, token, amount, "3 transactions needed"
   - User clicks "Create Vault — 3 Transactions"
   - **TX1**: `VaultFactory.deployVault(userAddress)` → wallet prompt → deploy vault clone
   - Wait for confirmation → decode `VaultDeployed` event → extract vault address
   - **TX2**: `ERC20.approve(vaultAddress, amount)` → wallet prompt
   - Wait for confirmation
   - **TX3**: `Vault.deposit(token, amount)` → wallet prompt
   - Wait for confirmation
   - Backend call: `POST /vault/create` with wallet, vault address, deposited amount
   - ZK proof generated (CollateralThreshold circuit, 5-15 seconds)
   - Success screen → auto-redirect to dashboard

### 7.4 Dashboard

1. After redirect, dashboard fetches vaults from `GET /vault/by-wallet/{wallet}`
2. VaultCard shows: deposited amount, borrowed amount, LTV %, status, health gauge
3. Agent Feed sidebar fetches from `GET /agent/actions/{wallet}`

### 7.5 Borrowing

1. User clicks "Borrow" on a VaultCard
2. BorrowModal opens → enters token address + amount
3. Warning screen → user confirms
4. ZK proof generated in browser (Groth16, CollateralThreshold circuit)
5. `Vault.borrow(token, amount, pA, pB, pC, pubSignals)` sent to chain
6. ZKVerifier verifies proof on-chain → if valid, tokens transferred
7. Success → explorer link shown

### 7.6 Repaying

1. User clicks "Repay" on a VaultCard
2. RepayModal opens → enters token address + amount
3. TX1: `ERC20.approve(vaultAddress, amount)` — approve vault to pull tokens
4. TX2: `Vault.repay(token, amount)` — transfers tokens back, reduces debt
5. Success → explorer link shown

---

## 8. Data Flow Diagrams

### 8.1 Vault Creation Flow

```
User                    Frontend              Blockchain          Backend           Database
 |                        |                      |                  |                  |
 |-- Click "Create" ----->|                      |                  |                  |
 |                        |-- deployVault() ---->|                  |                  |
 |                        |<-- VaultDeployed ----|                  |                  |
 |                        |-- approve() -------->|                  |                  |
 |                        |<-- ApprovalOK -------|                  |                  |
 |                        |-- deposit() -------->|                  |                  |
 |                        |<-- Deposited --------|                  |                  |
 |                        |-- POST /vault/create ----------------->|                  |
 |                        |                      |                  |-- INSERT vault -->|
 |                        |<-- 201 Created -------------------------|                  |
 |                        |-- generateProof() -->|  (browser)       |                  |
 |                        |<-- proof generated --|                  |                  |
 |<-- "Success!" ---------|                      |                  |                  |
```

### 8.2 Borrow Flow (with ZK)

```
User                    Frontend              snarkjs (browser)   Blockchain
 |                        |                      |                  |
 |-- Enter amount ------->|                      |                  |
 |                        |-- fullProve() ------>|                  |
 |                        |                      |-- WASM circuit   |
 |                        |                      |-- zkey file      |
 |                        |<-- proof, signals ---|                  |
 |                        |-- borrow(proof) ---------------------------->|
 |                        |                      |    ZKVerifier.verifyProof()
 |                        |                      |    checkReplay()
 |                        |                      |    markProofUsed()
 |                        |                      |    transfer tokens
 |                        |<-- Borrowed event ----------------------------|
 |<-- "Borrow Success" ---|                      |                  |
```

---

## 9. Testing Guide

### 9.1 Prerequisites

You need:
- **tBNB** (testnet BNB) for gas — get from [opBNB Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet)
- A **test ERC-20 token** on opBNB Testnet (deploy one or use an existing testnet token)
- **MetaMask** or another wallet connected to opBNB Testnet

opBNB Testnet network config:
- Chain ID: 5611
- RPC: `https://opbnb-testnet-rpc.bnbchain.org`
- Explorer: `https://opbnb-testnet.bscscan.com`
- Currency: tBNB

### 9.2 Running Tests Locally

#### Smart Contract Tests (53 tests)
```bash
cd contracts
forge test -vv
```
Tests cover:
- Vault deployment, deposit, withdraw
- ZK-gated borrowing (real Groth16 proofs)
- Repayment, default, partial seizure
- Replay prevention, access control
- Integration tests (full flows)

#### Backend Tests (34 tests)
```bash
cd backend
uv run python -m pytest tests/ -v
```
Tests cover:
- Health and metrics endpoints
- LTV optimizer (SciPy correctness)
- Oracle and positions services
- Vault creation and health routes

#### Frontend Build
```bash
cd frontend
npm run build
```
TypeScript compilation + Next.js optimization. No runtime test suite, but build ensures type safety.

### 9.3 Manual End-to-End Testing

#### Test 1: Health Check
```bash
curl https://your-backend-url/health
# Expected: {"status":"ok","timestamp":"2025-..."}
```

#### Test 2: Create a Vault
1. Open the app → Connect wallet
2. Go to `/vault/create`
3. Enter a testnet ERC-20 token address
4. Enter amount (needs actual token balance!)
5. Confirm 3 transactions in wallet
6. Verify vault appears on dashboard

#### Test 3: LTV Optimization Preview
On the Create Vault page, enter an amount > 10:
- The "AI LTV Optimization" box should appear
- Shows: Dynamic LTV %, CVaR %, convergence status
- Compare: "VaultForge Dynamic LTV: 87.2%" vs "Venus Static: 150%"

#### Test 4: Borrow with ZK Proof
1. From dashboard, click "Borrow" on your vault
2. Enter the same token address + a borrow amount
3. Watch the ZK proof generation (5-15 seconds)
4. Confirm the transaction in wallet
5. The ZKVerifier verifies the proof on-chain
6. If valid: tokens transferred, success shown

#### Test 5: Repay
1. From dashboard, click "Repay"
2. Enter token + amount to repay
3. Approve + repay (2 transactions)
4. Debt reduced on-chain

#### Test 6: Verify On-Chain
After any transaction:
1. Click the explorer link (opBNB Testnet BSCScan)
2. Verify the transaction was successful
3. Check the vault contract's state:
   - `getCollateral(tokenAddress)` → deposited amount
   - `getDebt(tokenAddress)` → borrowed amount

### 9.4 Testing Backend Endpoints

```bash
# Metrics
curl https://your-backend-url/metrics

# Create vault (with contract address)
curl -X POST https://your-backend-url/vault/create \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x1234...","vault_contract_address":"0x5678...","total_deposited":"1000000000000000000"}'

# List vaults by wallet
curl https://your-backend-url/vault/by-wallet/0x1234...

# Optimize LTV (preview mode)
curl -X POST https://your-backend-url/optimize-ltv \
  -H "Content-Type: application/json" \
  -d '{"vault_id":"preview","assets":[{"symbol":"BNB","value_usd":1000,"volatility":0.45}]}'

# Agent actions
curl https://your-backend-url/agent/actions/0x1234...
```

### 9.5 Docker Testing

```bash
# Build and run all services
docker compose up --build

# Services:
# - postgres:5432
# - redis:6379
# - backend:8000
# - frontend:3000
```

---

## 10. FAQ — Questions You'll Be Asked

### "How does ZK privacy work here?"

When a user borrows, they need to prove their collateral is sufficient. Instead of revealing "I have $10,000 in ETH and $5,000 in BNB," they generate a zero-knowledge proof that says "my total collateral exceeds $X threshold" without revealing the breakdown. This proof is verified on-chain by the ZKVerifier contract before the borrow is allowed. The proof uses Groth16 (a SNARK scheme) with a trusted setup — the circuit is compiled from Circom, and proof generation happens entirely in the user's browser using snarkjs.

### "What makes this non-custodial?"

Each user gets their own Vault contract clone (EIP-1167 minimal proxy). The user's wallet address is the `owner` of their vault. Only the owner can deposit, withdraw, or borrow. No admin key can access user funds. The VaultFactory deploys the clones, but once deployed, each vault is fully controlled by its owner.

### "How does the AI LTV optimization work?"

The backend uses SciPy's SLSQP optimizer to minimize Conditional Value-at-Risk (CVaR) of the collateral portfolio. It considers:
- Each asset's volatility
- Correlations between assets (same-bucket: ρ=0.6, cross-bucket: ρ=0.2)
- Portfolio weights
- 95% confidence level

Lower portfolio risk → higher allowed LTV → more capital efficiency. Traditional DeFi uses static 150% collateral ratio; VaultForge dynamically adjusts to the actual risk.

### "What happens if a vault defaults?"

1. Anyone can call `triggerDefault(token)` if there's outstanding debt
2. The vault is marked as defaulted
3. Seizure: `seize(token)` can be called — takes `min(debt × 1.05, collateral × 0.5)`
4. **Partial seizure invariant**: at most 50% of any single collateral token is seized
5. This protects vault owners from losing everything — even in default

### "Why opBNB?"

opBNB is a Layer 2 on BNB Chain with:
- Very low gas fees (~0.001 USD per transaction)
- Fast block times (~1 second)
- EVM compatible (all Solidity tools work)
- Growing DeFi ecosystem

For a ZK-proof-intensive application, low gas is critical because proof verification is expensive.

### "What are the security measures?"

1. **Smart Contracts**: ReentrancyGuard on all state-changing functions, SafeERC20 for token transfers, Ownable for access control, ZK proof verification before borrows, replay protection
2. **Backend**: Rate limiting (slowapi), API key auth for internal endpoints, input validation (Pydantic), CORS configuration
3. **Database**: RLS on all 11 tables, service_role_key never exposed to frontend, immutable audit log with trigger protection
4. **Frontend**: Privy for wallet auth, chain ID validation, address format validation

### "What's the tech stack?"

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.28, Foundry, OpenZeppelin |
| ZK Proofs | Circom 2.x, snarkjs, Groth16 |
| Frontend | Next.js 16, React 19, wagmi 3.5, viem 2.46, Privy, Tailwind v4 |
| Backend | FastAPI, Python 3.12, UV, SciPy, httpx |
| Database | Supabase Postgres with RLS |
| CI/CD | GitHub Actions (5 workflows) |
| Deployment | Vercel (frontend), opBNB Testnet (contracts) |

### "How many tests?"

- **53** Foundry tests (smart contracts)
- **34** pytest tests (backend)
- Frontend: TypeScript strict mode + build-time validation

### "Can you show the ZK proof on-chain?"

Yes. Every borrow transaction includes the ZK proof parameters. You can verify on [opBNB BSCScan](https://opbnb-testnet.bscscan.com):
1. Find a borrow transaction
2. Decode the input data — you'll see `pA`, `pB`, `pC`, `pubSignals`
3. The ZKVerifier contract verified this proof before the borrow was executed
4. The proof hash was recorded to prevent replay
