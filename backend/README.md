# VaultForge â€” Backend

FastAPI + Python 3.12 backend for ZK-private collateral vaults on opBNB. Provides LTV optimization (CVaR-based via SciPy), vault management, portfolio positions proxy (Zerion), and AI agent action recording. Uses Supabase Postgres with Row-Level Security and slowapi rate limiting.

## Prerequisites

- Python 3.12+
- [UV](https://docs.astral.sh/uv/) (`pip install uv`)

## Setup

```bash
cd backend
uv sync
cp .env.example .env   # Fill in your values
uv run uvicorn app.main:app --reload --port 8000
# API docs â†’ http://localhost:8000/docs
```

## Environment Variables

Create `backend/.env` with:

```env
SUPABASE_URL=             # Get from supabase.com â†’ Settings â†’ API
SUPABASE_SERVICE_KEY=     # Service role key (NOT anon key) â€” bypasses RLS
OPBNB_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
VAULT_FACTORY_ADDRESS=0xEd871ed2D9281B175B42597b50748B9Ee8e951F7
ZK_VERIFIER_ADDRESS=0x05bcAB91C51104853f796F5D7bd57EF8077E904D
AGENT_PRIVATE_KEY=        # Generate: cast wallet new
ZERION_API_KEY=           # Get from developers.zerion.io
INTERNAL_API_KEY=         # Generate: openssl rand -hex 32
CORS_ORIGINS=https://vaultforge-nu.vercel.app,http://localhost:3000
ENVIRONMENT=production
```

### What each variable does

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Postgres database URL for vault metadata, user records, and audit logs. |
| `SUPABASE_SERVICE_KEY` | Service role key that bypasses Row-Level Security for backend writes. Never expose to frontend. |
| `OPBNB_RPC_URL` | JSON-RPC endpoint for reading on-chain state (vault balances, contract calls). |
| `VAULT_FACTORY_ADDRESS` | On-chain VaultFactory address for vault existence validation. |
| `ZK_VERIFIER_ADDRESS` | On-chain ZKVerifier address for proof verification checks. |
| `AGENT_PRIVATE_KEY` | Private key for the backend agent wallet (signs agent actions on-chain). |
| `ZERION_API_KEY` | API key for Zerion portfolio positions proxy (`/positions/{wallet}`). |
| `INTERNAL_API_KEY` | Shared secret for authenticating agent action requests (`X-API-Key` header). |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins for CORS. |
| `ENVIRONMENT` | `development` or `production` â€” controls logging verbosity. |

## API Endpoints

### `GET /health`

Returns API health status.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-02-28T12:00:00+00:00" }
```

### `GET /metrics`

Returns aggregate protocol metrics from Supabase.

**Response:**
```json
{ "tvl": 1000000, "active_vaults": 12, "avg_ltv": 45.2 }
```

### `POST /vault/create`

Creates a new vault record and auto-creates the user if needed. Rate limit: 10/min.

**Request:**
```json
{ "wallet_address": "0x1234...abcd", "chain_id": 5611 }
```

**Response (201):**
```json
{ "id": "uuid", "wallet_address": "0x1234...abcd", "chain_id": 5611, "status": "active" }
```

### `GET /vault/{vault_id}/health`

Returns vault health metrics. Rate limit: 30/min.

**Response:**
```json
{
  "vault_id": "uuid",
  "status": "active",
  "total_deposited": "1000000000000000000",
  "total_borrowed": "500000000000000000",
  "current_ltv_bps": 5000,
  "health_factor": 2.0
}
```

### `POST /optimize-ltv`

Runs CVaR-based portfolio optimization to suggest an optimal LTV. Pass `vault_id: "preview"` for demo mode (skips vault existence check). Rate limit: 20/min.

**Request:**
```json
{
  "vault_id": "uuid-or-preview",
  "assets": [
    { "symbol": "BNB", "value_usd": 1000.0, "volatility": 0.45, "correlation_id": 1 }
  ]
}
```

**Response:**
```json
{
  "vault_id": "uuid",
  "suggested_ltv_bps": 6500,
  "weights": { "BNB": 1.0 },
  "expected_cvar": 0.12,
  "elapsed_ms": 45.2,
  "converged": true
}
```

### `POST /agent/action`

Records a new AI agent action. Requires `X-API-Key` header matching `INTERNAL_API_KEY`. Rate limit: 50/min.

**Request:**
```json
{
  "agent_id": "agent-uuid",
  "vault_id": "vault-uuid",
  "wallet_address": "0x1234...abcd",
  "action_type": "rebalance",
  "parameters": { "target_ltv_bps": 6000 }
}
```

**Response:**
```json
{ "id": "action-uuid", "agent_id": "agent-uuid", "action_type": "rebalance", "status": "proposed" }
```

### `GET /positions/{wallet}`

Fetches portfolio positions from Zerion API. Requires `X-API-Key` header. Rate limit: 20/min.

**Response:**
```json
{
  "wallet": "0x1234...abcd",
  "positions": [
    { "symbol": "BNB", "name": "BNB", "quantity": 10.5, "value_usd": 3150.0, "price_usd": 300.0 }
  ],
  "total_value_usd": 3150.0
}
```

## Running Tests

```bash
uv run pytest -v          # 34 tests
uv run pytest --cov       # With coverage report
```

## Deployment (Railway)

1. Connect your GitHub repo to [Railway](https://railway.app).
2. Set all environment variables from the table above in Railway's dashboard.
3. Push to `main` â€” Railway auto-builds and deploys using the `Dockerfile`.

The Dockerfile uses UV for dependency installation and runs uvicorn on port 8000.

## Common Issues

| Issue | Fix |
|---|---|
| **Supabase SSL error locally** | The `/metrics` endpoint has a try/except fallback that returns zeroes if Supabase is unreachable. For local dev, ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set. |
| **"Missing API key" on /agent/action** | Pass `X-API-Key: <your-key>` header matching `INTERNAL_API_KEY`. |
| **CORS errors from frontend** | Add your frontend URL to `CORS_ORIGINS` (comma-separated). |
| **Import errors on startup** | Run `uv sync` to install all dependencies. |
