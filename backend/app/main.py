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
    return {"status": "ok"}
