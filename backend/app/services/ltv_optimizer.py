"""LTV optimiser — SciPy SLSQP convex optimisation.

Minimises CVaR (Conditional Value-at-Risk) of a collateral portfolio
to suggest the best LTV ratio.  Must complete in < 2 s for 10 assets.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize


@dataclass(frozen=True)
class Asset:
    """Single collateral asset with its risk parameters."""

    symbol: str
    value_usd: float
    volatility: float  # annualised, 0-1
    correlation_id: int = 0  # bucket id for correlation grouping


@dataclass
class OptimizationResult:
    """Output of the LTV optimiser."""

    suggested_ltv_bps: int
    weights: dict[str, float]
    expected_cvar: float
    elapsed_ms: float
    converged: bool


# ── Constants ────────────────────────────────────────────────────────
MIN_LTV_BPS = 1000   # 10 %
MAX_LTV_BPS = 9000   # 90 % — matches LTVOracle.sol
CONFIDENCE_LEVEL = 0.95  # 95 % VaR
MAX_SECONDS = 2.0


def _build_covariance(assets: list[Asset]) -> np.ndarray:
    """Build a simple covariance matrix from volatilities + correlation buckets."""
    n = len(assets)
    vols = np.array([a.volatility for a in assets])
    corr = np.eye(n)
    for i in range(n):
        for j in range(i + 1, n):
            # assets in the same correlation bucket get ρ = 0.6, else 0.2
            rho = 0.6 if assets[i].correlation_id == assets[j].correlation_id else 0.2
            corr[i, j] = rho
            corr[j, i] = rho
    return np.outer(vols, vols) * corr


def _portfolio_cvar(
    weights: np.ndarray,
    cov: np.ndarray,
    confidence: float = CONFIDENCE_LEVEL,
) -> float:
    """Parametric CVaR under Gaussian assumption (fast, closed-form)."""
    from scipy.stats import norm

    port_vol = float(np.sqrt(weights @ cov @ weights))
    if port_vol < 1e-12:
        return 0.0
    z = norm.ppf(confidence)
    # Expected shortfall for Gaussian: φ(z) / (1 - α)
    es_factor = float(norm.pdf(z) / (1.0 - confidence))
    return port_vol * es_factor


def optimize_ltv(assets: list[Asset]) -> OptimizationResult:
    """Run SLSQP optimisation to find minimum-CVaR weights and LTV.

    Returns an `OptimizationResult` with the suggested LTV in basis points,
    optimal weights per asset, expected CVaR, and timing info.
    """
    t0 = time.perf_counter()
    n = len(assets)

    if n == 0:
        return OptimizationResult(
            suggested_ltv_bps=MIN_LTV_BPS,
            weights={},
            expected_cvar=0.0,
            elapsed_ms=0.0,
            converged=True,
        )

    total_value = sum(a.value_usd for a in assets)
    if total_value <= 0:
        return OptimizationResult(
            suggested_ltv_bps=MIN_LTV_BPS,
            weights={a.symbol: 0.0 for a in assets},
            expected_cvar=0.0,
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            converged=True,
        )

    # Initial weights proportional to value
    w0 = np.array([a.value_usd / total_value for a in assets])
    cov = _build_covariance(assets)

    # Constraints: weights sum to 1, each weight in [0, 1]
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
    bounds = [(0.0, 1.0)] * n

    result = minimize(
        fun=_portfolio_cvar,
        x0=w0,
        args=(cov,),
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 200, "ftol": 1e-9},
    )

    optimal_weights = result.x if result.success else w0
    optimal_cvar = float(_portfolio_cvar(optimal_weights, cov))

    # Map CVaR → LTV: lower risk → higher LTV
    # CVaR of 0 → MAX_LTV, CVaR ≥ 0.5 → MIN_LTV (linear interpolation)
    cvar_floor, cvar_ceil = 0.0, 0.5
    cvar_clamped = max(cvar_floor, min(optimal_cvar, cvar_ceil))
    ratio = 1.0 - (cvar_clamped - cvar_floor) / (cvar_ceil - cvar_floor)
    ltv_bps = int(MIN_LTV_BPS + ratio * (MAX_LTV_BPS - MIN_LTV_BPS))
    ltv_bps = max(MIN_LTV_BPS, min(MAX_LTV_BPS, ltv_bps))

    elapsed_ms = (time.perf_counter() - t0) * 1000

    return OptimizationResult(
        suggested_ltv_bps=ltv_bps,
        weights={assets[i].symbol: round(float(optimal_weights[i]), 6) for i in range(n)},
        expected_cvar=round(optimal_cvar, 6),
        elapsed_ms=round(elapsed_ms, 2),
        converged=result.success,
    )
