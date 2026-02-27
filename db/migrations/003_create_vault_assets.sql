-- 003_create_vault_assets.sql
-- VaultForge: Collateral positions inside vaults
-- CRITICAL: amounts stored ONLY as ZK commitment hashes (bytea), NEVER plaintext
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Table: vault_assets
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vault_assets (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id                 uuid        NOT NULL,
  wallet_address           text        NOT NULL,
  token_address            text        NOT NULL,
  token_symbol             text        NOT NULL,
  token_decimals           integer     NOT NULL DEFAULT 18,

  -- ┌──────────────────────────────────────────────────────────────────┐
  -- │ ZK PRIVACY: collateral amount is NEVER stored in plaintext.     │
  -- │ Only the Poseidon commitment hash (32 bytes) is persisted.      │
  -- │ The actual value is known only to the vault owner + ZK prover.  │
  -- └──────────────────────────────────────────────────────────────────┘
  collateral_commitment    bytea       NOT NULL,

  deposit_tx_hash          text,
  is_active                boolean     NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vault_assets_vault_fk       FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE CASCADE,
  CONSTRAINT vault_assets_wallet_format  CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT vault_assets_token_format   CHECK (token_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT vault_assets_decimals_range CHECK (token_decimals >= 0 AND token_decimals <= 36),

  -- ENFORCE: commitment must be exactly 32 bytes (Poseidon / keccak256 hash)
  -- This prevents accidental storage of plaintext numeric values
  CONSTRAINT vault_assets_commitment_is_hash CHECK (
    length(collateral_commitment) = 32
  ),

  -- ENFORCE: commitment must not be all zeros (empty hash = no real data)
  CONSTRAINT vault_assets_commitment_nonzero CHECK (
    collateral_commitment <> '\x0000000000000000000000000000000000000000000000000000000000000000'::bytea
  )
);

COMMENT ON TABLE  public.vault_assets                          IS 'Collateral positions in vaults — amounts stored ONLY as ZK commitment hashes';
COMMENT ON COLUMN public.vault_assets.id                       IS 'Unique asset position identifier';
COMMENT ON COLUMN public.vault_assets.vault_id                 IS 'Parent vault — FK to vaults.id';
COMMENT ON COLUMN public.vault_assets.wallet_address           IS 'Vault owner wallet (denormalized for RLS)';
COMMENT ON COLUMN public.vault_assets.token_address            IS 'ERC-20 token contract address';
COMMENT ON COLUMN public.vault_assets.token_symbol             IS 'Token ticker symbol (e.g. WBNB, USDT)';
COMMENT ON COLUMN public.vault_assets.token_decimals           IS 'Token decimal precision';
COMMENT ON COLUMN public.vault_assets.collateral_commitment    IS 'Poseidon hash commitment of the collateral amount — 32 bytes, NEVER plaintext';
COMMENT ON COLUMN public.vault_assets.deposit_tx_hash          IS 'On-chain deposit transaction hash';
COMMENT ON COLUMN public.vault_assets.is_active                IS 'Whether this position is currently active';
COMMENT ON COLUMN public.vault_assets.created_at               IS 'Row creation timestamp';
COMMENT ON COLUMN public.vault_assets.updated_at               IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_vault_assets_updated_at ON public.vault_assets;
CREATE TRIGGER trg_vault_assets_updated_at
  BEFORE UPDATE ON public.vault_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: only the vault owner can see their asset positions
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vault_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vault_assets_select_own ON public.vault_assets;
CREATE POLICY vault_assets_select_own ON public.vault_assets
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS vault_assets_insert_own ON public.vault_assets;
CREATE POLICY vault_assets_insert_own ON public.vault_assets
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS vault_assets_update_own ON public.vault_assets;
CREATE POLICY vault_assets_update_own ON public.vault_assets
  FOR UPDATE TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vault_assets_vault_id       ON public.vault_assets (vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_wallet         ON public.vault_assets (wallet_address);
CREATE INDEX IF NOT EXISTS idx_vault_assets_token          ON public.vault_assets (token_address);
CREATE INDEX IF NOT EXISTS idx_vault_assets_active         ON public.vault_assets (vault_id) WHERE is_active = true;
