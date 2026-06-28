-- Migration: Wallet designation cooldown flow (PR2)
--
-- Extends PR1 with a 72-hour cooling-off period for changing an
-- already-active wallet. The flow becomes:
--
--   active
--     → submit new sig
--     → email sent for new wallet (status stays 'active', pending_wallet_*
--       columns are populated)
--     → user clicks email link
--     → status flips to 'pending_change_cooldown'
--     → 72h pass with no cancellation
--     → cron promotes pending_wallet_address → wallet_address, status = active
--
-- Cancel paths (any time during cooldown):
--   - Token-based magic link sent in change emails
--   - Authenticated dashboard call by claimed_by owner
-- Both write a 'change_cancelled' audit row and email the signer with the IP.

-- ============================================================================
-- 1. Add pending_wallet_* columns + new status value
-- ============================================================================

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS pending_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS pending_wallet_kind TEXT
    CHECK (pending_wallet_kind IN ('eoa', 'contract')),
  ADD COLUMN IF NOT EXISTS pending_wallet_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_wallet_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_wallet_designation_signature TEXT,
  ADD COLUMN IF NOT EXISTS pending_wallet_designation_message TEXT,
  ADD COLUMN IF NOT EXISTS pending_wallet_designation_chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS pending_wallet_reminder_24h_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_wallet_reminder_48h_at TIMESTAMPTZ;

COMMENT ON COLUMN charity_profiles.pending_wallet_address IS
  'A wallet address awaiting promotion to wallet_address. Only valid when wallet_designation_status = ''pending_change_cooldown''.';
COMMENT ON COLUMN charity_profiles.pending_wallet_effective_at IS
  'Timestamp at which the cooldown ends and the pending wallet becomes active. Cron job promotes on/after this time.';

-- Expand the status check to include the new cooldown state.
ALTER TABLE charity_profiles
  DROP CONSTRAINT IF EXISTS charity_profiles_wallet_designation_status_check;
ALTER TABLE charity_profiles
  ADD CONSTRAINT charity_profiles_wallet_designation_status_check
  CHECK (wallet_designation_status IN (
    'unset',
    'pending_signature_verification',
    'pending_email_confirmation',
    'active',
    'pending_change_cooldown'
  ));

-- ============================================================================
-- 2. wallet_designation_confirmations: distinguish initial vs change
-- ============================================================================

ALTER TABLE wallet_designation_confirmations
  ADD COLUMN IF NOT EXISTS purpose TEXT
    CHECK (purpose IN ('initial', 'change'))
    DEFAULT 'initial';

COMMENT ON COLUMN wallet_designation_confirmations.purpose IS
  'initial = first-time designation; change = re-designating an already-active wallet (triggers cooldown after click).';

-- ============================================================================
-- 3. Cancel tokens (1 per active cooldown; expires when cooldown does)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_designation_cancel_tokens (
  token TEXT PRIMARY KEY,
  charity_profile_id UUID NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cancel_tokens_profile
  ON wallet_designation_cancel_tokens (charity_profile_id);
CREATE INDEX IF NOT EXISTS idx_cancel_tokens_expires
  ON wallet_designation_cancel_tokens (expires_at);

ALTER TABLE wallet_designation_cancel_tokens ENABLE ROW LEVEL SECURITY;
-- No client-side access: cancellation goes through edge functions only.

-- ============================================================================
-- 4. Lock down the new pending_* columns from authenticated writes
-- ============================================================================

REVOKE UPDATE (
  pending_wallet_address,
  pending_wallet_kind,
  pending_wallet_started_at,
  pending_wallet_effective_at,
  pending_wallet_designation_signature,
  pending_wallet_designation_message,
  pending_wallet_designation_chain_id,
  pending_wallet_reminder_24h_at,
  pending_wallet_reminder_48h_at
) ON charity_profiles FROM authenticated;

-- ============================================================================
-- 5. Expand the audit log action enum
-- ============================================================================

ALTER TABLE charity_wallet_designations_history
  DROP CONSTRAINT IF EXISTS charity_wallet_designations_history_action_check;
ALTER TABLE charity_wallet_designations_history
  ADD CONSTRAINT charity_wallet_designations_history_action_check
  CHECK (action IN (
    -- PR1 actions
    'initial_designation_submitted',
    'contract_signature_pending',
    'contract_signature_verified',
    'email_sent',
    'email_confirmed',
    'expired',
    'admin_reset',
    -- PR2 (cooldown) actions
    'change_submitted',
    'change_email_sent',
    'change_cooldown_started',
    'change_reminder_sent',
    'change_cancelled',
    'change_promoted'
  ));
