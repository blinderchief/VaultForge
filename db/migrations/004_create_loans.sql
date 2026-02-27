-- 004_create_loans.sql
-- VaultForge: Borrow/loan records — ZK-gated, one loan per vault token pair
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: loan status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
    CREATE TYPE public.loan_status AS ENUM (
      'pending',     -- borrow tx submitted, not yet confirmed
      'active',      -- confirmed on-chain, accruing interest
      'repaid',      -- fully repaid by borrower
      'defaulted',   -- triggerDefault() called
      'liquidated'   -- partial seizure completed
    );
  END IF;
END $$;

COMMENT ON TYPE public.loan_status IS 'Lifecycle states of a borrow/loan';

-- ══════════════════════════════════════════════════════════════════════
-- Table: loans
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.loans (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id            uuid          NOT NULL,
  wallet_address      text          NOT NULL,
  token_address       text          NOT NULL,
  token_symbol        text          NOT NULL,
  principal           numeric(78,0) NOT NULL,
  outstanding_balance numeric(78,0) NOT NULL,
  interest_rate_bps   integer       NOT NULL DEFAULT 500,
  status              loan_status   NOT NULL DEFAULT 'pending',
  proof_id            uuid,
  borrow_tx_hash      text,
  repay_tx_hash       text,
  defaulted_at        timestamptz,
  liquidated_at       timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT loans_vault_fk          FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE CASCADE,
  CONSTRAINT loans_wallet_format     CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT loans_token_format      CHECK (token_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT loans_principal_pos     CHECK (principal > 0),
  CONSTRAINT loans_balance_non_neg   CHECK (outstanding_balance >= 0),
  CONSTRAINT loans_interest_range    CHECK (interest_rate_bps >= 0 AND interest_rate_bps <= 5000)
);

COMMENT ON TABLE  public.loans                        IS 'Borrow records — every borrow() call creates a loan row';
COMMENT ON COLUMN public.loans.id                     IS 'Unique loan identifier';
COMMENT ON COLUMN public.loans.vault_id               IS 'Vault backing this loan — FK to vaults.id';
COMMENT ON COLUMN public.loans.wallet_address         IS 'Borrower wallet address (denormalized for RLS)';
COMMENT ON COLUMN public.loans.token_address          IS 'Borrowed ERC-20 token contract address';
COMMENT ON COLUMN public.loans.token_symbol           IS 'Borrowed token ticker symbol';
COMMENT ON COLUMN public.loans.principal              IS 'Original borrow amount in base units (wei)';
COMMENT ON COLUMN public.loans.outstanding_balance    IS 'Remaining debt including accrued interest';
COMMENT ON COLUMN public.loans.interest_rate_bps      IS 'Annual interest rate in basis points (500 = 5%)';
COMMENT ON COLUMN public.loans.status                 IS 'Current lifecycle state of the loan';
COMMENT ON COLUMN public.loans.proof_id               IS 'ZK proof that authorized this borrow — FK to zk_proofs.id';
COMMENT ON COLUMN public.loans.borrow_tx_hash         IS 'On-chain borrow() transaction hash';
COMMENT ON COLUMN public.loans.repay_tx_hash          IS 'On-chain repay() transaction hash (null if not repaid)';
COMMENT ON COLUMN public.loans.defaulted_at           IS 'Timestamp when triggerDefault() was called';
COMMENT ON COLUMN public.loans.liquidated_at          IS 'Timestamp when seizure completed';
COMMENT ON COLUMN public.loans.created_at             IS 'Row creation timestamp';
COMMENT ON COLUMN public.loans.updated_at             IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: borrowers see only their own loans
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loans_select_own ON public.loans;
CREATE POLICY loans_select_own ON public.loans
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS loans_insert_own ON public.loans;
CREATE POLICY loans_insert_own ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS loans_update_own ON public.loans;
CREATE POLICY loans_update_own ON public.loans
  FOR UPDATE TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_vault_id       ON public.loans (vault_id);
CREATE INDEX IF NOT EXISTS idx_loans_wallet         ON public.loans (wallet_address);
CREATE INDEX IF NOT EXISTS idx_loans_status         ON public.loans (status);
CREATE INDEX IF NOT EXISTS idx_loans_active         ON public.loans (vault_id) WHERE status = 'active';
