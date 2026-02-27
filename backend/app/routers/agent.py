"""Agent router — internal-only endpoint for autonomous agent actions."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.database import get_supabase
from app.core.security import limiter, require_api_key

router = APIRouter(prefix="/agent", tags=["agent"])


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
