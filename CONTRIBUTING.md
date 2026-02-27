# Contributing to VaultForge

Thanks for your interest in contributing to VaultForge! This guide will help you get started.

## Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/VaultForge.git
cd VaultForge
```

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in **all** required values in `.env`. See comments in `.env.example` for descriptions.
   - `DEPLOYER_PRIVATE_KEY` — your testnet wallet key (never use mainnet keys)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard
   - `SUPABASE_SERVICE_ROLE_KEY` — backend only, never expose to frontend
   - `NEXT_PUBLIC_PRIVY_APP_ID` — from Privy dashboard

## Running Locally

### Option A: All-in-one script
```bash
chmod +x scripts/run-local.sh
./scripts/run-local.sh
```

### Option B: Manual (recommended for development)

**Backend** (FastAPI):
```bash
cd backend
uv sync                        # install dependencies
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (Next.js):
```bash
cd frontend
npm install
npm run dev                    # starts on http://localhost:3000
```

**Contracts** (Foundry):
```bash
cd contracts
forge build                    # compile
forge test                     # run tests
```

## Running Tests

All three suites must pass before submitting a PR:

```bash
# Smart contracts (Foundry)
cd contracts && forge test -vv

# Backend (pytest)
cd backend && uv run pytest tests/ -v

# Frontend (Next.js build = type check)
cd frontend && npm run build
```

## Database Migrations

```bash
chmod +x scripts/seed-db.sh
./scripts/seed-db.sh           # applies all migrations in db/migrations/
```

## PR Guidelines

1. **Branch from `main`** — use descriptive branch names: `feat/vault-timelock`, `fix/ltv-bounds`
2. **One concern per PR** — don't mix features with refactors
3. **Tests required** — every PR must include tests for new/changed behavior
4. **All suites green** — `forge test`, `pytest`, and `next build` must all pass
5. **No secrets** — never commit `.env`, private keys, or service role keys
6. **Conventional commits** — use `feat:`, `fix:`, `docs:`, `test:`, `chore:` prefixes
7. **Request review** — tag at least one maintainer

## Code Standards

- **Solidity**: Solidity 0.8.28, OpenZeppelin v5, NatSpec comments on public functions
- **Python**: Python 3.12, type hints, Pydantic models, `ruff` for linting
- **TypeScript**: Strict mode, no `any` types, Tailwind CSS v4 for styling
- **Security**: ReentrancyGuard on all state-changing functions with external calls. ZK proof required before any borrow.

## Questions?

Open an issue or reach out in the project Discord.
