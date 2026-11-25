-- =============================================================================
-- Migration: Add wallet onboarding lifecycle + test-transaction tracking
-- Description: Charity crypto-wallet onboarding per the operator's 3-stage plan:
--   collect official wallet -> confirm via test transaction -> mark official.
--   Adds an onboarding_status lifecycle column and test-transaction columns so a
--   wallet can be collected first (pending) and confirmed separately from the
--   existing signature proof-of-control, then promoted to official.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. onboarding_status lifecycle (pending -> test_transaction_sent ->
--    test_transaction_confirmed -> official)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_wallets
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN (
      'pending',
      'test_transaction_sent',
      'test_transaction_confirmed',
      'official'
    ));

COMMENT ON COLUMN charity_wallets.onboarding_status IS
  'Onboarding lifecycle: pending -> test_transaction_sent -> test_transaction_confirmed -> official.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Test-transaction confirmation columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_wallets
  ADD COLUMN IF NOT EXISTS test_transaction_hash TEXT;

ALTER TABLE charity_wallets
  ADD COLUMN IF NOT EXISTS test_transaction_amount TEXT;

ALTER TABLE charity_wallets
  ADD COLUMN IF NOT EXISTS test_transaction_token_address TEXT;

ALTER TABLE charity_wallets
  ADD COLUMN IF NOT EXISTS test_transaction_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN charity_wallets.test_transaction_hash IS
  'On-chain tx hash of the test transaction used to confirm wallet control.';
COMMENT ON COLUMN charity_wallets.test_transaction_amount IS
  'Test-transaction amount as a decimal string (avoids float precision).';
COMMENT ON COLUMN charity_wallets.test_transaction_token_address IS
  'Token contract address used for the test transaction.';
COMMENT ON COLUMN charity_wallets.test_transaction_confirmed_at IS
  'Timestamp when the test transaction was confirmed on-chain.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: wallets already verified via proof-of-control (or already
--    primary) are considered official, so existing flows stay intact.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE charity_wallets
SET onboarding_status = 'official'
WHERE proof_of_control_verified_at IS NOT NULL OR is_primary = true;
