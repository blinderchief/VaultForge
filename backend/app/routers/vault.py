"""Vault router — create vaults, list by wallet, and check health."""

from __future__ import annotations

import re
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator

from app.core.database import get_supabase
from app.core.security import limiter

router = APIRouter(prefix="/vault", tags=["vault"])

_ETH_ADDR = re.compile(r"^0x[a-fA-F0-9]{40}$")


class VaultCreateRequest(BaseModel):
    wallet_address: str = Field(..., description="Owner wallet address (0x...)")
    chain_id: int = Field(default=5611, description="Chain ID (default opBNB testnet)")
    vault_contract_address: Optional[str] = Field(
        default=None, description="On-chain vault contract address"
    )
    total_deposited: Optional[str] = Field(
        default=None, description="Initial deposit amount in wei"
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not _ETH_ADDR.match(v):
            raise ValueError("Invalid Ethereum address")
        return v.lower()

    @field_validator("vault_contract_address")
    @classmethod
    def validate_vault_address(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _ETH_ADDR.match(v):
            raise ValueError("Invalid vault contract address")
        return v.lower() if v else v


class VaultCreateResponse(BaseModel):
    id: str
    wallet_address: str
    chain_id: int
    status: str
    vault_contract_address: Optional[str] = None


class VaultRow(BaseModel):
    id: str
    wallet_address: str
    vault_contract_address: Optional[str] = None
    chain_id: int
    status: str
    total_deposited: str
    total_borrowed: str
    current_ltv_bps: int
    created_at: str


class VaultListResponse(BaseModel):
    wallet_address: str
    vaults: list[VaultRow]


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
    """Create a new vault record.

    When ``vault_contract_address`` is provided the vault is stored as
    ``active`` (already deployed on-chain).  Otherwise it starts as
    ``pending``.
    """
    db = get_supabase()

    # Ensure user exists — use .execute() instead of .maybe_single() to avoid
    # None response objects in certain supabase-py versions.
    user_resp = (
        db.table("users")
        .select("id")
        .eq("wallet_address", req.wallet_address)
        .execute()
    )
    if not user_resp or not user_resp.data:
        # Auto-create user
        user_resp = (
            db.table("users")
            .insert({"wallet_address": req.wallet_address, "chain_id": req.chain_id})
            .execute()
        )
        user_id = user_resp.data[0]["id"]
    else:
        user_id = user_resp.data[0]["id"]

    # If a vault_contract_address is provided, check for existing vault to avoid duplicates
    if req.vault_contract_address:
        existing = (
            db.table("vaults")
            .select("id, wallet_address, chain_id, status, vault_contract_address")
            .eq("wallet_address", req.wallet_address)
            .eq("vault_contract_address", req.vault_contract_address.lower())
            .execute()
        )
        if existing and existing.data:
            row = existing.data[0]
            return VaultCreateResponse(
                id=row["id"],
                wallet_address=row["wallet_address"],
                chain_id=row["chain_id"],
                status=row["status"],
                vault_contract_address=row.get("vault_contract_address"),
            )

    vault_id = str(uuid.uuid4())
    vault: dict = {
        "id": vault_id,
        "user_id": user_id,
        "wallet_address": req.wallet_address,
        "chain_id": req.chain_id,
        "status": "active" if req.vault_contract_address else "pending",
        "total_deposited": req.total_deposited or "0",
        "total_borrowed": "0",
        "current_ltv_bps": 0,
    }
    if req.vault_contract_address:
        vault["vault_contract_address"] = req.vault_contract_address

    resp = db.table("vaults").insert(vault).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create vault")

    row = resp.data[0]
    return VaultCreateResponse(
        id=row["id"],
        wallet_address=row["wallet_address"],
        chain_id=row["chain_id"],
        status=row["status"],
        vault_contract_address=row.get("vault_contract_address"),
    )


@router.get("/by-wallet/{wallet_address}", response_model=VaultListResponse)
@limiter.limit("30/minute")
async def list_vaults_by_wallet(wallet_address: str, request: Request):
    """Return all vaults for a given wallet address."""
    if not _ETH_ADDR.match(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    db = get_supabase()
    resp = (
        db.table("vaults")
        .select("*")
        .eq("wallet_address", wallet_address.lower())
        .order("created_at", desc=True)
        .execute()
    )

    vaults = [
        VaultRow(
            id=v["id"],
            wallet_address=v["wallet_address"],
            vault_contract_address=v.get("vault_contract_address"),
            chain_id=v["chain_id"],
            status=v["status"],
            total_deposited=str(v.get("total_deposited", "0")),
            total_borrowed=str(v.get("total_borrowed", "0")),
            current_ltv_bps=int(v.get("current_ltv_bps", 0)),
            created_at=v["created_at"],
        )
        for v in (resp.data or [])
    ]

    return VaultListResponse(wallet_address=wallet_address.lower(), vaults=vaults)


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
