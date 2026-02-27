-- 007_create_agent_actions.sql
-- VaultForge: AI agent action log — every action an agent performs
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: action status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status') THEN
    CREATE TYPE public.action_status AS ENUM (
      'proposed',    -- agent submitted proposal
      'approved',    -- approved by user or timelock
      'executing',   -- on-chain tx in flight
      'completed',   -- action finished successfully
      'failed',      -- action reverted or errored
      'rejected'     -- user or system rejected the proposal
    );
  END IF;
END $$;

COMMENT ON TYPE public.action_status IS 'States of an agent-initiated action';

-- ══════════════════════════════════════════════════════════════════════
-- Table: agent_actions
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid           NOT NULL,
  vault_id         uuid,
  wallet_address   text           NOT NULL,
  action_type      text           NOT NULL,
  parameters       jsonb          NOT NULL DEFAULT '{}',
  result           jsonb,
  fee_amount       numeric(78,0)  NOT NULL DEFAULT 0,
  tx_hash          text,
  status           action_status  NOT NULL DEFAULT 'proposed',
  error_message    text,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT agent_actions_agent_fk    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE,
  CONSTRAINT agent_actions_vault_fk    FOREIGN KEY (vault_id) REFERENCES public.vaults(id) ON DELETE SET NULL,
  CONSTRAINT agent_actions_wallet_fmt  CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT agent_actions_type_nonempty CHECK (length(trim(action_type)) > 0),
  CONSTRAINT agent_actions_fee_non_neg CHECK (fee_amount >= 0)
);

COMMENT ON TABLE  public.agent_actions                     IS 'Log of every action executed by AI agents (optimize LTV, rebalance, etc.)';
COMMENT ON COLUMN public.agent_actions.id                  IS 'Unique action identifier';
COMMENT ON COLUMN public.agent_actions.agent_id            IS 'Agent that initiated this action — FK to agents.id';
COMMENT ON COLUMN public.agent_actions.vault_id            IS 'Target vault (nullable for non-vault actions) — FK to vaults.id';
COMMENT ON COLUMN public.agent_actions.wallet_address      IS 'Vault owner wallet (denormalized for RLS)';
COMMENT ON COLUMN public.agent_actions.action_type         IS 'Action category (optimize_ltv, rebalance, liquidation_warning, etc.)';
COMMENT ON COLUMN public.agent_actions.parameters          IS 'Input parameters for the action';
COMMENT ON COLUMN public.agent_actions.result              IS 'Output/result data from the action';
COMMENT ON COLUMN public.agent_actions.fee_amount          IS 'Fee charged for this action in wei';
COMMENT ON COLUMN public.agent_actions.tx_hash             IS 'On-chain transaction hash (if applicable)';
COMMENT ON COLUMN public.agent_actions.status              IS 'Current state of the action';
COMMENT ON COLUMN public.agent_actions.error_message       IS 'Error description if status is failed';
COMMENT ON COLUMN public.agent_actions.started_at          IS 'When execution began';
COMMENT ON COLUMN public.agent_actions.completed_at        IS 'When execution finished (success or failure)';
COMMENT ON COLUMN public.agent_actions.created_at          IS 'Row creation timestamp';
COMMENT ON COLUMN public.agent_actions.updated_at          IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_agent_actions_updated_at ON public.agent_actions;
CREATE TRIGGER trg_agent_actions_updated_at
  BEFORE UPDATE ON public.agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: vault owners see actions on their vaults
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_actions_select_own ON public.agent_actions;
CREATE POLICY agent_actions_select_own ON public.agent_actions
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

-- Agents (operators) can also see actions they initiated
DROP POLICY IF EXISTS agent_actions_select_operator ON public.agent_actions;
CREATE POLICY agent_actions_select_operator ON public.agent_actions
  FOR SELECT TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents
      WHERE lower(operator_address) = public.requesting_wallet_address()
    )
  );

DROP POLICY IF EXISTS agent_actions_insert_service ON public.agent_actions;
CREATE POLICY agent_actions_insert_service ON public.agent_actions
  FOR INSERT TO authenticated
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id  ON public.agent_actions (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_vault_id  ON public.agent_actions (vault_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_wallet    ON public.agent_actions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status    ON public.agent_actions (status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type      ON public.agent_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created   ON public.agent_actions (created_at DESC);
