# VaultForge — Dependencies

> Complete inventory of all third-party packages used across the monorepo.
> **All dependencies are open source.**

---

## Smart Contracts (`contracts/`)

Built with **Foundry** (Solidity 0.8.28, optimizer 200 runs).

| Package | Version | Purpose | License |
|---|---|---|---|
| [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) | v5.x | ERC-20 SafeTransfer, ReentrancyGuard, Initializable, Clones (EIP-1167) | MIT |
| [forge-std](https://github.com/foundry-rs/forge-std) | v1.x | Foundry test utilities, console logging, cheatcodes | MIT / Apache-2.0 |
| **Solidity Compiler** | 0.8.28 | Smart contract language | GPL-3.0 |

---

## Backend (`backend/`)

Built with **FastAPI** on Python 3.12, managed by **UV** (hatchling build system).

### Production Dependencies

| Package | Version | Purpose | License |
|---|---|---|---|
| [fastapi](https://pypi.org/project/fastapi/) | ≥ 0.115.0 | Async REST API framework with auto-generated OpenAPI docs | MIT |
| [uvicorn](https://pypi.org/project/uvicorn/) | ≥ 0.34.0 (standard) | ASGI server for production and development | BSD-3-Clause |
| [pydantic](https://pypi.org/project/pydantic/) | ≥ 2.10.0 | Data validation and serialization using type annotations | MIT |
| [pydantic-settings](https://pypi.org/project/pydantic-settings/) | ≥ 2.7.0 | Environment variable management with type safety | MIT |
| [python-dotenv](https://pypi.org/project/python-dotenv/) | ≥ 1.0.0 | Load `.env` files into environment | BSD-3-Clause |
| [web3](https://pypi.org/project/web3/) | ≥ 7.0.0 | Ethereum/opBNB JSON-RPC interactions (read contracts, send tx) | MIT |
| [supabase](https://pypi.org/project/supabase/) | ≥ 2.11.0 | Supabase Python client for Postgres + RLS | MIT |
| [scipy](https://pypi.org/project/scipy/) | ≥ 1.14.0 | Scientific computing — CVaR optimization for LTV | BSD-3-Clause |
| [pulp](https://pypi.org/project/PuLP/) | ≥ 2.9.0 | Linear programming solver for portfolio optimization | BSD-2-Clause |
| [sqlmodel](https://pypi.org/project/sqlmodel/) | ≥ 0.0.22 | SQLAlchemy + Pydantic ORM layer | MIT |
| [httpx](https://pypi.org/project/httpx/) | ≥ 0.28.0 | Async HTTP client for external API calls (Zerion, Chainlink) | BSD-3-Clause |
| [python-jose](https://pypi.org/project/python-jose/) | ≥ 3.3.0 (cryptography) | JWT/JWS handling for Privy auth verification | MIT |
| [slowapi](https://pypi.org/project/slowapi/) | ≥ 0.1.9 | Rate limiting middleware for FastAPI | MIT |

### Development Dependencies

| Package | Version | Purpose | License |
|---|---|---|---|
| [pytest](https://pypi.org/project/pytest/) | ≥ 8.3.0 | Test framework | MIT |
| [pytest-asyncio](https://pypi.org/project/pytest-asyncio/) | ≥ 0.24.0 | Async test support for FastAPI | Apache-2.0 |
| [pytest-cov](https://pypi.org/project/pytest-cov/) | ≥ 6.0.0 | Coverage reporting | MIT |
| [ruff](https://pypi.org/project/ruff/) | ≥ 0.8.0 | Fast Python linter + formatter | MIT |

---

## Frontend (`frontend/`)

Built with **Next.js 16** (App Router, React Compiler), managed by **npm**.

### Production Dependencies

| Package | Version | Purpose | License |
|---|---|---|---|
| [next](https://www.npmjs.com/package/next) | 16.1.6 | React meta-framework — App Router, SSR, static export | MIT |
| [react](https://www.npmjs.com/package/react) | 19.2.3 | UI component library | MIT |
| [react-dom](https://www.npmjs.com/package/react-dom) | 19.2.3 | React DOM renderer | MIT |
| [@privy-io/react-auth](https://www.npmjs.com/package/@privy-io/react-auth) | ^3.14.1 | Wallet authentication — social login, embedded wallets, Account Abstraction | Proprietary (free tier) |
| [@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) | ^2.98.0 | Supabase client — Postgres queries, Realtime subscriptions | MIT |
| [@tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query) | ^5.90.0 | Server state management, caching, background refetch | MIT |
| [viem](https://www.npmjs.com/package/viem) | ^2.46.0 | TypeScript Ethereum utilities — ABI encoding, contract reads | MIT |
| [wagmi](https://www.npmjs.com/package/wagmi) | ^3.5.0 | React hooks for Ethereum — wallet connection, contract writes | MIT |

### Development Dependencies

| Package | Version | Purpose | License |
|---|---|---|---|
| [typescript](https://www.npmjs.com/package/typescript) | ^5 | Static type checking | Apache-2.0 |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) | ^4 | Utility-first CSS framework | MIT |
| [@tailwindcss/postcss](https://www.npmjs.com/package/@tailwindcss/postcss) | ^4 | Tailwind CSS PostCSS integration | MIT |
| [eslint](https://www.npmjs.com/package/eslint) | ^9 | JavaScript/TypeScript linter | MIT |
| [eslint-config-next](https://www.npmjs.com/package/eslint-config-next) | 16.1.6 | Next.js ESLint preset (accessibility, Core Web Vitals) | MIT |
| [babel-plugin-react-compiler](https://www.npmjs.com/package/babel-plugin-react-compiler) | 1.0.0 | React Compiler — automatic memoization | MIT |
| [@types/node](https://www.npmjs.com/package/@types/node) | ^20 | Node.js type definitions | MIT |
| [@types/react](https://www.npmjs.com/package/@types/react) | ^19 | React type definitions | MIT |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | ^19 | React DOM type definitions | MIT |

---

## ZK Circuits (`zk-circuits/`)

Built with **Circom 2.x** and **snarkjs** (Groth16 proving system).

| Package | Version | Purpose | License |
|---|---|---|---|
| [circomlib](https://www.npmjs.com/package/circomlib) | ^2.0.5 | Standard circuit library (Poseidon hash, comparators, gates, MiMC) | GPL-3.0 |
| [snarkjs](https://www.npmjs.com/package/snarkjs) | ^0.7.5 | Groth16 proof generation + verification, trusted setup, Solidity export | GPL-3.0 |
| [typescript](https://www.npmjs.com/package/typescript) | ^5.5.0 | TypeScript prover interface compilation | Apache-2.0 |
| [@types/node](https://www.npmjs.com/package/@types/node) | ^20.0.0 | Node.js type definitions for prover | MIT |

### External Tools (not npm packages)

| Tool | Version | Purpose | License |
|---|---|---|---|
| [Circom Compiler](https://github.com/iden3/circom) | 2.2.3 | Arithmetic circuit compiler (Rust binary) | GPL-3.0 |
| [Foundry](https://github.com/foundry-rs/foundry) | Latest | Solidity build, test, deploy toolchain | MIT / Apache-2.0 |
| [UV](https://github.com/astral-sh/uv) | Latest | Fast Python package manager (replaces pip + venv) | MIT / Apache-2.0 |
| [Docker](https://www.docker.com/) | 20+ | Containerization for full-stack local dev | Apache-2.0 |

---

## Infrastructure Services

| Service | Purpose | Pricing |
|---|---|---|
| [Supabase](https://supabase.com) | Postgres database + RLS + Realtime subscriptions | Free tier (500 MB) |
| [Vercel](https://vercel.com) | Frontend hosting (Next.js) + CDN | Free tier |
| [Railway](https://railway.app) | Backend hosting (FastAPI) | Free trial / $5/mo |
| [Chainlink](https://chain.link) | BNB/USD price oracle on-chain | Free (decentralized network) |
| [Privy](https://privy.io) | Wallet auth + embedded wallets + AA | Free tier (1,000 MAU) |

---

## License Compatibility

All production dependencies use permissive licenses (MIT, BSD, Apache-2.0) with two exceptions:

- **circomlib** and **snarkjs** are GPL-3.0 — they run as build tools and do not link into the deployed application binary. Generated proofs and verification keys are data outputs, not derivative works.
- **Privy** (`@privy-io/react-auth`) is proprietary but free-tier for hackathon use.

The VaultForge application itself is licensed under [MIT](../LICENSE).
