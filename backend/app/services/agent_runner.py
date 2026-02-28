"""Agent runner — background task that analyses vaults and creates agent actions.

Scans all active vaults, fetches oracle prices, runs LTV optimization,
and records recommendations as agent_actions in the database.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.core.database import get_supabase
from app.services.ltv_optimizer import Asset, optimize_ltv
from app.services.oracle_service import get_prices

logger = logging.getLogger(__name__)

# Volatility estimates for known tokens (annualised)
_DEFAULT_VOLATILITY: dict[str, float] = {
    "BNB": 0.65,
    "WBNB": 0.65,
    "ETH": 0.60,
    "BTC": 0.55,
    "BTCB": 0.55,
    "USDT": 0.01,
    "USDC": 0.01,
    "TUSDC": 0.01,
}

# Correlation buckets
_CORRELATION_BUCKET: dict[str, int] = {
    "BNB": 0,
    "WBNB": 0,
    "ETH": 1,
    "BTC": 2,
    "BTCB": 2,
    "USDT": 3,
    "USDC": 3,
    "TUSDC": 3,
}


@dataclass
class RunResult:
    """Summary of a single agent run."""

    vaults_scanned: int
    actions_created: int
    errors: list[str]


def _get_or_create_system_agent(db) -> str | None:
    """Ensure the system LTV optimizer agent exists, return its id."""
    resp = (
        db.table("agents")
        .select("id")
        .eq("strategy_type", "ltv_optimizer")
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["id"]

    # Create the system agent
    insert = (
        db.table("agents")
        .insert(
            {
                "operator_address": "0x0000000000000000000000000000000000000000",
                "name": "VaultForge LTV Optimizer",
                "description": (
                    "Automated CVaR-based LTV optimizer. Analyses collateral "
                    "volatility and correlation to suggest safe LTV ratios."
                ),
                "strategy_type": "ltv_optimizer",
                "status": "active",
            }
        )
        .execute()
    )
    if insert.data:
        return insert.data[0]["id"]
    return None


async def run_agent_cycle() -> RunResult:
    """Execute one full agent analysis cycle across all active vaults.

    1. Load all active vaults that have assets
    2. For each vault, fetch current oracle prices
    3. Run the LTV optimizer
    4. If the suggested LTV differs meaningfully from current, create an agent action
    """
    db = get_supabase()
    result = RunResult(vaults_scanned=0, actions_created=0, errors=[])

    # Get or create system agent
    agent_id = _get_or_create_system_agent(db)
    if not agent_id:
        result.errors.append("Failed to get or create system agent")
        return result

    # Fetch active vaults
    vaults_resp = (
        db.table("vaults")
        .select("id,wallet_address,current_ltv_bps,total_deposited,total_borrowed")
        .eq("status", "active")
        .execute()
    )
    vaults = vaults_resp.data or []
    if not vaults:
        logger.info("No active vaults to analyse")
        return result

    # Fetch vault assets
    vault_ids = [v["id"] for v in vaults]
    assets_resp = (
        db.table("vault_assets")
        .select("vault_id,token_symbol,token_address,is_active")
        .in_("vault_id", vault_ids)
        .eq("is_active", True)
        .execute()
    )
    assets_by_vault: dict[str, list[dict]] = {}
    for a in assets_resp.data or []:
        assets_by_vault.setdefault(a["vault_id"], []).append(a)

    # Collect all unique symbols we need prices for
    all_symbols: set[str] = set()
    for asset_list in assets_by_vault.values():
        for a in asset_list:
            all_symbols.add(a["token_symbol"].upper())

    # Fetch prices (best-effort)
    prices: dict = {}
    if all_symbols:
        try:
            prices = await get_prices(list(all_symbols))
        except Exception as e:
            logger.warning("Oracle price fetch failed: %s", e)
            result.errors.append(f"Price fetch: {e}")

    # Process each vault
    for vault in vaults:
        result.vaults_scanned += 1
        vault_id = vault["id"]
        wallet = vault["wallet_address"]
        current_ltv = int(vault.get("current_ltv_bps") or 0)
        total_deposited = int(vault.get("total_deposited") or 0)

        vault_assets = assets_by_vault.get(vault_id, [])

        # Build asset list for optimizer
        optimizer_assets: list[Asset] = []
        for a in vault_assets:
            sym = a["token_symbol"].upper()
            price_quote = prices.get(sym)
            price_usd = price_quote.price_usd if price_quote else 0.0

            # Estimate value from total_deposited if only one asset
            if price_usd > 0 and total_deposited > 0:
                # rough estimate: value_usd = deposited_wei / 1e18 * price
                value_usd = (total_deposited / 1e18) * price_usd
            elif total_deposited > 0:
                value_usd = total_deposited / 1e18
            else:
                value_usd = 0.0

            volatility = _DEFAULT_VOLATILITY.get(sym, 0.50)
            corr_id = _CORRELATION_BUCKET.get(sym, 99)

            optimizer_assets.append(
                Asset(
                    symbol=sym,
                    value_usd=value_usd,
                    volatility=volatility,
                    correlation_id=corr_id,
                )
            )

        # If no price data available, create a health-check action instead
        if not optimizer_assets or all(a.value_usd <= 0 for a in optimizer_assets):
            try:
                _create_action(
                    db,
                    agent_id=agent_id,
                    vault_id=vault_id,
                    wallet=wallet,
                    action_type="health_check",
                    parameters={
                        "current_ltv_bps": current_ltv,
                        "total_deposited_wei": str(total_deposited),
                        "note": "Vault scanned — no priced assets found for optimization",
                    },
                )
                result.actions_created += 1
            except Exception as e:
                result.errors.append(f"Vault {vault_id[:8]}: {e}")
            continue

        # Run optimizer
        try:
            opt_result = optimize_ltv(optimizer_assets)
        except Exception as e:
            result.errors.append(f"Vault {vault_id[:8]} optimize: {e}")
            continue

        suggested_ltv = opt_result.suggested_ltv_bps
        ltv_diff = abs(suggested_ltv - current_ltv)

        # Always create an action — either optimize_ltv or health_check
        if ltv_diff >= 200:  # >=2% difference is meaningful
            action_type = "optimize_ltv"
            parameters = {
                "current_ltv_bps": current_ltv,
                "suggested_ltv_bps": suggested_ltv,
                "ltv_change_bps": suggested_ltv - current_ltv,
                "expected_cvar": opt_result.expected_cvar,
                "weights": opt_result.weights,
                "converged": opt_result.converged,
                "elapsed_ms": opt_result.elapsed_ms,
            }
        else:
            action_type = "health_check"
            parameters = {
                "current_ltv_bps": current_ltv,
                "suggested_ltv_bps": suggested_ltv,
                "ltv_diff_bps": ltv_diff,
                "note": "LTV within optimal range — no adjustment needed",
                "expected_cvar": opt_result.expected_cvar,
            }

        try:
            _create_action(
                db,
                agent_id=agent_id,
                vault_id=vault_id,
                wallet=wallet,
                action_type=action_type,
                parameters=parameters,
            )
            result.actions_created += 1
        except Exception as e:
            result.errors.append(f"Vault {vault_id[:8]} action: {e}")

    logger.info(
        "Agent cycle complete: %d vaults scanned, %d actions created, %d errors",
        result.vaults_scanned,
        result.actions_created,
        len(result.errors),
    )
    return result


def _create_action(
    db,
    *,
    agent_id: str,
    vault_id: str,
    wallet: str,
    action_type: str,
    parameters: dict,
) -> None:
    """Insert an agent_action row."""
    db.table("agent_actions").insert(
        {
            "agent_id": agent_id,
            "vault_id": vault_id,
            "wallet_address": wallet.lower(),
            "action_type": action_type,
            "parameters": parameters,
            "status": "proposed",
        }
    ).execute()
