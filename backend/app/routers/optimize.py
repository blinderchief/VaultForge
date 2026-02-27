"""Optimize-LTV router — run CVaR optimisation on a vault's collateral."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.database import get_supabase
from app.core.security import limiter
from app.services.ltv_optimizer import Asset, OptimizationResult, optimize_ltv

router = APIRouter(prefix="/optimize-ltv", tags=["optimize"])


class AssetInput(BaseModel):
    symbol: str
    value_usd: float = Field(gt=0)
    volatility: float = Field(ge=0, le=1)
    correlation_id: int = 0


class OptimizeRequest(BaseModel):
    vault_id: str
    assets: list[AssetInput] = Field(..., min_length=1, max_length=50)


class OptimizeResponse(BaseModel):
    vault_id: str
    suggested_ltv_bps: int
    weights: dict[str, float]
    expected_cvar: float
    elapsed_ms: float
    converged: bool


@router.post("", response_model=OptimizeResponse)
@limiter.limit("20/minute")
async def run_optimization(req: OptimizeRequest, request: Request):
    """Run CVaR-based LTV optimisation for a vault."""
    # Validate vault exists
    db = get_supabase()
    vault = (
        db.table("vaults")
        .select("id")
        .eq("id", req.vault_id)
        .maybe_single()
        .execute()
    )
    if not vault.data:
        raise HTTPException(status_code=404, detail="Vault not found")

    assets = [
        Asset(
            symbol=a.symbol,
            value_usd=a.value_usd,
            volatility=a.volatility,
            correlation_id=a.correlation_id,
        )
        for a in req.assets
    ]

    result: OptimizationResult = optimize_ltv(assets)

    return OptimizeResponse(
        vault_id=req.vault_id,
        suggested_ltv_bps=result.suggested_ltv_bps,
        weights=result.weights,
        expected_cvar=result.expected_cvar,
        elapsed_ms=result.elapsed_ms,
        converged=result.converged,
    )
