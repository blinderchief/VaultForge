# VaultForge — Hackathon Submission

> **BNB Chain × YZi Labs Hack Bengaluru 2026**
> **Track:** Smart Collateral

---

## Links

| Item | URL |
|---|---|
| **GitHub Repository** | https://github.com/blinderchief/VaultForge |
| **Live Demo** | https://vaultforge.vercel.app |
| **Demo Video** | _Recording in progress — link to be added before deadline_ |
| **Tweet** | _To be posted — link to be added before deadline_ |

---

## Deployed Contracts (opBNB Testnet — Chain ID 5611)

| Contract | Address | opBNBScan |
|---|---|---|
| **VaultFactory** | `0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28) |
| **Vault (Implementation)** | `0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x1777f993b35fe74EcA9178DA576a71aaf9F06f8A) |
| **ZKVerifier** | `0x849Ca487D5DeD85c93fc3600338a419B100833a8` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x849Ca487D5DeD85c93fc3600338a419B100833a8) |
| **AgentRegistry** | `0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0xD5932aF5c315C0A1fD9D486E0f58b7C210866ADF) |
| **LTVOracle** | `0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4` | [View & Verify](https://opbnb-testnet.bscscan.com/address/0x4B6171fA771fdA1F86445a5C06b0d5dA11875BC4) |

**Deployer:** [`0x97950A98980a2Fc61ea7eb043bb7666845f77071`](https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071)
**On-chain activity:** 7+ transactions, 3 vault clones deployed, `totalVaults() == 3`

---

## Team

| Name | Role | GitHub |
|---|---|---|
| Suyash Kumar Singh | Full-Stack / Smart Contracts / AI | [@blinderchief](https://github.com/blinderchief) |

---

## Project Description

VaultForge is a **non-custodial vault system** where users deposit collateral into per-user smart contracts on opBNB, generate **Groth16 zero-knowledge proofs** to borrow without revealing balances or positions publicly, and rely on **BNB AI agents** to dynamically optimize their Loan-to-Value ratio from the typical 150% down to **110–130%** — freeing locked capital. The result: cheaper borrowing, full privacy, algorithmic risk management, and an intent-based BNPL layer — all settled on BNB Chain's fastest L2.

---

## What We Built

- **5 Solidity contracts** on opBNB testnet (VaultFactory, Vault, ZKVerifier, AgentRegistry, LTVOracle)
- **3 Groth16 ZK circuits** (CollateralThreshold, LTVComputation, ReputationScore)
- **FastAPI backend** with LTV optimization engine (SciPy + PuLP)
- **Next.js 16 frontend** with Privy wallet auth + wagmi
- **Supabase Postgres** with RLS on every table
- **Docker Compose** one-command full stack
- **38 Foundry tests** (31 unit + 5 integration + 2 fuzz) — all passing
- **34 pytest tests** (98% code coverage) — all passing
- **Clean `npm run build`** — zero TypeScript errors

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
