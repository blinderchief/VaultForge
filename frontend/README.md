# VaultForge â€” Frontend

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
NEXT_PUBLIC_SUPABASE_URL=         # Get from supabase.com â†’ Settings â†’ API
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Get from supabase.com â†’ Settings â†’ API
NEXT_PUBLIC_OPBNB_RPC=https://opbnb-testnet-rpc.bnbchain.org
NEXT_PUBLIC_CHAIN_ID=5611
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0xb881fAf4e552780f65Ae8FC1053AD46134b71173
NEXT_PUBLIC_VAULT_IMPL_ADDRESS=0x45095a5b07Cd7231c4f1B12837b427a9a94AF1C0
NEXT_PUBLIC_ZK_VERIFIER_ADDRESS=0x2925896cABAd4c6B7c505495948F79b3e9308C54
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b
NEXT_PUBLIC_LTV_ORACLE_ADDRESS=0x953386f1309b2BdA061d895aBddB17b9Db706744
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
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ page.tsx              Landing page with live protocol stats
â”‚   â”‚   â”œâ”€â”€ layout.tsx            Root layout with Providers wrapper
â”‚   â”‚   â”œâ”€â”€ globals.css           Tailwind v4 global styles
â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx          User vault dashboard with real-time data
â”‚   â”‚   â””â”€â”€ vault/
â”‚   â”‚       â””â”€â”€ create/
â”‚   â”‚           â””â”€â”€ page.tsx      4-step vault creation wizard
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ ConnectButton.tsx     Privy wallet connect button
â”‚   â”‚   â”œâ”€â”€ Navbar.tsx            Top navigation bar
â”‚   â”‚   â”œâ”€â”€ Providers.tsx         Privy + wagmi + React Query providers
â”‚   â”‚   â”œâ”€â”€ ui/
â”‚   â”‚   â”‚   â”œâ”€â”€ IrreversibleWarning.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ZKProofBadge.tsx
â”‚   â”‚   â”œâ”€â”€ vault/
â”‚   â”‚   â”‚   â”œâ”€â”€ BorrowModal.tsx   6-step borrow flow with ZK proof generation
â”‚   â”‚   â”‚   â”œâ”€â”€ RepayModal.tsx    6-step repay flow with ERC-20 approve
â”‚   â”‚   â”‚   â”œâ”€â”€ VaultCard.tsx     Vault display card for dashboard
â”‚   â”‚   â”‚   â”œâ”€â”€ VaultHealthGauge.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ZKProofStatus.tsx
â”‚   â”‚   â””â”€â”€ wallet/
â”‚   â”‚       â””â”€â”€ WalletButton.tsx
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useUserVaults.ts      Fetches user vaults from Supabase + real-time
â”‚   â”‚   â”œâ”€â”€ useVault.ts           Borrow, repay, deposit, withdraw hooks
â”‚   â”‚   â”œâ”€â”€ useVaultFactory.ts    Deploy new vault clone via factory
â”‚   â”‚   â””â”€â”€ useVaultHealth.ts     Real-time vault health subscription
â”‚   â””â”€â”€ lib/
â”‚       â”œâ”€â”€ api.ts                Typed API client for backend endpoints
â”‚       â”œâ”€â”€ contracts.ts          Contract ABIs and addresses
â”‚       â”œâ”€â”€ privy.ts              Privy configuration
â”‚       â”œâ”€â”€ supabase.ts           Supabase client instance
â”‚       â”œâ”€â”€ viem.ts               Viem public client for opBNB
â”‚       â”œâ”€â”€ wagmi.ts              Wagmi config with opBNB chain
â”‚       â””â”€â”€ zk.ts                 Browser-side snarkjs Groth16 proof generation
â”œâ”€â”€ public/
â”‚   â””â”€â”€ zk/                       WASM + zkey artifacts for ZK proving
â”‚       â”œâ”€â”€ CollateralThreshold.wasm
â”‚       â”œâ”€â”€ CollateralThreshold_final.zkey
â”‚       â””â”€â”€ CollateralThreshold_verification_key.json
â”œâ”€â”€ package.json
â”œâ”€â”€ next.config.ts
â”œâ”€â”€ tsconfig.json
â””â”€â”€ tailwind.config.ts
```

## Key Pages

| Route | Description |
|---|---|
| `/` | Landing page with live TVL, active vaults count, and average LTV stats from the backend. |
| `/dashboard` | Shows all vaults owned by the connected wallet. Each vault card has Borrow and Repay buttons. |
| `/vault/create` | 4-step wizard: Connect Wallet â†’ Configure Vault â†’ Deposit Collateral (with LTV optimization preview) â†’ Confirm (3 real transactions: deploy clone â†’ approve ERC-20 â†’ deposit). || `/presentation-deck` | Hackathon pitch deck — real market data, architecture overview, competitive analysis, deployed contracts, and business model. |
## How ZK Proofs Work in the Browser

The frontend generates Groth16 zero-knowledge proofs entirely client-side using snarkjs:

1. **WASM circuit** (`public/zk/CollateralThreshold.wasm`) â€” the compiled Circom circuit that computes the proof witness.
2. **Proving key** (`public/zk/CollateralThreshold_final.zkey`) â€” the trusted setup output needed to create proofs.
3. **Verification key** (`public/zk/CollateralThreshold_verification_key.json`) â€” used on-chain by ZKVerifier.sol.

When a user borrows, `lib/zk.ts` calls `snarkjs.groth16.fullProve()` with the user's collateral data as private inputs. The proof (`pA`, `pB`, `pC`) and public signals are passed to `Vault.borrow()`, which forwards them to `ZKVerifier.verifyProof()` on-chain. The proof proves the user has sufficient collateral without revealing the exact amounts.

Proof generation takes 1â€“3 seconds in the browser depending on hardware.

## Common Issues + Fixes

| Issue | Fix |
|---|---|
| **Turbopack crash with snarkjs** | `serverExternalPackages: ["snarkjs"]` is already set in `next.config.ts`. If you see `NftJsonAsset` errors, make sure this config is present. |
| **BigInt literal errors** | The project targets ES2017. Use `BigInt(0)` instead of `0n`. |
| **"Module not found: snarkjs"** | Run `npm install` â€” snarkjs is a runtime dependency. |
| **Wallet not connecting** | Check that `NEXT_PUBLIC_PRIVY_APP_ID` is set and your Privy app has opBNB testnet (chain 5611) enabled. |
| **Backend API returning errors** | Verify `NEXT_PUBLIC_BACKEND_URL` points to a running backend instance. For local dev: `http://localhost:8000`. |
