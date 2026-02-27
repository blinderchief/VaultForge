"""Tests for oracle service and positions router."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.oracle_service import PriceQuote, get_price, get_prices

# ── Oracle service ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_price_binance_only():
    """Binance returns, CoinGecko fails → use Binance."""
    mock_binance_resp = MagicMock()
    mock_binance_resp.status_code = 200
    mock_binance_resp.raise_for_status = MagicMock()
    mock_binance_resp.json.return_value = {"symbol": "BNBUSDT", "price": "605.50"}

    async def mock_get(url: str, **kwargs):
        if "binance" in url:
            return mock_binance_resp
        # CoinGecko returns None price
        cg_resp = MagicMock()
        cg_resp.status_code = 200
        cg_resp.raise_for_status = MagicMock()
        cg_resp.json.return_value = {"binancecoin": {}}
        return cg_resp

    mock_client = AsyncMock()
    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.oracle_service.httpx.AsyncClient", return_value=mock_client):
        quote = await get_price("BNB")
    assert quote.price_usd == 605.50
    assert quote.source == "aggregated"


@pytest.mark.asyncio
async def test_get_price_both_sources():
    """Both sources return → aggregated median."""
    mock_binance_resp = MagicMock()
    mock_binance_resp.status_code = 200
    mock_binance_resp.raise_for_status = MagicMock()
    mock_binance_resp.json.return_value = {"symbol": "ETHUSDT", "price": "3200.00"}

    mock_cg_resp = MagicMock()
    mock_cg_resp.status_code = 200
    mock_cg_resp.raise_for_status = MagicMock()
    mock_cg_resp.json.return_value = {"ethereum": {"usd": 3210.00}}

    async def mock_get(url: str, **kwargs):
        if "binance" in url:
            return mock_binance_resp
        return mock_cg_resp

    mock_client = AsyncMock()
    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.oracle_service.httpx.AsyncClient", return_value=mock_client):
        quote = await get_price("ETH")
    assert quote.price_usd in (3200.00, 3210.00)  # median of 2 = second element


@pytest.mark.asyncio
async def test_get_price_no_sources():
    """No sources return → ValueError."""
    async def mock_get(url: str, **kwargs):
        raise httpx.ConnectError("Connection refused")

    mock_client = AsyncMock()
    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.oracle_service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(ValueError, match="No price available"):
            await get_price("BNB")


@pytest.mark.asyncio
async def test_get_price_unknown_symbol():
    """Unknown symbol not in maps → ValueError."""
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    # Both fetchers return None for unknown symbols
    with patch("app.services.oracle_service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(ValueError, match="No price available"):
            await get_price("UNKNOWNTOKEN")


@pytest.mark.asyncio
async def test_get_prices_multiple():
    """get_prices handles multiple symbols, some failing."""
    async def mock_get_price(symbol: str):
        if symbol == "BNB":
            return PriceQuote(source="aggregated", symbol="BNB", price_usd=600.0, timestamp=0)
        raise ValueError(f"No price for {symbol}")

    with patch("app.services.oracle_service.get_price", side_effect=mock_get_price):
        result = await get_prices(["BNB", "FAIL"])
    assert "BNB" in result
    assert "FAIL" not in result


# ── Positions router (Zerion proxy) ─────────────────────────────────

client = TestClient(app)


def test_positions_success():
    """Successful Zerion proxy call."""
    mock_zerion_response = httpx.Response(
        status_code=200,
        json={
            "data": [
                {
                    "attributes": {
                        "fungible_info": {"symbol": "BNB", "name": "BNB"},
                        "quantity": {"float": 10.5},
                        "price": 600.0,
                        "value": 6300.0,
                    }
                },
                {
                    "attributes": {
                        "fungible_info": {"symbol": "ETH", "name": "Ethereum"},
                        "quantity": {"float": 2.0},
                        "price": 3200.0,
                        "value": 6400.0,
                    }
                },
            ]
        },
        request=httpx.Request("GET", "https://api.zerion.io/v1/wallets/0x/positions/"),
    )

    async def mock_get(*args, **kwargs):
        return mock_zerion_response

    mock_client = AsyncMock()
    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.routers.positions.settings") as mock_settings,
        patch("app.routers.positions.httpx.AsyncClient", return_value=mock_client),
    ):
        mock_settings.zerion_api_key = "test-key"
        resp = client.get("/positions/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["positions"]) == 2
    assert data["total_value_usd"] == 12700.0


def test_positions_zerion_error():
    """Zerion returns error → propagated."""
    mock_resp = httpx.Response(
        status_code=429,
        text="Rate limited",
        request=httpx.Request("GET", "https://api.zerion.io/v1/wallets/0x/positions/"),
    )

    async def mock_get(*args, **kwargs):
        return mock_resp

    mock_client = AsyncMock()
    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.routers.positions.settings") as mock_settings,
        patch("app.routers.positions.httpx.AsyncClient", return_value=mock_client),
    ):
        mock_settings.zerion_api_key = "test-key"
        resp = client.get("/positions/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

    assert resp.status_code == 429
