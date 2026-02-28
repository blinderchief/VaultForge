"""Tests for the agent runner service and endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.agent_runner import RunResult, _get_or_create_system_agent

client = TestClient(app)


# ── Unit tests for agent runner service ──────────────────────────────


def _mock_supabase_with_agent():
    """Build a mock DB that has an active system agent."""
    db = MagicMock()

    def table_router(name: str):
        tbl = MagicMock()
        if name == "agents":
            # select().eq().eq().limit().execute() returns existing agent
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.eq.return_value = chain
            chain.limit.return_value = chain
            chain.execute.return_value = MagicMock(
                data=[{"id": "agent-test-001"}]
            )
        elif name == "vaults":
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(data=[])
        elif name == "vault_assets":
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.in_.return_value = chain
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(data=[])
        elif name == "agent_actions":
            chain = MagicMock()
            tbl.insert.return_value = chain
            chain.execute.return_value = MagicMock(data=[{}])
            # For list endpoint
            tbl.select.return_value = chain
            chain.eq.return_value = chain
            chain.order.return_value = chain
            chain.limit.return_value = chain
            chain.execute.return_value = MagicMock(data=[])
        return tbl

    db.table = MagicMock(side_effect=table_router)
    return db


def test_get_or_create_system_agent_existing():
    """When an active ltv_optimizer agent exists, return its ID."""
    db = MagicMock()
    chain = MagicMock()
    db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = MagicMock(data=[{"id": "existing-agent-id"}])

    result = _get_or_create_system_agent(db)
    assert result == "existing-agent-id"


def test_get_or_create_system_agent_creates_new():
    """When no agent exists, create one and return its ID."""
    db = MagicMock()
    chain = MagicMock()
    db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.limit.return_value = chain
    # First call: no existing agent
    chain.execute.return_value = MagicMock(data=[])
    # Insert call returns new agent
    insert_chain = MagicMock()
    chain.insert.return_value = insert_chain
    insert_chain.execute.return_value = MagicMock(
        data=[{"id": "new-agent-id"}]
    )

    result = _get_or_create_system_agent(db)
    assert result == "new-agent-id"


@pytest.mark.asyncio
async def test_run_agent_cycle_no_vaults():
    """When no active vaults exist, cycle completes with 0 scanned."""
    from app.services.agent_runner import run_agent_cycle

    mock_db = _mock_supabase_with_agent()

    with patch("app.services.agent_runner.get_supabase", return_value=mock_db):
        result = await run_agent_cycle()

    assert isinstance(result, RunResult)
    assert result.vaults_scanned == 0
    assert result.actions_created == 0


@pytest.mark.asyncio
async def test_run_agent_cycle_with_vault():
    """When an active vault exists, cycle scans it and creates an action."""
    from app.services.agent_runner import run_agent_cycle

    db = MagicMock()
    call_count = {"agents": 0, "vaults": 0, "vault_assets": 0, "agent_actions": 0}

    def table_router(name: str):
        tbl = MagicMock()
        call_count[name] = call_count.get(name, 0) + 1

        if name == "agents":
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.eq.return_value = chain
            chain.limit.return_value = chain
            chain.execute.return_value = MagicMock(
                data=[{"id": "agent-test-001"}]
            )
        elif name == "vaults":
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(
                data=[
                    {
                        "id": "vault-001",
                        "wallet_address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                        "current_ltv_bps": 5000,
                        "total_deposited": "1000000000000000000",
                        "total_borrowed": "0",
                    }
                ]
            )
        elif name == "vault_assets":
            chain = MagicMock()
            tbl.select.return_value = chain
            chain.in_.return_value = chain
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(data=[])
        elif name == "agent_actions":
            insert_chain = MagicMock()
            tbl.insert.return_value = insert_chain
            insert_chain.execute.return_value = MagicMock(
                data=[{"id": "action-001"}]
            )
        return tbl

    db.table = MagicMock(side_effect=table_router)

    with patch("app.services.agent_runner.get_supabase", return_value=db):
        result = await run_agent_cycle()

    assert result.vaults_scanned == 1
    assert result.actions_created == 1


# ── API endpoint tests ───────────────────────────────────────────────


def test_agent_run_public_endpoint():
    """POST /agent/run-public triggers agent cycle and returns result."""
    mock_db = _mock_supabase_with_agent()

    with patch("app.services.agent_runner.get_supabase", return_value=mock_db), \
         patch("app.routers.agent.get_supabase", return_value=mock_db):
        resp = client.post("/agent/run-public")

    assert resp.status_code == 200
    data = resp.json()
    assert "vaults_scanned" in data
    assert "actions_created" in data
    assert "errors" in data


def test_agent_actions_list_empty():
    """GET /agent/actions/{wallet} returns empty list when no actions."""
    mock_db = _mock_supabase_with_agent()

    with patch("app.routers.agent.get_supabase", return_value=mock_db):
        resp = client.get(
            "/agent/actions/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["actions"] == []


def test_agent_actions_list_invalid_wallet():
    """GET /agent/actions/{wallet} rejects bad address."""
    resp = client.get("/agent/actions/not-a-wallet")
    assert resp.status_code == 400
