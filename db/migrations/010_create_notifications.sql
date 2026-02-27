-- 010_create_notifications.sql
-- VaultForge: User notifications — liquidation warnings, proof results, LTV changes
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Table: notifications
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  text        NOT NULL,
  type            text        NOT NULL,
  severity        text        NOT NULL DEFAULT 'info',
  title           text        NOT NULL,
  body            text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  entity_type     text,
  entity_id       uuid,
  read            boolean     NOT NULL DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notif_wallet_format   CHECK (wallet_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT notif_type_valid      CHECK (type IN (
    'liquidation_warning', 'liquidation_executed',
    'proof_verified', 'proof_rejected',
    'ltv_optimized', 'ltv_challenged',
    'borrow_confirmed', 'repay_confirmed',
    'vault_created', 'vault_defaulted',
    'agent_action', 'system'
  )),
  CONSTRAINT notif_severity_valid  CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  CONSTRAINT notif_title_nonempty  CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE  public.notifications                     IS 'User-facing notifications for vault events, proof results, and system alerts';
COMMENT ON COLUMN public.notifications.id                  IS 'Unique notification identifier';
COMMENT ON COLUMN public.notifications.wallet_address      IS 'Recipient wallet address';
COMMENT ON COLUMN public.notifications.type                IS 'Notification category (liquidation_warning, proof_verified, etc.)';
COMMENT ON COLUMN public.notifications.severity            IS 'Severity level: info, warning, critical, success';
COMMENT ON COLUMN public.notifications.title               IS 'Short notification title';
COMMENT ON COLUMN public.notifications.body                IS 'Detailed notification body text';
COMMENT ON COLUMN public.notifications.metadata            IS 'Contextual data (vault_id, tx_hash, amounts, etc.)';
COMMENT ON COLUMN public.notifications.entity_type         IS 'Related entity type (vault, loan, proof, agent_action)';
COMMENT ON COLUMN public.notifications.entity_id           IS 'Related entity UUID';
COMMENT ON COLUMN public.notifications.read                IS 'Whether the user has read this notification';
COMMENT ON COLUMN public.notifications.read_at             IS 'Timestamp when notification was marked as read';
COMMENT ON COLUMN public.notifications.created_at          IS 'Row creation timestamp';
COMMENT ON COLUMN public.notifications.updated_at          IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: users see only their own notifications
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select_own ON public.notifications;
CREATE POLICY notif_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address());

DROP POLICY IF EXISTS notif_update_own ON public.notifications;
CREATE POLICY notif_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (lower(wallet_address) = public.requesting_wallet_address())
  WITH CHECK (lower(wallet_address) = public.requesting_wallet_address());

-- No insert for authenticated — only service_role creates notifications

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_wallet       ON public.notifications (wallet_address);
CREATE INDEX IF NOT EXISTS idx_notif_type         ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_notif_unread       ON public.notifications (wallet_address, created_at DESC)
                                                  WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notif_created      ON public.notifications (created_at DESC);
