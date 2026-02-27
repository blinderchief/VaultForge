"""Tests for the LTV optimiser service."""

from __future__ import annotations

import time

import pytest

from app.services.ltv_optimizer import (
    MAX_LTV_BPS,
    MIN_LTV_BPS,
    Asset,
    optimize_ltv,
)

# ── Basic functionality ──────────────────────────────────────────────


def test_empty_assets():
    result = optimize_ltv([])
    assert result.suggested_ltv_bps == MIN_LTV_BPS
    assert result.weights == {}
    assert result.converged is True


def test_single_low_vol_asset():
    assets = [Asset(symbol="USDC", value_usd=10_000, volatility=0.01)]
    result = optimize_ltv(assets)
    assert MIN_LTV_BPS <= result.suggested_ltv_bps <= MAX_LTV_BPS
    assert result.weights["USDC"] == pytest.approx(1.0, abs=0.01)
    assert result.converged is True


def test_single_high_vol_asset():
    assets = [Asset(symbol="MEME", value_usd=10_000, volatility=0.95)]
    result = optimize_ltv(assets)
    # High vol should push LTV down
    assert result.suggested_ltv_bps < 7000


def test_two_assets_diversification():
    assets = [
        Asset(symbol="BNB", value_usd=5_000, volatility=0.4, correlation_id=1),
        Asset(symbol="ETH", value_usd=5_000, volatility=0.4, correlation_id=2),
    ]
    result = optimize_ltv(assets)
    assert result.converged is True
    assert len(result.weights) == 2
    # Weights should sum to ~1
    assert sum(result.weights.values()) == pytest.approx(1.0, abs=0.01)


def test_correlated_assets_lower_ltv():
    """Assets in the same correlation bucket should yield lower LTV than diversified."""
    correlated = [
        Asset(symbol="A", value_usd=5_000, volatility=0.4, correlation_id=1),
        Asset(symbol="B", value_usd=5_000, volatility=0.4, correlation_id=1),
    ]
    diversified = [
        Asset(symbol="A", value_usd=5_000, volatility=0.4, correlation_id=1),
        Asset(symbol="B", value_usd=5_000, volatility=0.4, correlation_id=2),
    ]
    r_corr = optimize_ltv(correlated)
    r_div = optimize_ltv(diversified)
    assert r_corr.suggested_ltv_bps <= r_div.suggested_ltv_bps


def test_ltv_bounds():
    """LTV should always stay within MIN/MAX."""
    assets = [Asset(symbol="X", value_usd=1_000, volatility=0.5)]
    result = optimize_ltv(assets)
    assert MIN_LTV_BPS <= result.suggested_ltv_bps <= MAX_LTV_BPS


def test_zero_value_assets():
    assets = [Asset(symbol="ZERO", value_usd=0, volatility=0.5)]
    result = optimize_ltv(assets)
    assert result.suggested_ltv_bps == MIN_LTV_BPS


# ── Performance ──────────────────────────────────────────────────────


def test_ten_assets_under_2_seconds():
    """Must complete < 2 s for 10 assets (requirement)."""
    assets = [
        Asset(
            symbol=f"TOK{i}",
            value_usd=1_000 * (i + 1),
            volatility=0.1 + 0.08 * i,
            correlation_id=i % 3,
        )
        for i in range(10)
    ]
    t0 = time.perf_counter()
    result = optimize_ltv(assets)
    elapsed = time.perf_counter() - t0
    assert elapsed < 2.0, f"Optimisation took {elapsed:.2f}s, must be < 2s"
    assert result.converged is True
    assert len(result.weights) == 10


def test_fifty_assets():
    """Stress test with 50 assets — should still converge."""
    assets = [
        Asset(
            symbol=f"T{i}",
            value_usd=500 + i * 100,
            volatility=min(0.05 + 0.02 * i, 0.95),
            correlation_id=i % 5,
        )
        for i in range(50)
    ]
    result = optimize_ltv(assets)
    assert result.converged is True
    assert sum(result.weights.values()) == pytest.approx(1.0, abs=0.05)


# ── Edge cases ───────────────────────────────────────────────────────


def test_identical_assets():
    assets = [
        Asset(symbol="BNB", value_usd=5_000, volatility=0.3, correlation_id=0),
        Asset(symbol="BNB", value_usd=5_000, volatility=0.3, correlation_id=0),
    ]
    result = optimize_ltv(assets)
    assert result.converged is True


def test_extreme_volatility_mix():
    assets = [
        Asset(symbol="STABLE", value_usd=50_000, volatility=0.001),
        Asset(symbol="RISKY", value_usd=1_000, volatility=0.99),
    ]
    result = optimize_ltv(assets)
    # Optimizer should heavily weight the stable asset
    assert result.weights["STABLE"] > result.weights["RISKY"]
