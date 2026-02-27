-- 012_seed_dev_data.sql
-- VaultForge: LOCAL DEVELOPMENT SEED DATA ONLY
-- ════════════════════════════════════════════════════════════════════
-- WARNING: This file inserts test data for local development.
-- NEVER run this in staging or production environments.
-- ════════════════════════════════════════════════════════════════════
-- Idempotent — uses ON CONFLICT DO NOTHING

-- ══════════════════════════════════════════════════════════════════════
-- Enable Supabase Realtime on specified tables
-- (Done here instead of a separate migration so it runs last)
-- ══════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- Realtime: vaults
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vaults'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vaults;
  END IF;

  -- Realtime: agent_actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agent_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_actions;
  END IF;

  -- Realtime: oracle_feeds
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'oracle_feeds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.oracle_feeds;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Users
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.users (id, wallet_address, chain_id, display_name, reputation_score)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 5611, 'Alice (Dev)', 8500),
  ('a0000000-0000-0000-0000-000000000002', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 5611, 'Bob (Dev)', 6200),
  ('a0000000-0000-0000-0000-000000000003', '0x90f79bf6eb2c4f870365e785982e1f101e93b906', 5611, 'Charlie (Dev)', 4000)
ON CONFLICT (wallet_address) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Vaults
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.vaults (id, user_id, wallet_address, vault_contract_address, chain_id, status, total_deposited, total_borrowed, current_ltv_bps)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x1111111111111111111111111111111111111111',
    5611, 'active',
    1000000000000000000000,  -- 1000 tokens deposited
    500000000000000000000,   -- 500 tokens borrowed
    5000                     -- 50% LTV
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    '0x2222222222222222222222222222222222222222',
    5611, 'active',
    500000000000000000000,
    100000000000000000000,
    2000
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Vault Assets (ZK commitment hashes — NOT plaintext amounts)
-- These are example 32-byte Poseidon commitment hashes
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.vault_assets (id, vault_id, wallet_address, token_address, token_symbol, token_decimals, collateral_commitment, is_active)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', -- WBNB
    'WBNB', 18,
    '\x17a8c68478bd128a679cd7f73b1dc092cbf455ff849e8d01238919ddc2409e8d'::bytea,
    true
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x55d398326f99059ff775485246999027b3197955', -- USDT
    'USDT', 18,
    '\x4042730219294079482926703329161313763563782703470539497263abcdef'::bytea,
    true
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    'WBNB', 18,
    '\x16395080142253457423382973983639441323400461378027347463cc995154'::bytea,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test ZK Proofs
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.zk_proofs (id, vault_id, wallet_address, circuit, proof_data, public_signals, proof_hash, status, prover_duration_ms, verified_at)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    'CollateralThreshold',
    '{"pi_a": ["0x1095a6f7", "0x2ce5e5f2"], "pi_b": [["0x164f39e5", "0x2d5ab174"], ["0x2cf148c3", "0x009fa98f"]], "pi_c": ["0x21947374", "0x071911b7"], "protocol": "groth16", "curve": "bn128"}',
    '["10701395941502774979696515461883671971228744800004823607239438080880607796877", "1", "100000000000000000000"]',
    'proof_hash_alice_collateral_001',
    'used',
    1250,
    now() - interval '2 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    'LTVComputation',
    '{"pi_a": ["0xaabbccdd", "0xeeff0011"], "pi_b": [["0x22334455", "0x66778899"], ["0xaabbccdd", "0xeeff0011"]], "pi_c": ["0x11223344", "0x55667788"], "protocol": "groth16", "curve": "bn128"}',
    '["16395080142253457423382973983639441323400461378027347463179951539799630617254", "1", "7500"]',
    'proof_hash_alice_ltv_001',
    'verified',
    980,
    now() - interval '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Loans
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.loans (id, vault_id, wallet_address, token_address, token_symbol, principal, outstanding_balance, interest_rate_bps, status, proof_id, borrow_tx_hash)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x55d398326f99059ff775485246999027b3197955',
    'USDT',
    500000000000000000000,
    505000000000000000000,
    500,
    'active',
    'd0000000-0000-0000-0000-000000000001',
    '0xaaaa000000000000000000000000000000000000000000000000000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Agents
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.agents (id, operator_address, agent_address, name, description, strategy_type, stake_amount, status)
VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
    '0x3333333333333333333333333333333333333333',
    'OptiMax LTV Bot',
    'Automated LTV optimizer using scipy convex optimization — proposes LTV adjustments based on market volatility',
    'ltv_optimizer',
    10000000000000000,  -- 0.01 BNB
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Agent Actions
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.agent_actions (id, agent_id, vault_id, wallet_address, action_type, parameters, result, status, fee_amount, completed_at)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    'optimize_ltv',
    '{"current_ltv_bps": 5000, "market_volatility": 0.15, "token": "WBNB"}',
    '{"suggested_ltv_bps": 6500, "expected_yield_increase_bps": 120}',
    'completed',
    1000000000000000,
    now() - interval '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Oracle Feeds
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.oracle_feeds (id, token_address, token_symbol, price_usd, price_bnb, source, chain_id, block_number, fetched_at)
VALUES
  ('f2000000-0000-0000-0000-000000000001', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 'WBNB',  610.50, 1.0, 'binance', 5611, 42000000, now() - interval '5 minutes'),
  ('f2000000-0000-0000-0000-000000000002', '0x55d398326f99059ff775485246999027b3197955', 'USDT',    1.0001, 0.001639, 'chainlink', 5611, 42000000, now() - interval '5 minutes'),
  ('f2000000-0000-0000-0000-000000000003', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'ETH',  3420.75, 5.603, 'binance', 5611, 42000000, now() - interval '5 minutes'),
  ('f2000000-0000-0000-0000-000000000004', '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', 'BTCB', 95250.00, 156.02, 'chainlink', 5611, 42000000, now() - interval '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test LTV Optimization
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.ltv_optimizations (id, vault_id, wallet_address, agent_id, proof_id, current_ltv_bps, suggested_ltv_bps, rationale, status, challenge_deadline)
VALUES
  (
    'f3000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    'f0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    5000,
    6500,
    'Market volatility decreased 15% over 7d. WBNB correlation with BTC stable at 0.87. Safe to increase LTV.',
    'proposed',
    now() + interval '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Notifications
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.notifications (id, wallet_address, type, severity, title, body, entity_type, entity_id, read)
VALUES
  ('f4000000-0000-0000-0000-000000000001', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'proof_verified', 'success', 'Collateral proof verified', 'Your CollateralThreshold proof has been verified on-chain.', 'proof', 'd0000000-0000-0000-0000-000000000001', true),
  ('f4000000-0000-0000-0000-000000000002', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'ltv_optimized', 'info', 'LTV optimization proposed', 'OptiMax LTV Bot suggests increasing your LTV from 50% to 65%.', 'ltv_optimization', 'f3000000-0000-0000-0000-000000000001', false),
  ('f4000000-0000-0000-0000-000000000003', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'vault_created', 'success', 'Vault deployed', 'Your collateral vault is now active on opBNB testnet.', 'vault', 'b0000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Seed: Test Audit Log Entries
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO public.audit_log (id, wallet_address, entity_type, entity_id, action, new_data)
VALUES
  ('f5000000-0000-0000-0000-000000000001', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'vault', 'b0000000-0000-0000-0000-000000000001', 'created', '{"status": "active", "chain_id": 5611}'),
  ('f5000000-0000-0000-0000-000000000002', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'loan', 'e0000000-0000-0000-0000-000000000001', 'borrowed', '{"principal": "500000000000000000000", "token": "USDT"}'),
  ('f5000000-0000-0000-0000-000000000003', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'vault', 'b0000000-0000-0000-0000-000000000002', 'created', '{"status": "active", "chain_id": 5611}')
ON CONFLICT (id) DO NOTHING;
