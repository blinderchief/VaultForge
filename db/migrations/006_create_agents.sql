-- 006_create_agents.sql
-- VaultForge: BNB AI Framework agent registry (off-chain mirror of AgentRegistry.sol)
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Enum: agent status
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE public.agent_status AS ENUM (
      'pending',     -- registration tx submitted
      'active',      -- registered on-chain, staked
      'suspended',   -- temporarily paused by operator
      'slashed',     -- on-chain slash() executed
      'removed'      -- removeAgent() completed
    );
  END IF;
END $$;

COMMENT ON TYPE public.agent_status IS 'Lifecycle states of an AI agent';

-- ══════════════════════════════════════════════════════════════════════
-- Table: agents
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.agents (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_address  text          NOT NULL,
  agent_address     text,
  name              text          NOT NULL,
  description       text,
  strategy_type     text          NOT NULL DEFAULT 'ltv_optimizer',
  stake_amount      numeric(78,0) NOT NULL DEFAULT 0,
  total_fees_earned numeric(78,0) NOT NULL DEFAULT 0,
  total_actions     integer       NOT NULL DEFAULT 0,
  status            agent_status  NOT NULL DEFAULT 'pending',
  register_tx_hash  text,
  metadata          jsonb         NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT agents_operator_format  CHECK (operator_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT agents_address_format   CHECK (agent_address IS NULL OR agent_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT agents_stake_non_neg    CHECK (stake_amount >= 0),
  CONSTRAINT agents_fees_non_neg     CHECK (total_fees_earned >= 0),
  CONSTRAINT agents_actions_non_neg  CHECK (total_actions >= 0),
  CONSTRAINT agents_name_nonempty    CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE  public.agents                        IS 'AI agents registered in the BNB AI Framework AgentRegistry';
COMMENT ON COLUMN public.agents.id                     IS 'Unique agent identifier';
COMMENT ON COLUMN public.agents.operator_address       IS 'Wallet address of the agent operator';
COMMENT ON COLUMN public.agents.agent_address          IS 'On-chain agent contract/EOA address (null until confirmed)';
COMMENT ON COLUMN public.agents.name                   IS 'Human-readable agent name';
COMMENT ON COLUMN public.agents.description            IS 'Description of agent strategy and behavior';
COMMENT ON COLUMN public.agents.strategy_type          IS 'Agent strategy category (ltv_optimizer, rebalancer, liquidator)';
COMMENT ON COLUMN public.agents.stake_amount           IS 'BNB stake amount in wei (minimum 0.01 ether per AgentRegistry.sol)';
COMMENT ON COLUMN public.agents.total_fees_earned      IS 'Cumulative fees earned from actions in wei';
COMMENT ON COLUMN public.agents.total_actions          IS 'Number of actions executed by this agent';
COMMENT ON COLUMN public.agents.status                 IS 'Current lifecycle state';
COMMENT ON COLUMN public.agents.register_tx_hash       IS 'On-chain registerAgent() transaction hash';
COMMENT ON COLUMN public.agents.metadata               IS 'Extensible metadata (model version, config params, etc.)';
COMMENT ON COLUMN public.agents.created_at             IS 'Row creation timestamp';
COMMENT ON COLUMN public.agents.updated_at             IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_agents_updated_at ON public.agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: operators see only their own agents
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agents_select_own ON public.agents;
CREATE POLICY agents_select_own ON public.agents
  FOR SELECT TO authenticated
  USING (lower(operator_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS agents_insert_own ON public.agents;
CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (lower(operator_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS agents_update_own ON public.agents;
CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE TO authenticated
  USING (lower(operator_address) = public.requesting_wallet_address())
  WITH CHECK (lower(operator_address) = public.requesting_wallet_address());

-- Public read for active agents (anyone authenticated can see registered agents)
DROP POLICY IF EXISTS agents_select_active ON public.agents;
CREATE POLICY agents_select_active ON public.agents
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_operator    ON public.agents (operator_address);
CREATE INDEX IF NOT EXISTS idx_agents_status      ON public.agents (status);
CREATE INDEX IF NOT EXISTS idx_agents_strategy    ON public.agents (strategy_type);
