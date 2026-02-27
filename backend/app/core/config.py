"""VaultForge — centralised settings from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Blockchain ───────────────────────────────────────────────────
    opbnb_testnet_rpc_url: str = "https://opbnb-testnet-rpc.bnbchain.org"
    bsc_testnet_rpc_url: str = "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
    deployer_private_key: str = ""

    # ── Contract addresses (populated after deploy) ──────────────────
    vault_factory_address: str = ""
    vault_implementation_address: str = ""
    zk_verifier_address: str = ""
    agent_registry_address: str = ""
    relayer_address: str = ""

    # ── Privy (auth) ─────────────────────────────────────────────────
    privy_app_id: str = ""
    privy_app_secret: str = ""

    # ── Supabase ─────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_db_url: str = ""

    # ── Backend API ──────────────────────────────────────────────────
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"
    api_key: str = ""  # internal agent API key

    # ── ZK ───────────────────────────────────────────────────────────
    snarkjs_path: str = "./zk-circuits/node_modules/.bin/snarkjs"

    # ── Oracles ──────────────────────────────────────────────────────
    chainlink_bnb_usd_feed: str = ""

    # ── External APIs ────────────────────────────────────────────────
    zerion_api_key: str = ""

    # ── Rate limiting ────────────────────────────────────────────────
    rate_limit: str = "100/minute"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
