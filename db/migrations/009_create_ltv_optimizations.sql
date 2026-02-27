-- 009_create_ltv_optimizations.sql
-- VaultForge: LTV optimization proposals — mirrors LTVOracle.sol challenge window
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: optimization status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'optimization_status') THEN
    CREATE TYPE public.optimization_status AS ENUM (
      'proposed',    -- submitOptimization() called
      'challenged',  -- challengeOptimization() called within window
      'finalized',   -- finalizeOptimization() succeeded after challenge window
      'rejected',    -- challenge succeeded, proposal rejected
      'expired'      -- never finalized, past deadline
    );
  END IF;
END $$;

COMMENT ON TYPE public.optimization_status IS 'States of an LTV optimization proposal (mirrors LTVOracle.sol)';

-- ══════════════════════════════════════════════════════════════════════
-- Table: ltv_optimizations
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ltv_optimizations (
  id                   uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id             uuid                 NOT NULL,
  wallet_address       text                 NOT NULL,
  agent_id             uuid,
  proof_id             uuid,
  current_ltv_bps      integer              NOT NULL,
  suggested_ltv_bps    integer              NOT NULL,
  rationale            text,
  status               optimization_status  NOT NULL DEFAULT 'proposed',
  submit_tx_hash       text,
  challenge_tx_hash    text,
  finalize_tx_hash     text,
  challenge_deadline   timestamptz,
  challenged_by        text,
  finalized_at         timestamptz,
  on_chain_id          integer,
  created_at           timestamptz          NOT NULL DEFAULT now(),
  updated_at           timestamptz          NOT NULL DEFAULT now(),

  CONSTRAINT ltv_opt_vault_fk         FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE CASCADE,
  CONSTRAINT ltv_opt_agent_fk         FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL,
  CONSTRAINT ltv_opt_proof_fk         FOREIGN KEY (proof_id) REFERENCES public.zk_proofs(id) ON DELETE SET NULL,
  CONSTRAINT ltv_opt_wallet_format    CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT ltv_opt_challenger_fmt   CHECK (challenged_by IS NULL OR challenged_by ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT ltv_opt_current_range    CHECK (current_ltv_bps >= 0 AND current_ltv_bps <= 10000),
  CONSTRAINT ltv_opt_suggested_range  CHECK (suggested_ltv_bps >= 1000 AND suggested_ltv_bps <= 9000),
  CONSTRAINT ltv_opt_different        CHECK (current_ltv_bps <> suggested_ltv_bps)
);

COMMENT ON TABLE  public.ltv_optimizations                       IS 'LTV optimization proposals from agents — subject to 1-hour challenge window per LTVOracle.sol';
COMMENT ON COLUMN public.ltv_optimizations.id                    IS 'Unique optimization proposal identifier';
COMMENT ON COLUMN public.ltv_optimizations.vault_id              IS 'Target vault — FK to vaults.id';
COMMENT ON COLUMN public.ltv_optimizations.wallet_address        IS 'Vault owner wallet (denormalized for RLS)';
COMMENT ON COLUMN public.ltv_optimizations.agent_id              IS 'Agent that proposed this optimization (nullable) — FK to agents.id';
COMMENT ON COLUMN public.ltv_optimizations.proof_id              IS 'ZK proof backing the optimization (nullable) — FK to zk_proofs.id';
COMMENT ON COLUMN public.ltv_optimizations.current_ltv_bps       IS 'LTV before optimization in basis points';
COMMENT ON COLUMN public.ltv_optimizations.suggested_ltv_bps     IS 'Proposed new LTV in basis points (1000-9000 per LTVOracle.sol)';
COMMENT ON COLUMN public.ltv_optimizations.rationale             IS 'Human-readable reason for the optimization';
COMMENT ON COLUMN public.ltv_optimizations.status                IS 'Current proposal state';
COMMENT ON COLUMN public.ltv_optimizations.submit_tx_hash        IS 'submitOptimization() transaction hash';
COMMENT ON COLUMN public.ltv_optimizations.challenge_tx_hash     IS 'challengeOptimization() transaction hash (if challenged)';
COMMENT ON COLUMN public.ltv_optimizations.finalize_tx_hash      IS 'finalizeOptimization() transaction hash (if finalized)';
COMMENT ON COLUMN public.ltv_optimizations.challenge_deadline    IS 'Deadline for challenges (submit time + CHALLENGE_WINDOW)';
COMMENT ON COLUMN public.ltv_optimizations.challenged_by         IS 'Wallet address of the challenger (if any)';
COMMENT ON COLUMN public.ltv_optimizations.finalized_at          IS 'Timestamp when optimization was finalized on-chain';
COMMENT ON COLUMN public.ltv_optimizations.on_chain_id           IS 'Optimization ID on the LTVOracle contract';
COMMENT ON COLUMN public.ltv_optimizations.created_at            IS 'Row creation timestamp';
COMMENT ON COLUMN public.ltv_optimizations.updated_at            IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ltv_optimizations_updated_at ON public.ltv_optimizations;
CREATE TRIGGER trg_ltv_optimizations_updated_at
  BEFORE UPDATE ON public.ltv_optimizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: vault owners see optimizations on their vaults
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.ltv_optimizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ltv_opt_select_own ON public.ltv_optimizations;
CREATE POLICY ltv_opt_select_own ON public.ltv_optimizations
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS ltv_opt_insert_own ON public.ltv_optimizations;
CREATE POLICY ltv_opt_insert_own ON public.ltv_optimizations
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS ltv_opt_update_own ON public.ltv_optimizations;
CREATE POLICY ltv_opt_update_own ON public.ltv_optimizations
  FOR UPDATE TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ltv_opt_vault_id     ON public.ltv_optimizations (vault_id);
CREATE INDEX IF NOT EXISTS idx_ltv_opt_wallet       ON public.ltv_optimizations (wallet_address);
CREATE INDEX IF NOT EXISTS idx_ltv_opt_agent_id     ON public.ltv_optimizations (agent_id);
CREATE INDEX IF NOT EXISTS idx_ltv_opt_status       ON public.ltv_optimizations (status);
CREATE INDEX IF NOT EXISTS idx_ltv_opt_pending      ON public.ltv_optimizations (challenge_deadline)
                                                    WHERE status = 'proposed';
