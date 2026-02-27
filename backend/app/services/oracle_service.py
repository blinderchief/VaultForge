"""Multi-oracle price feed aggregator.

Fetches token prices from multiple sources and returns a weighted median.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

# Supported sources
SOURCES = ("binance", "coingecko")

# Binance symbol mapping (token_symbol → Binance pair)
_BINANCE_MAP: dict[str, str] = {
    "BNB": "BNBUSDT",
    "ETH": "ETHUSDT",
    "BTC": "BTCUSDT",
    "USDT": "USDCUSDT",  # stablecoin self-ref
    "USDC": "USDCUSDT",
}

# CoinGecko id mapping
_COINGECKO_MAP: dict[str, str] = {
    "BNB": "binancecoin",
    "ETH": "ethereum",
    "BTC": "bitcoin",
    "USDT": "tether",
    "USDC": "usd-coin",
}


@dataclass
class PriceQuote:
    source: str
    symbol: str
    price_usd: float
    timestamp: float


async def _fetch_binance(symbol: str, client: httpx.AsyncClient) -> PriceQuote | None:
    pair = _BINANCE_MAP.get(symbol.upper())
    if not pair:
        return None
    try:
        resp = await client.get(
            "https://api.binance.com/api/v3/ticker/price",
            params={"symbol": pair},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return PriceQuote(
            source="binance",
            symbol=symbol.upper(),
            price_usd=float(data["price"]),
            timestamp=time.time(),
        )
    except Exception:
        logger.warning("Binance price fetch failed for %s", symbol)
        return None


async def _fetch_coingecko(symbol: str, client: httpx.AsyncClient) -> PriceQuote | None:
    cg_id = _COINGECKO_MAP.get(symbol.upper())
    if not cg_id:
        return None
    try:
        resp = await client.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": cg_id, "vs_currencies": "usd"},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        price = data.get(cg_id, {}).get("usd")
        if price is None:
            return None
        return PriceQuote(
            source="coingecko",
            symbol=symbol.upper(),
            price_usd=float(price),
            timestamp=time.time(),
        )
    except Exception:
        logger.warning("CoinGecko price fetch failed for %s", symbol)
        return None


async def get_price(symbol: str) -> PriceQuote:
    """Fetch price from multiple oracles, return median.

    Raises ``ValueError`` if no source returns a valid price.
    """
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            _fetch_binance(symbol, client),
            _fetch_coingecko(symbol, client),
        )
    quotes = [q for q in results if q is not None]
    if not quotes:
        raise ValueError(f"No price available for {symbol}")

    # Weighted median (simple: use middle value when sorted)
    quotes.sort(key=lambda q: q.price_usd)
    median = quotes[len(quotes) // 2]
    return PriceQuote(
        source="aggregated",
        symbol=median.symbol,
        price_usd=median.price_usd,
        timestamp=time.time(),
    )


async def get_prices(symbols: list[str]) -> dict[str, PriceQuote]:
    """Fetch prices for multiple symbols concurrently."""
    tasks = [get_price(s) for s in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out: dict[str, PriceQuote] = {}
    for sym, res in zip(symbols, results):
        if isinstance(res, PriceQuote):
            out[sym] = res
        else:
            logger.warning("Price fetch failed for %s: %s", sym, res)
    return out
