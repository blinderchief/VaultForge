-- 008_create_oracle_feeds.sql
-- VaultForge: Oracle price feed snapshots — token prices from multiple sources
-- Idempotent — safe to re-run

-- ══════════════════════════════════════════════════════════════════════
-- Table: oracle_feeds
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.oracle_feeds (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address   text          NOT NULL,
  token_symbol    text          NOT NULL,
  price_usd       numeric(30,18) NOT NULL,
  price_bnb       numeric(30,18),
  source          text          NOT NULL,
  chain_id        integer       NOT NULL DEFAULT 5611,
  block_number    bigint,
  block_timestamp timestamptz,
  confidence      numeric(5,4),
  fetched_at      timestamptz   NOT NULL DEFAULT now(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT oracle_feeds_token_format  CHECK (token_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT oracle_feeds_price_pos     CHECK (price_usd > 0),
  CONSTRAINT oracle_feeds_bnb_pos       CHECK (price_bnb IS NULL OR price_bnb > 0),
  CONSTRAINT oracle_feeds_source_valid  CHECK (source IN ('chainlink', 'band', 'pyth', 'binance', 'custom', 'aggregated')),
  CONSTRAINT oracle_feeds_confidence    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT oracle_feeds_block_pos     CHECK (block_number IS NULL OR block_number >= 0)
);

COMMENT ON TABLE  public.oracle_feeds                      IS 'Token price feed snapshots from oracles — used for LTV calculation and liquidation triggers';
COMMENT ON COLUMN public.oracle_feeds.id                   IS 'Unique feed entry identifier';
COMMENT ON COLUMN public.oracle_feeds.token_address        IS 'ERC-20 token contract address';
COMMENT ON COLUMN public.oracle_feeds.token_symbol         IS 'Token ticker symbol';
COMMENT ON COLUMN public.oracle_feeds.price_usd            IS 'Token price in USD with 18 decimal precision';
COMMENT ON COLUMN public.oracle_feeds.price_bnb            IS 'Token price in BNB (nullable)';
COMMENT ON COLUMN public.oracle_feeds.source               IS 'Price data source (chainlink, band, pyth, binance, custom, aggregated)';
COMMENT ON COLUMN public.oracle_feeds.chain_id             IS 'Chain ID for the price data';
COMMENT ON COLUMN public.oracle_feeds.block_number         IS 'Block number when price was fetched';
COMMENT ON COLUMN public.oracle_feeds.block_timestamp      IS 'Block timestamp when price was fetched';
COMMENT ON COLUMN public.oracle_feeds.confidence           IS 'Confidence score 0.0-1.0 (aggregated sources)';
COMMENT ON COLUMN public.oracle_feeds.fetched_at           IS 'When the price was actually fetched from the source';
COMMENT ON COLUMN public.oracle_feeds.created_at           IS 'Row creation timestamp';
COMMENT ON COLUMN public.oracle_feeds.updated_at           IS 'Last modification timestamp (auto-updated)';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_oracle_feeds_updated_at ON public.oracle_feeds;
CREATE TRIGGER trg_oracle_feeds_updated_at
  BEFORE UPDATE ON public.oracle_feeds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- RLS: price feeds are public data — any authenticated user can read
--      only service_role can insert/update/delete
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.oracle_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oracle_feeds_select_all ON public.oracle_feeds;
CREATE POLICY oracle_feeds_select_all ON public.oracle_feeds
  FOR SELECT TO authenticated
  USING (true);

-- No insert/update/delete policies for authenticated role
-- Only service_role (backend) can write price data

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_token       ON public.oracle_feeds (token_address);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_symbol      ON public.oracle_feeds (token_symbol);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_source      ON public.oracle_feeds (source);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_fetched     ON public.oracle_feeds (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_latest      ON public.oracle_feeds (token_address, fetched_at DESC);

-- Hypertable-style partitioning hint: for high-frequency feeds, consider
-- pg_partman or Timescale extension. For now, the fetched_at DESC index suffices.
