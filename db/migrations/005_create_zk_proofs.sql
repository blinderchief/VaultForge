-- 005_create_zk_proofs.sql
-- VaultForge: ZK proof records — every proof generated or verified
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: proof status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proof_status') THEN
    CREATE TYPE public.proof_status AS ENUM (
      'generating',  -- prover is computing
      'generated',   -- proof created, not yet submitted on-chain
      'submitted',   -- submitted to ZKVerifier contract
      'verified',    -- on-chain verification passed
      'rejected',    -- verification failed
      'used'         -- consumed by a borrow() call (replay-prevented)
    );
  END IF;
END $$;

COMMENT ON TYPE public.proof_status IS 'Lifecycle states of a ZK proof';

-- ══════════════════════════════════════════════════════════════════════
-- Enum: circuit name
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circuit_name') THEN
    CREATE TYPE public.circuit_name AS ENUM (
      'CollateralThreshold',
      'ReputationScore',
      'LTVComputation'
    );
  END IF;
END $$;

COMMENT ON TYPE public.circuit_name IS 'Available ZK circuit types in VaultForge';

-- ══════════════════════════════════════════════════════════════════════
-- Table: zk_proofs
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.zk_proofs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        uuid          NOT NULL,
  wallet_address  text          NOT NULL,
  circuit         circuit_name  NOT NULL,
  proof_data      jsonb         NOT NULL DEFAULT '{}',
  public_signals  jsonb         NOT NULL DEFAULT '[]',
  proof_hash      text          NOT NULL,
  status          proof_status  NOT NULL DEFAULT 'generating',
  prover_duration_ms integer,
  verify_tx_hash  text,
  verified_at     timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT zk_proofs_vault_fk      FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE CASCADE,
  CONSTRAINT zk_proofs_wallet_format CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT zk_proofs_hash_unique   UNIQUE (proof_hash),
  CONSTRAINT zk_proofs_hash_nonempty CHECK (length(proof_hash) > 0),
  CONSTRAINT zk_proofs_duration_pos  CHECK (prover_duration_ms IS NULL OR prover_duration_ms >= 0)
);

COMMENT ON TABLE  public.zk_proofs                        IS 'ZK proof records — Groth16 proofs for collateral, reputation, and LTV circuits';
COMMENT ON COLUMN public.zk_proofs.id                     IS 'Unique proof identifier';
COMMENT ON COLUMN public.zk_proofs.vault_id               IS 'Vault this proof is associated with — FK to vaults.id';
COMMENT ON COLUMN public.zk_proofs.wallet_address         IS 'Proof requester wallet (denormalized for RLS)';
COMMENT ON COLUMN public.zk_proofs.circuit                IS 'Which circom circuit was used (CollateralThreshold / ReputationScore / LTVComputation)';
COMMENT ON COLUMN public.zk_proofs.proof_data             IS 'Groth16 proof object {pi_a, pi_b, pi_c, protocol, curve}';
COMMENT ON COLUMN public.zk_proofs.public_signals         IS 'Public signals array from the proof (commitment, boolean output, public input)';
COMMENT ON COLUMN public.zk_proofs.proof_hash             IS 'Unique hash for replay prevention (matches ZKVerifier.isProofUsed on-chain)';
COMMENT ON COLUMN public.zk_proofs.status                 IS 'Current proof lifecycle state';
COMMENT ON COLUMN public.zk_proofs.prover_duration_ms     IS 'Time taken to generate proof in milliseconds';
COMMENT ON COLUMN public.zk_proofs.verify_tx_hash         IS 'On-chain verification transaction hash';
COMMENT ON COLUMN public.zk_proofs.verified_at            IS 'Timestamp when proof was verified on-chain';
COMMENT ON COLUMN public.zk_proofs.created_at             IS 'Row creation timestamp';
COMMENT ON COLUMN public.zk_proofs.updated_at             IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_zk_proofs_updated_at ON public.zk_proofs;
CREATE TRIGGER trg_zk_proofs_updated_at
  BEFORE UPDATE ON public.zk_proofs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: users see only their own proofs
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.zk_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zk_proofs_select_own ON public.zk_proofs;
CREATE POLICY zk_proofs_select_own ON public.zk_proofs
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS zk_proofs_insert_own ON public.zk_proofs;
CREATE POLICY zk_proofs_insert_own ON public.zk_proofs
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS zk_proofs_update_own ON public.zk_proofs;
CREATE POLICY zk_proofs_update_own ON public.zk_proofs
  FOR UPDATE TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zk_proofs_vault_id   ON public.zk_proofs (vault_id);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_wallet     ON public.zk_proofs (wallet_address);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_circuit    ON public.zk_proofs (circuit);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_status     ON public.zk_proofs (status);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_hash       ON public.zk_proofs (proof_hash);

-- Add deferred FK from loans.proof_id → zk_proofs.id
-- (loans table was created before zk_proofs, so FK couldn't be added inline)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'loans_proof_fk' AND table_name = 'loans'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_proof_fk FOREIGN KEY (proof_id)
      REFERENCES public.zk_proofs(id) ON DELETE SET NULL;
  END IF;
END $$;
