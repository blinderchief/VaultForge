# VaultForge â€” Hackathon Submission

> **BNB Chain Ã— YZi Labs Hack Bengaluru 2026**
> **Track:** Smart Collateral

---

## Links

| Item | URL |
|---|---|
| **GitHub Repository** | https://github.com/blinderchief/VaultForge |
| **Live Demo** | https://vaultforge-nu.vercel.app |
| **Demo Video** | See [TECHNICAL.md â€” Demo Walkthrough](./docs/TECHNICAL.md#demo-walkthrough-for-judges) |
| **Tweet** | â€” |

---

## Deployed Contracts (opBNB Testnet â€” Chain ID 5611)

| Contract | Address | opBNBScan |
|---|---|---|
| **VaultFactory** | `0xEd871ed2D9281B175B42597b50748B9Ee8e951F7` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0xEd871ed2D9281B175B42597b50748B9Ee8e951F7) |
| **Vault (Implementation)** | `0x671419bb5a8CeF7547f661212030F998B7992ACE` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x671419bb5a8CeF7547f661212030F998B7992ACE) |
| **ZKVerifier** | `0x05bcAB91C51104853f796F5D7bd57EF8077E904D` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x05bcAB91C51104853f796F5D7bd57EF8077E904D) |
| **AgentRegistry** | `0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0xD233dEbF4C760f93AA61C6fA7f668c19CA93aaC0) |
| **LTVOracle** | `0x16165ad7A069Ada84F97a6311c9A62c700AC43d8` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x16165ad7A069Ada84F97a6311c9A62c700AC43d8) |

**Deployer:** [`0x97950A98980a2Fc61ea7eb043bb7666845f77071`](https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071)
**On-chain activity:** 7+ transactions, 3 vault clones deployed, `totalVaults() == 3`

---

## Team

| Name | Role | GitHub |
|---|---|---|
| Suyash Kumar Singh | Full-Stack / Smart Contracts / AI | [@blinderchief](https://github.com/blinderchief) |

---

## Project Description

VaultForge is a **non-custodial vault system** where users deposit collateral into per-user smart contracts on opBNB, generate **Groth16 zero-knowledge proofs** to borrow without revealing balances or positions publicly, and rely on **BNB AI agents** to dynamically optimize their Loan-to-Value ratio from the typical 150% down to **110â€“130%** â€” freeing locked capital. The result: cheaper borrowing, full privacy, algorithmic risk management, and an intent-based BNPL layer â€” all settled on BNB Chain's fastest L2.

---

## What We Built

- **5 Solidity contracts** on opBNB testnet (VaultFactory, Vault, ZKVerifier, AgentRegistry, LTVOracle)
- **3 Groth16 ZK circuits** (CollateralThreshold, LTVComputation, ReputationScore)
- **FastAPI backend** with LTV optimization engine (SciPy + PuLP)
- **Next.js 16 frontend** with Privy wallet auth + wagmi
- **Supabase Postgres** with RLS on every table
- **Docker Compose** one-command full stack
- **53 Foundry tests** (unit + integration + ZK verifier) â€” all passing
- **34 pytest tests** (98% code coverage) â€” all passing
- **Clean `npm run build`** â€” zero TypeScript errors

---

## How to Run

```bash
git clone https://github.com/blinderchief/VaultForge.git
cd VaultForge
cp .env.example .env    # Contract addresses pre-filled
docker compose up --build
# Open http://localhost:3000
```

Full setup guide: [`docs/SETUP.md`](./docs/SETUP.md)
