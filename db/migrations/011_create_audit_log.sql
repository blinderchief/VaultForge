-- 011_create_audit_log.sql
-- VaultForge: Immutable audit trail — no UPDATE/DELETE allowed
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Table: audit_log
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text,
  entity_type   text        NOT NULL,
  entity_id     uuid,
  action        text        NOT NULL,
  old_data      jsonb,
  new_data      jsonb,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- NO updated_at — audit log is immutable by design

  CONSTRAINT audit_wallet_format    CHECK (wallet_address IS NULL OR wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT audit_entity_nonempty  CHECK (length(trim(entity_type)) > 0),
  CONSTRAINT audit_action_nonempty  CHECK (length(trim(action)) > 0),
  CONSTRAINT audit_action_valid     CHECK (action IN (
    'created', 'updated', 'deleted',
    'deposited', 'withdrew', 'borrowed', 'repaid',
    'defaulted', 'seized', 'liquidated',
    'proof_generated', 'proof_verified', 'proof_used',
    'agent_registered', 'agent_removed', 'agent_slashed',
    'ltv_proposed', 'ltv_challenged', 'ltv_finalized',
    'login', 'logout', 'settings_changed'
  ))
);

COMMENT ON TABLE  public.audit_log                     IS 'Immutable audit trail — append-only, no updates or deletes permitted';
COMMENT ON COLUMN public.audit_log.id                  IS 'Unique audit entry identifier';
COMMENT ON COLUMN public.audit_log.wallet_address      IS 'Wallet that triggered the action (null for system events)';
COMMENT ON COLUMN public.audit_log.entity_type         IS 'Type of entity affected (vault, loan, agent, proof, user, etc.)';
COMMENT ON COLUMN public.audit_log.entity_id           IS 'UUID of the affected entity';
COMMENT ON COLUMN public.audit_log.action              IS 'What happened (created, updated, deposited, borrowed, etc.)';
COMMENT ON COLUMN public.audit_log.old_data            IS 'Previous state snapshot (for updates, null for creates)';
COMMENT ON COLUMN public.audit_log.new_data            IS 'New state snapshot (for creates/updates, null for deletes)';
COMMENT ON COLUMN public.audit_log.ip_address          IS 'Client IP address (for security auditing)';
COMMENT ON COLUMN public.audit_log.user_agent          IS 'Client user-agent string';
COMMENT ON COLUMN public.audit_log.metadata            IS 'Additional context (tx_hash, block_number, etc.)';
COMMENT ON COLUMN public.audit_log.created_at          IS 'Immutable creation timestamp';

-- ══════════════════════════════════════════════════════════════════════
-- IMMUTABILITY: prevent updates and deletes via trigger
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable — UPDATE and DELETE are not allowed';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: users can read their own audit entries, service_role writes
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_select_own ON public.audit_log;
CREATE POLICY audit_select_own ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    wallet_address IS NOT NULL
    AND lower(wallet_address) = public.requesting_wallet_address()
  );

-- No insert/update/delete policies for authenticated role
-- Only service_role (backend) can append audit entries

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_wallet     ON public.audit_log (wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON public.audit_log (created_at DESC);
