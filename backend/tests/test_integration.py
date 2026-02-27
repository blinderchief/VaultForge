"""Integration test — wallet → API create vault → Supabase insert → health check."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def _make_mock_supabase():
    """Build a Supabase mock that supports users + vaults tables with state."""
    mock_db = MagicMock()
    vault_store: dict[str, dict] = {}

    def table_router(name: str):
        if name == "users":
            return _user_table()
        return _vault_table(vault_store)

    mock_db.table = MagicMock(side_effect=table_router)
    return mock_db, vault_store


def _user_table():
    tbl = MagicMock()
    # Lookup returns None → triggers user creation
    chain = MagicMock()
    tbl.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(data=None)

    # Insert creates user
    insert_chain = MagicMock()
    tbl.insert.return_value = insert_chain
    insert_chain.execute.return_value = MagicMock(
        data=[{"id": "user-integ-001", "wallet_address": WALLET}]
    )
    return tbl


def _vault_table(store: dict[str, dict]):
    tbl = MagicMock()

    # insert captures the vault row
    def _insert(row):
        store[row["id"]] = row
        ch = MagicMock()
        ch.execute.return_value = MagicMock(data=[row])
        return ch

    tbl.insert = MagicMock(side_effect=_insert)

    # select + eq + maybe_single fetches from store
    def _select(*a):
        ch = MagicMock()

        def _eq(col, val):
            inner = MagicMock()
            maybe = MagicMock()
            inner.maybe_single.return_value = maybe

            found = None
            for v in store.values():
                if v.get(col) == val:
                    found = v
                    break
            maybe.execute.return_value = MagicMock(data=found)
            return inner

        ch.eq = MagicMock(side_effect=_eq)
        return ch

    tbl.select = MagicMock(side_effect=_select)
    return tbl


def test_create_then_health():
    """End-to-end: create vault via API then read health — simulates
    wallet → Privy auth → VaultFactory tx → Supabase insert → dashboard update."""
    mock_db, store = _make_mock_supabase()

    with patch("app.routers.vault.get_supabase", return_value=mock_db):
        # Step 1: Create vault
        resp = client.post(
            "/vault/create",
            json={"wallet_address": WALLET, "chain_id": 5611},
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["wallet_address"] == WALLET
        assert body["chain_id"] == 5611
        assert body["status"] == "pending"
        vault_id = body["id"]

        # Verify store was written
        assert vault_id in store
        assert store[vault_id]["total_deposited"] == "0"

        # Step 2: Read health
        resp2 = client.get(f"/vault/{vault_id}/health")
        assert resp2.status_code == 200
        health = resp2.json()
        assert health["vault_id"] == vault_id
        assert health["status"] == "pending"
        assert health["health_factor"] == 999.0


def test_reject_invalid_wallet():
    """Bad address should be rejected at the Pydantic layer."""
    resp = client.post("/vault/create", json={"wallet_address": "0xBAD"})
    assert resp.status_code == 422


def test_health_returns_404_for_unknown_vault():
    """Health endpoint returns 404 for non-existent vault."""
    mock_db = MagicMock()
    tbl = MagicMock()
    mock_db.table.return_value = tbl
    chain = MagicMock()
    tbl.select.return_value = chain
    chain.eq.return_value = chain
    chain.maybe_single.return_value = chain
    chain.execute.return_value = MagicMock(data=None)

    with patch("app.routers.vault.get_supabase", return_value=mock_db):
        resp = client.get("/vault/no-such-vault/health")
        assert resp.status_code == 404
