# VaultForge — Frontend

Next.js 16 + React 19 + TypeScript 5 with wagmi/viem for contract interactions, Privy for wallet auth, snarkjs for browser-side Groth16 ZK proofs, and Tailwind CSS v4.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # Fill in your values
npm run dev                   # http://localhost:3000
```

## Environment Variables

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_PRIVY_APP_ID=         # Get from dashboard.privy.io
NEXT_PUBLIC_SUPABASE_URL=         # Get from supabase.com → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Get from supabase.com → Settings → API
NEXT_PUBLIC_OPBNB_RPC=https://opbnb-testnet-rpc.bnbchain.org
NEXT_PUBLIC_CHAIN_ID=5611
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28
NEXT_PUBLIC_VAULT_IMPL_ADDRESS=0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A
NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x528eeF03cE66493FAC386Bd7DAC6E4a89C4786f8
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF
NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### What each variable does

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Authenticates users via Privy embedded wallet or external wallets. |
| `NEXT_PUBLIC_SUPABASE_URL` | Connects to Supabase Postgres for vault metadata and real-time subscriptions. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key for Supabase client; all queries enforced by Row-Level Security. |
| `NEXT_PUBLIC_OPBNB_RPC` | JSON-RPC endpoint the frontend uses to read/write to opBNB testnet. |
| `NEXT_PUBLIC_CHAIN_ID` | Tells wagmi which chain to target (5611 = opBNB Testnet). |
| `NEXT_PUBLIC_VAULT_FACTORY_ADDRESS` | Address of the on-chain VaultFactory that deploys per-user vault clones. |
| `NEXT_PUBLIC_VAULT_IMPL_ADDRESS` | Address of the Vault implementation contract used as the clone template. |
| `NEXT_PUBLIC_ZK_VERIFIER_ADDRESS` | Address of the Groth16 ZKVerifier for on-chain proof verification. |
| `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS` | Address of the AgentRegistry for AI agent staking and execution. |
| `NEXT_PUBLIC_LTV_ORACLE_ADDRESS` | Address of the LTVOracle for optimistic LTV updates. |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL for the FastAPI backend (metrics, LTV optimization, positions). |

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              Landing page with live protocol stats
│   │   ├── layout.tsx            Root layout with Providers wrapper
│   │   ├── globals.css           Tailwind v4 global styles
│   │   ├── dashboard/
│   │   │   └── page.tsx          User vault dashboard with real-time data
│   │   └── vault/
│   │       └── create/
│   │           └── page.tsx      4-step vault creation wizard
│   ├── components/
│   │   ├── ConnectButton.tsx     Privy wallet connect button
│   │   ├── Navbar.tsx            Top navigation bar
│   │   ├── Providers.tsx         Privy + wagmi + React Query providers
│   │   ├── ui/
│   │   │   ├── IrreversibleWarning.tsx
│   │   │   └── ZKProofBadge.tsx
│   │   ├── vault/
│   │   │   ├── BorrowModal.tsx   6-step borrow flow with ZK proof generation
│   │   │   ├── RepayModal.tsx    6-step repay flow with ERC-20 approve
│   │   │   ├── VaultCard.tsx     Vault display card for dashboard
│   │   │   ├── VaultHealthGauge.tsx
│   │   │   └── ZKProofStatus.tsx
│   │   └── wallet/
│   │       └── WalletButton.tsx
│   ├── hooks/
│   │   ├── useUserVaults.ts      Fetches user vaults from Supabase + real-time
│   │   ├── useVault.ts           Borrow, repay, deposit, withdraw hooks
│   │   ├── useVaultFactory.ts    Deploy new vault clone via factory
│   │   └── useVaultHealth.ts     Real-time vault health subscription
│   └── lib/
│       ├── api.ts                Typed API client for backend endpoints
│       ├── contracts.ts          Contract ABIs and addresses
│       ├── privy.ts              Privy configuration
│       ├── supabase.ts           Supabase client instance
│       ├── viem.ts               Viem public client for opBNB
│       ├── wagmi.ts              Wagmi config with opBNB chain
│       └── zk.ts                 Browser-side snarkjs Groth16 proof generation
├── public/
│   └── zk/                       WASM + zkey artifacts for ZK proving
│       ├── CollateralThreshold.wasm
│       ├── CollateralThreshold_final.zkey
│       └── CollateralThreshold_verification_key.json
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Key Pages

| Route | Description |
|---|---|
| `/` | Landing page with live TVL, active vaults count, and average LTV stats from the backend. |
| `/dashboard` | Shows all vaults owned by the connected wallet. Each vault card has Borrow and Repay buttons. |
| `/vault/create` | 4-step wizard: Connect Wallet → Configure Vault → Deposit Collateral (with LTV optimization preview) → Confirm (3 real transactions: deploy clone → approve ERC-20 → deposit). |

## How ZK Proofs Work in the Browser

The frontend generates Groth16 zero-knowledge proofs entirely client-side using snarkjs:

1. **WASM circuit** (`public/zk/CollateralThreshold.wasm`) — the compiled Circom circuit that computes the proof witness.
2. **Proving key** (`public/zk/CollateralThreshold_final.zkey`) — the trusted setup output needed to create proofs.
3. **Verification key** (`public/zk/CollateralThreshold_verification_key.json`) — used on-chain by ZKVerifier.sol.

When a user borrows, `lib/zk.ts` calls `snarkjs.groth16.fullProve()` with the user's collateral data as private inputs. The proof (`pA`, `pB`, `pC`) and public signals are passed to `Vault.borrow()`, which forwards them to `ZKVerifier.verifyProof()` on-chain. The proof proves the user has sufficient collateral without revealing the exact amounts.

Proof generation takes 1–3 seconds in the browser depending on hardware.

## Common Issues + Fixes

| Issue | Fix |
|---|---|
| **Turbopack crash with snarkjs** | `serverExternalPackages: ["snarkjs"]` is already set in `next.config.ts`. If you see `NftJsonAsset` errors, make sure this config is present. |
| **BigInt literal errors** | The project targets ES2017. Use `BigInt(0)` instead of `0n`. |
| **"Module not found: snarkjs"** | Run `npm install` — snarkjs is a runtime dependency. |
| **Wallet not connecting** | Check that `NEXT_PUBLIC_PRIVY_APP_ID` is set and your Privy app has opBNB testnet (chain 5611) enabled. |
| **Backend API returning errors** | Verify `NEXT_PUBLIC_BACKEND_URL` points to a running backend instance. For local dev: `http://localhost:8000`. |
