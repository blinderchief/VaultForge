"""Vault router — create vaults and check health."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator

from app.core.database import get_supabase
from app.core.security import limiter

router = APIRouter(prefix="/vault", tags=["vault"])

_ETH_ADDR = re.compile(r"^0x[a-fA-F0-9]{40}$")


class VaultCreateRequest(BaseModel):
    wallet_address: str = Field(..., description="Owner wallet address (0x...)")
    chain_id: int = Field(default=5611, description="Chain ID (default opBNB testnet)")

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not _ETH_ADDR.match(v):
            raise ValueError("Invalid Ethereum address")
        return v.lower()


class VaultCreateResponse(BaseModel):
    id: str
    wallet_address: str
    chain_id: int
    status: str


class VaultHealthResponse(BaseModel):
    vault_id: str
    status: str
    total_deposited: str
    total_borrowed: str
    current_ltv_bps: int
    health_factor: float


@router.post(
    "/create",
    response_model=VaultCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
async def create_vault(req: VaultCreateRequest, request: Request):
    """Create a new vault record."""
    db = get_supabase()

    # Ensure user exists
    user_resp = (
        db.table("users")
        .select("id")
        .eq("wallet_address", req.wallet_address)
        .maybe_single()
        .execute()
    )
    if not user_resp.data:
        # Auto-create user
        user_resp = (
            db.table("users")
            .insert({"wallet_address": req.wallet_address, "chain_id": req.chain_id})
            .execute()
        )
        user_id = user_resp.data[0]["id"]
    else:
        user_id = user_resp.data["id"]

    vault_id = str(uuid.uuid4())
    vault = {
        "id": vault_id,
        "user_id": user_id,
        "wallet_address": req.wallet_address,
        "chain_id": req.chain_id,
        "status": "pending",
        "total_deposited": "0",
        "total_borrowed": "0",
        "current_ltv_bps": 0,
    }
    resp = db.table("vaults").insert(vault).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create vault")

    row = resp.data[0]
    return VaultCreateResponse(
        id=row["id"],
        wallet_address=row["wallet_address"],
        chain_id=row["chain_id"],
        status=row["status"],
    )


@router.get("/{vault_id}/health", response_model=VaultHealthResponse)
@limiter.limit("30/minute")
async def get_vault_health(vault_id: str, request: Request):
    """Return vault health metrics."""
    db = get_supabase()
    resp = (
        db.table("vaults")
        .select("*")
        .eq("id", vault_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Vault not found")

    v = resp.data
    deposited = int(v["total_deposited"] or 0)
    borrowed = int(v["total_borrowed"] or 0)
    ltv_bps = int(v["current_ltv_bps"] or 0)

    health_factor = (deposited / borrowed) if borrowed > 0 else 999.0

    return VaultHealthResponse(
        vault_id=v["id"],
        status=v["status"],
        total_deposited=str(deposited),
        total_borrowed=str(borrowed),
        current_ltv_bps=ltv_bps,
        health_factor=round(health_factor, 4),
    )
