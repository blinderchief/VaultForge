-- 002_create_vaults.sql
-- VaultForge: Core vault records — one per user per chain
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: vault status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_status') THEN
    CREATE TYPE public.vault_status AS ENUM (
      'pending',    -- factory tx submitted, not yet confirmed
      'active',     -- deployed and operational
      'defaulted',  -- triggerDefault() called on-chain
      'liquidating',-- seizure in progress
      'closed'      -- user withdrew everything, vault empty
    );
  END IF;
END $$;

COMMENT ON TYPE public.vault_status IS 'Lifecycle states of a collateral vault';

-- ══════════════════════════════════════════════════════════════════════
-- Table: vaults
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vaults (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid          NOT NULL,
  wallet_address         text          NOT NULL,
  vault_contract_address text,
  factory_tx_hash        text,
  chain_id               integer       NOT NULL DEFAULT 5611,
  status                 vault_status  NOT NULL DEFAULT 'pending',
  total_deposited        numeric(78,0) NOT NULL DEFAULT 0,
  total_borrowed         numeric(78,0) NOT NULL DEFAULT 0,
  current_ltv_bps        integer       NOT NULL DEFAULT 0,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT vaults_user_fk          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT vaults_wallet_format    CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT vaults_contract_format  CHECK (vault_contract_address IS NULL OR vault_contract_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT vaults_deposits_non_neg CHECK (total_deposited >= 0),
  CONSTRAINT vaults_borrows_non_neg  CHECK (total_borrowed >= 0),
  CONSTRAINT vaults_ltv_range        CHECK (current_ltv_bps >= 0 AND current_ltv_bps <= 10000)
);

COMMENT ON TABLE  public.vaults                           IS 'On-chain collateral vaults deployed via VaultFactory (EIP-1167 clones)';
COMMENT ON COLUMN public.vaults.id                        IS 'Unique vault identifier (UUID v4)';
COMMENT ON COLUMN public.vaults.user_id                   IS 'Owner — FK to users.id';
COMMENT ON COLUMN public.vaults.wallet_address            IS 'Owner wallet address (denormalized for RLS)';
COMMENT ON COLUMN public.vaults.vault_contract_address    IS 'Deployed vault proxy address on-chain (null until confirmed)';
COMMENT ON COLUMN public.vaults.factory_tx_hash           IS 'VaultFactory.createVault() transaction hash';
COMMENT ON COLUMN public.vaults.chain_id                  IS 'Chain where vault is deployed (5611 = opBNB testnet)';
COMMENT ON COLUMN public.vaults.status                    IS 'Current lifecycle state of the vault';
COMMENT ON COLUMN public.vaults.total_deposited           IS 'Sum of all deposits in base units (wei)';
COMMENT ON COLUMN public.vaults.total_borrowed            IS 'Sum of all outstanding borrows in base units';
COMMENT ON COLUMN public.vaults.current_ltv_bps           IS 'Current LTV ratio in basis points (0-10000)';
COMMENT ON COLUMN public.vaults.created_at                IS 'Row creation timestamp';
COMMENT ON COLUMN public.vaults.updated_at                IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_vaults_updated_at ON public.vaults;
CREATE TRIGGER trg_vaults_updated_at
  BEFORE UPDATE ON public.vaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: vault owners can only see their own vaults
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vaults_select_own ON public.vaults;
CREATE POLICY vaults_select_own ON public.vaults
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS vaults_insert_own ON public.vaults;
CREATE POLICY vaults_insert_own ON public.vaults
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS vaults_update_own ON public.vaults;
CREATE POLICY vaults_update_own ON public.vaults
  FOR UPDATE TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vaults_user_id        ON public.vaults (user_id);
CREATE INDEX IF NOT EXISTS idx_vaults_wallet_address  ON public.vaults (wallet_address);
CREATE INDEX IF NOT EXISTS idx_vaults_status          ON public.vaults (status);
CREATE INDEX IF NOT EXISTS idx_vaults_contract        ON public.vaults (vault_contract_address) WHERE vault_contract_address IS NOT NULL;
