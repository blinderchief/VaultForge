-- 001_create_users.sql
-- VaultForge: User profiles (wallet-based authentication via Privy)
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Helper: updated_at trigger function (shared by all tables)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at()
  IS 'Auto-sets updated_at to current timestamp on every UPDATE';

-- ══════════════════════════════════════════════════════════════════════
-- Helper: extract wallet_address from JWT claims (for RLS policies)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.requesting_wallet_address()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT lower(coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'wallet_address', ''),
    nullif(current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'wallet_address', '')
  ));
$$;

COMMENT ON FUNCTION public.requesting_wallet_address()
  IS 'Extracts the caller wallet address from the Supabase JWT for RLS';

-- ══════════════════════════════════════════════════════════════════════
-- Table: users
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  text        NOT NULL,
  chain_id        integer     NOT NULL DEFAULT 5611,
  display_name    text,
  avatar_url      text,
  reputation_score integer   NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address),
  CONSTRAINT users_wallet_address_format CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT users_chain_id_positive     CHECK (chain_id > 0),
  CONSTRAINT users_reputation_non_neg    CHECK (reputation_score >= 0)
);

COMMENT ON TABLE  public.users                    IS 'Wallet-based user profiles for VaultForge';
COMMENT ON COLUMN public.users.id                 IS 'Unique user identifier (UUID v4)';
COMMENT ON COLUMN public.users.wallet_address     IS 'EVM wallet address, lowercase hex with 0x prefix';
COMMENT ON COLUMN public.users.chain_id           IS 'Primary chain ID (5611 = opBNB testnet, 204 = opBNB mainnet)';
COMMENT ON COLUMN public.users.display_name       IS 'Optional display name chosen by user';
COMMENT ON COLUMN public.users.avatar_url         IS 'Optional avatar image URL';
COMMENT ON COLUMN public.users.reputation_score   IS 'Aggregate reputation score (computed from ZK proofs)';
COMMENT ON COLUMN public.users.is_active          IS 'Soft-delete flag — false means deactivated';
COMMENT ON COLUMN public.users.last_seen_at       IS 'Last API interaction timestamp';
COMMENT ON COLUMN public.users.created_at         IS 'Row creation timestamp';
COMMENT ON COLUMN public.users.updated_at         IS 'Last modification timestamp (auto-updated by trigger)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: users can SELECT only their own row
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Index
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users (wallet_address);
