"""VaultForge FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.security import limiter
from app.routers import agent, optimize, positions, vault

app = FastAPI(
    title="VaultForge API",
    version="0.1.0",
    description="ZK-private intelligent collateral vault system on opBNB/BSC",
)

# ── Rate limiting ────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(vault.router)
app.include_router(optimize.router)
app.include_router(agent.router)
app.include_router(positions.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Return API health status."""
    from datetime import datetime, timezone

    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/metrics")
async def metrics() -> dict:
    """Return aggregate protocol metrics."""
    try:
        from app.core.database import get_supabase

        db = get_supabase()
        rows = (
            db.table("vaults")
            .select("total_deposited,total_borrowed,current_ltv_bps,status")
            .execute()
        )
        vaults = rows.data or []
        active = [v for v in vaults if v.get("status") == "active"]
        tvl = sum(int(v.get("total_deposited") or 0) for v in vaults)
        avg_ltv = (
            sum(int(v.get("current_ltv_bps") or 0) for v in active) / len(active)
            if active
            else 0.0
        )
        return {
            "tvl": tvl,
            "active_vaults": len(active),
            "avg_ltv": round(avg_ltv / 100, 1),
        }
    except Exception:
        return {"tvl": 0, "active_vaults": 0, "avg_ltv": 0.0}
