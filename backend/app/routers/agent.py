"""Agent router — create agent actions (internal) and list actions (public)."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.database import get_supabase
from app.core.security import limiter, require_api_key

router = APIRouter(prefix="/agent", tags=["agent"])

_ETH_ADDR = re.compile(r"^0x[a-fA-F0-9]{40}$")


class AgentActionRequest(BaseModel):
    agent_id: str
    vault_id: str | None = None
    wallet_address: str
    action_type: str = Field(..., min_length=1, max_length=100)
    parameters: dict | None = None


class AgentActionResponse(BaseModel):
    id: str
    agent_id: str
    vault_id: str | None
    action_type: str
    status: str


@router.post(
    "/action",
    response_model=AgentActionResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("50/minute")
async def create_agent_action(
    req: AgentActionRequest,
    request: Request,
    _key: Annotated[str, Depends(require_api_key)] = ...,
):
    """Record a new agent action (internal API key required)."""
    db = get_supabase()

    # Verify agent exists
    agent = (
        db.table("agents")
        .select("id")
        .eq("id", req.agent_id)
        .maybe_single()
        .execute()
    )
    if not agent.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    row = {
        "agent_id": req.agent_id,
        "vault_id": req.vault_id,
        "wallet_address": req.wallet_address,
        "action_type": req.action_type,
        "parameters": req.parameters or {},
        "status": "proposed",
    }
    resp = db.table("agent_actions").insert(row).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create agent action")

    data = resp.data[0]
    return AgentActionResponse(
        id=data["id"],
        agent_id=data["agent_id"],
        vault_id=data.get("vault_id"),
        action_type=data["action_type"],
        status=data["status"],
    )


class AgentActionRow(BaseModel):
    id: str
    agent_id: str
    vault_id: str | None = None
    action_type: str
    status: str
    created_at: str


class AgentActionsListResponse(BaseModel):
    wallet_address: str
    actions: list[AgentActionRow]


@router.get("/actions/{wallet_address}", response_model=AgentActionsListResponse)
@limiter.limit("30/minute")
async def list_agent_actions(wallet_address: str, request: Request):
    """Return recent agent actions for a wallet (public, no API key)."""
    if not _ETH_ADDR.match(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    db = get_supabase()
    resp = (
        db.table("agent_actions")
        .select("*")
        .eq("wallet_address", wallet_address.lower())
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    actions = [
        AgentActionRow(
            id=a["id"],
            agent_id=a["agent_id"],
            vault_id=a.get("vault_id"),
            action_type=a["action_type"],
            status=a["status"],
            created_at=a["created_at"],
        )
        for a in (resp.data or [])
    ]

    return AgentActionsListResponse(
        wallet_address=wallet_address.lower(), actions=actions
    )
