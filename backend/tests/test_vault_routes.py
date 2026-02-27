"""Tests for vault and optimize routes (using httpx TestClient)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ── Helpers ──────────────────────────────────────────────────────────


def _mock_supabase():
    """Return a mock Supabase client with chainable query builder."""
    mock_db = MagicMock()

    def _table(name: str):
        table = MagicMock()

        # Make chainable: .select().eq().maybe_single().execute()
        chain = MagicMock()
        table.select.return_value = chain
        chain.eq.return_value = chain
        chain.maybe_single.return_value = chain

        table.insert.return_value = chain

        # default: execute returns empty
        chain.execute.return_value = MagicMock(data=None)

        table._chain = chain
        return table

    mock_db.table = MagicMock(side_effect=_table)
    return mock_db


# ── Health endpoint ──────────────────────────────────────────────────


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


# ── POST /vault/create ───────────────────────────────────────────────


def test_create_vault_invalid_address():
    resp = client.post("/vault/create", json={"wallet_address": "not-an-address"})
    assert resp.status_code == 422


def test_create_vault_success():
    mock_db = MagicMock()
    user_table = MagicMock()
    vault_table = MagicMock()

    def table_router(name: str):
        if name == "users":
            return user_table
        return vault_table

    mock_db.table = MagicMock(side_effect=table_router)

    # User lookup returns None (user doesn't exist)
    user_chain = MagicMock()
    user_table.select.return_value = user_chain
    user_chain.eq.return_value = user_chain
    user_chain.maybe_single.return_value = user_chain
    user_chain.execute.return_value = MagicMock(data=None)

    # User insert
    user_insert_chain = MagicMock()
    user_table.insert.return_value = user_insert_chain
    user_insert_chain.execute.return_value = MagicMock(
        data=[{"id": "user-123", "wallet_address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]
    )

    # Vault insert
    vault_insert_chain = MagicMock()
    vault_table.insert.return_value = vault_insert_chain
    vault_insert_chain.execute.return_value = MagicMock(
        data=[
            {
                "id": "vault-456",
                "wallet_address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "chain_id": 5611,
                "status": "pending",
            }
        ]
    )

    with patch("app.routers.vault.get_supabase", return_value=mock_db):
        resp = client.post(
            "/vault/create",
            json={"wallet_address": "0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA"},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] == "vault-456"
    assert data["status"] == "pending"


# ── GET /vault/{id}/health ───────────────────────────────────────────


def test_vault_health_not_found():
    mock_db = MagicMock()
    chain = MagicMock()
    mock_db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(data=None)

    with patch("app.routers.vault.get_supabase", return_value=mock_db):
        resp = client.get("/vault/some-id/health")
    assert resp.status_code == 404


def test_vault_health_success():
    mock_db = MagicMock()
    chain = MagicMock()
    mock_db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(
        data={
            "id": "v1",
            "status": "active",
            "total_deposited": "10000",
            "total_borrowed": "5000",
            "current_ltv_bps": 5000,
        }
    )

    with patch("app.routers.vault.get_supabase", return_value=mock_db):
        resp = client.get("/vault/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["health_factor"] == 2.0
    assert data["current_ltv_bps"] == 5000


# ── POST /optimize-ltv ──────────────────────────────────────────────


def test_optimize_ltv_vault_not_found():
    mock_db = MagicMock()
    chain = MagicMock()
    mock_db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(data=None)

    with patch("app.routers.optimize.get_supabase", return_value=mock_db):
        resp = client.post(
            "/optimize-ltv",
            json={
                "vault_id": "nonexistent",
                "assets": [{"symbol": "BNB", "value_usd": 1000, "volatility": 0.3}],
            },
        )
    assert resp.status_code == 404


def test_optimize_ltv_success():
    mock_db = MagicMock()
    chain = MagicMock()
    mock_db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(data={"id": "v1"})

    with patch("app.routers.optimize.get_supabase", return_value=mock_db):
        resp = client.post(
            "/optimize-ltv",
            json={
                "vault_id": "v1",
                "assets": [
                    {"symbol": "BNB", "value_usd": 5000, "volatility": 0.3, "correlation_id": 1},
                    {"symbol": "ETH", "value_usd": 5000, "volatility": 0.4, "correlation_id": 2},
                ],
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert 1000 <= data["suggested_ltv_bps"] <= 9000
    assert data["converged"] is True
    assert "BNB" in data["weights"]
    assert "ETH" in data["weights"]


def test_optimize_ltv_empty_assets():
    resp = client.post(
        "/optimize-ltv",
        json={"vault_id": "v1", "assets": []},
    )
    assert resp.status_code == 422  # min_length=1


# ── POST /agent/action ──────────────────────────────────────────────


def test_agent_action_no_api_key():
    resp = client.post(
        "/agent/action",
        json={
            "agent_id": "a1",
            "wallet_address": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "action_type": "rebalance",
        },
    )
    # No API key configured → 503 or 401
    assert resp.status_code in (401, 503)


def test_agent_action_wrong_api_key():
    with patch("app.core.security.settings") as mock_settings:
        mock_settings.api_key = "correct-key"
        mock_settings.rate_limit = "100/minute"
        resp = client.post(
            "/agent/action",
            json={
                "agent_id": "a1",
                "wallet_address": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "action_type": "rebalance",
            },
            headers={"X-API-Key": "wrong-key"},
        )
    assert resp.status_code == 403


def test_agent_action_success():
    mock_db = MagicMock()
    chain = MagicMock()
    mock_db.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain

    # Agent exists
    chain.execute.return_value = MagicMock(data={"id": "a1"})

    # Insert returns data
    insert_chain = MagicMock()
    chain.insert = MagicMock(return_value=insert_chain)
    # We need table to return different chains for select vs insert
    agent_select_chain = MagicMock()
    agent_select_chain.select.return_value = agent_select_chain
    agent_select_chain.eq.return_value = agent_select_chain
    agent_select_chain.maybe_single.return_value = agent_select_chain
    agent_select_chain.execute.return_value = MagicMock(data={"id": "a1"})

    agent_insert_chain = MagicMock()
    agent_insert_chain.execute.return_value = MagicMock(
        data=[
            {
                "id": "action-789",
                "agent_id": "a1",
                "vault_id": None,
                "action_type": "rebalance",
                "status": "proposed",
            }
        ]
    )

    def table_side_effect(name: str):
        t = MagicMock()
        t.select.return_value = t
        t.eq.return_value = t
        t.maybe_single.return_value = t
        t.execute.return_value = MagicMock(data={"id": "a1"})
        t.insert.return_value = agent_insert_chain
        return t

    mock_db.table = MagicMock(side_effect=table_side_effect)

    with (
        patch("app.routers.agent.get_supabase", return_value=mock_db),
        patch("app.core.security.settings") as mock_settings,
    ):
        mock_settings.api_key = "test-secret-key"
        mock_settings.rate_limit = "100/minute"
        resp = client.post(
            "/agent/action",
            json={
                "agent_id": "a1",
                "wallet_address": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "action_type": "rebalance",
            },
            headers={"X-API-Key": "test-secret-key"},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["action_type"] == "rebalance"
    assert data["status"] == "proposed"


# ── GET /positions/{wallet} ─────────────────────────────────────────


def test_positions_invalid_wallet():
    resp = client.get("/positions/bad-wallet")
    assert resp.status_code == 400


def test_positions_no_api_key():
    with patch("app.routers.positions.settings") as mock_settings:
        mock_settings.zerion_api_key = ""
        resp = client.get("/positions/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    assert resp.status_code == 503
