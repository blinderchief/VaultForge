# VaultForge — Project Overview

> **BNB Chain × YZi Labs Hack Bengaluru 2026 — Smart Collateral Track**

---

## Problem Statement

Over **$1.2 trillion** in crypto assets sit idle in wallets, earning nothing. Their owners face three compounding barriers to accessing credit:

1. **Capital Inefficiency** — Leading DeFi lending protocols (Venus, Aave, Compound) demand 150%+ overcollateralization. To borrow $1,000, you lock up $1,500. This wastes 50% of capital and is worse than TradFi secured lending.

2. **Zero Privacy** — Every deposit, borrow, and liquidation level is visible on-chain. MEV bots front-run liquidations. Competitors see your portfolio. Institutions avoid DeFi entirely because of this transparency.

3. **No Active Management** — Once collateral is deposited, no protocol optimizes it. Users must manually monitor health factors 24/7 or face full liquidation (100% loss). There is no AI, no automation, no risk management layer.

4. **Broken Credit Scoring** — DeFi has no credit scoring. You could have 5 years of perfect repayment history on-chain and still get the same 150% collateral requirement as a day-one user. Meanwhile, TradFi BNPL sees 40%+ default rates among underbanked users because scoring relies on centralized identity.

**Bottom line:** Crypto holders deserve private, capital-efficient borrowing powered by their real blockchain reputation.

---

## Solution

VaultForge is a **non-custodial ZK-private intelligent collateral vault system** on opBNB/BSC that solves all four problems:

| Problem | VaultForge Solution |
|---|---|
| **150% overcollateralization** | AI agents optimize LTV down to 110–130% using convex optimization (SciPy + PuLP) |
| **Public positions** | Groth16 ZK proofs — balances never revealed on-chain, only proof of sufficiency |
| **No active management** | BNB AI Agent Framework — autonomous agents monitor, rebalance, and optimize 24/7 |
| **No credit scoring** | ZK reputation proofs — prove repayment history without revealing transaction details |

### How It Works (4 Steps)

1. **Connect & Deploy** — User connects via Privy (social/wallet login). VaultFactory deploys a personal vault via EIP-1167 minimal proxy on opBNB.
2. **Deposit & Prove** — User deposits BNB/BEP-20 tokens. A Groth16 ZK proof is generated client-side proving collateral sufficiency without revealing amounts.
3. **Borrow & Spend** — ZKVerifier.sol verifies the proof on-chain. Vault.borrow() releases funds. Optional: BNPL installment splitting.
4. **Optimize & Repay** — AI agents continuously optimize LTV through LTVOracle.sol (optimistic challenge-based). User repays to unlock collateral. Reputation score updated via ZK circuit.

---

## Impact & Value Proposition

### For Users
- **30-40% more capital efficiency** — borrow more against the same collateral
- **Full financial privacy** — no one sees your balances, positions, or liquidation levels
- **Set-and-forget management** — AI agents handle rebalancing automatically
- **On-chain credit history** — good behavior earns better rates over time

### For the BNB Ecosystem
- **New DeFi primitive** — ZK-private vaults don't exist on BNB Chain today
- **opBNB showcase** — demonstrates sub-cent operations (full deploy < $0.00001)
- **AI Agent adoption** — first real-world use of BNB AI Agent Framework for DeFi risk management
- **TVL growth** — capital-efficient vaults attract institutional depositors who avoid public protocols

### Market Size
- **$53B** in DeFi lending TVL (DefiLlama, Feb 2026)
- **$5.66B** TVL on BSC ecosystem
- **$11.87B** BNPL market in 2025, growing at 27% CAGR (Grand View Research)
- **560M+** global crypto holders (Triple-A, 2025)

---

## Limitations & Honest Assessment

| Limitation | Status | Mitigation |
|---|---|---|
| **Trusted setup** | Uses Hermez ceremony ptau (not custom) | Plan: protocol-specific ceremony before mainnet |
| **Oracle dependency** | LTV optimization relies on off-chain price feeds | Chainlink integration planned; challenge window provides safety net |
| **Testnet only** | All contracts on opBNB testnet, not mainnet | Audit (CertiK/Halborn) required before mainnet deploy |
| **Solo developer** | Built by 1 person in hackathon timeframe | Core architecture is modular; team expansion planned for Phase 2 |
| **No formal audit** | Smart contracts not yet audited | 53 Foundry tests + fuzzing provide baseline confidence; audit budgeted for Q2 2026 |

---

## Roadmap

| Phase | Timeline | Milestones |
|---|---|---|
| **Phase 1 — Hack MVP** | Feb 2026 ✅ | 5 contracts on opBNB testnet, 3 ZK circuits, AI agent demo, 87 tests passing, full-stack deployed |
| **Phase 2 — Mainnet** | Q2 2026 | CertiK/Halborn audit, mainnet deploy, Venus/PancakeSwap integration, 1,000 active users |
| **Phase 3 — Scale** | Q4 2026 | Ethereum + Arbitrum + Polygon support, institutional vaults, $100M TVL target |
| **Phase 4 — DAO** | Q2 2027 | $FORGE token fair launch, community governance, 10+ chains, protocol sustainability |

---

## Team

| Name | Role | Background |
|---|---|---|
| Suyash Kumar Singh | Full-Stack / Smart Contracts / AI | Solidity, Python, TypeScript, ZK circuits. [@blinderchief](https://github.com/blinderchief) |

---

## References

- [Venus Protocol](https://venus.io) — BSC lending benchmark ($1.32B TVL)
- [DefiLlama](https://defillama.com) — DeFi TVL data
- [opBNB Documentation](https://docs.bnbchain.org/opbnb/) — L2 architecture
- [Groth16 Paper](https://eprint.iacr.org/2016/260) — ZK proof system used
- [BNB AI Agent Framework](https://docs.bnbchain.org) — AI agent architecture
