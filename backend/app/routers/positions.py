"""Positions router — proxy to Zerion for portfolio positions."""

from __future__ import annotations

import re

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import limiter

router = APIRouter(prefix="/positions", tags=["positions"])

_ETH_ADDR = re.compile(r"^0x[a-fA-F0-9]{40}$")

ZERION_BASE = "https://api.zerion.io/v1"


class Position(BaseModel):
    symbol: str
    name: str
    quantity: float
    value_usd: float
    price_usd: float


class PositionsResponse(BaseModel):
    wallet: str
    positions: list[Position]
    total_value_usd: float


@router.get("/{wallet}", response_model=PositionsResponse)
@limiter.limit("20/minute")
async def get_positions(wallet: str, request: Request):
    """Fetch portfolio positions from Zerion for the given wallet."""
    if not _ETH_ADDR.match(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    if not settings.zerion_api_key:
        raise HTTPException(status_code=503, detail="Zerion API key not configured")

    wallet = wallet.lower()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ZERION_BASE}/wallets/{wallet}/positions/",
            params={"filter[positions]": "only_simple", "currency": "usd"},
            headers={
                "accept": "application/json",
                "authorization": f"Basic {settings.zerion_api_key}",
            },
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Zerion API error: {resp.text[:200]}",
        )

    data = resp.json()
    positions: list[Position] = []
    total = 0.0

    for item in data.get("data", []):
        attrs = item.get("attributes", {})
        fungible = attrs.get("fungible_info", {})
        quantity = float(attrs.get("quantity", {}).get("float", 0))
        price = float(attrs.get("price", 0))
        value = float(attrs.get("value", 0))
        positions.append(
            Position(
                symbol=fungible.get("symbol", "???"),
                name=fungible.get("name", "Unknown"),
                quantity=quantity,
                value_usd=value,
                price_usd=price,
            )
        )
        total += value

    return PositionsResponse(
        wallet=wallet,
        positions=positions,
        total_value_usd=round(total, 2),
    )
