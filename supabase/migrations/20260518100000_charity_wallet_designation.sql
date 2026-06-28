-- Migration: Charity wallet designation (PR1)
--
-- Replaces the legacy "any connected wallet wins" flow with a designation
-- pipeline that requires:
--   1. A signed attestation (EIP-191 for EOAs, EIP-1271 for smart-contract
--      wallets like Gnosis Safe) proving control of the candidate address.
--   2. An out-of-band email confirmation sent to the charity's
--      authorized_signer_email.
--
-- After this migration, charity_profiles.wallet_address and
-- charity_profiles.wallet_designation_status can ONLY be written by the
-- service-role edge functions (wallet-designation-submit,
-- wallet-designation-recheck, wallet-designation-confirm). Owner UPDATEs
-- that touch those columns are rejected by RLS.

-- ============================================================================
-- 1. New columns on charity_profiles
-- ============================================================================

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS wallet_designation_status TEXT
    NOT NULL DEFAULT 'unset'
    CHECK (wallet_designation_status IN (
      'unset',
      'pending_signature_verification',
      'pending_email_confirmation',
      'active'
    )),
  ADD COLUMN IF NOT EXISTS wallet_kind TEXT
    CHECK (wallet_kind IN ('eoa', 'contract')),
  ADD COLUMN IF NOT EXISTS wallet_designated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_designation_signature TEXT,
  ADD COLUMN IF NOT EXISTS wallet_designation_message TEXT,
  ADD COLUMN IF NOT EXISTS wallet_designation_chain_id INTEGER;

COMMENT ON COLUMN charity_profiles.wallet_designation_status IS
  'Lifecycle of the designated payout wallet. Donations are only enabled when status = active.';
COMMENT ON COLUMN charity_profiles.wallet_kind IS
  'eoa = ecrecover-verified externally owned account. contract = EIP-1271 smart-contract wallet (e.g. Gnosis Safe).';

-- Grandfather existing rows: any charity that already has a wallet_address
-- from the legacy flow is marked 'unset' so the checklist nags them to
-- re-designate. Their wallet_address is preserved so donations keep flowing
-- during a 60-day grace period (enforced at the application layer, not here).
UPDATE charity_profiles
  SET wallet_designation_status = 'unset'
  WHERE wallet_address IS NOT NULL
    AND wallet_designation_status = 'unset';

-- ============================================================================
-- 2. Short-lived nonces (single-use, 10-min TTL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_designation_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_profile_id UUID NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  candidate_address TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_nonces_user ON wallet_designation_nonces (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_nonces_expires ON wallet_designation_nonces (expires_at);

ALTER TABLE wallet_designation_nonces ENABLE ROW LEVEL SECURITY;
-- No client-side access: only the service role (edge functions) reads/writes.

-- ============================================================================
-- 3. Email confirmation tokens (single-use, 24h TTL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_designation_confirmations (
  token TEXT PRIMARY KEY,
  charity_profile_id UUID NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  candidate_address TEXT NOT NULL,
  sent_to_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_confirmations_profile ON wallet_designation_confirmations (charity_profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_confirmations_expires ON wallet_designation_confirmations (expires_at);

ALTER TABLE wallet_designation_confirmations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Pending contract-wallet signatures awaiting Safe threshold
-- ============================================================================
-- Smart-contract wallets (Safes) finalize signatures asynchronously after
-- their internal threshold is met. We store the unverified signature and
-- re-check periodically until it becomes valid (or expires).

CREATE TABLE IF NOT EXISTS wallet_designation_pending_contract_sigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_profile_id UUID NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  candidate_address TEXT NOT NULL,
  message_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_sigs_profile ON wallet_designation_pending_contract_sigs (charity_profile_id);
CREATE INDEX IF NOT EXISTS idx_pending_sigs_expires ON wallet_designation_pending_contract_sigs (expires_at);

ALTER TABLE wallet_designation_pending_contract_sigs ENABLE ROW LEVEL SECURITY;

-- Owners can read pending sigs for their own profile (for status display).
CREATE POLICY pending_sigs_owner_read ON wallet_designation_pending_contract_sigs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM charity_profiles cp
      WHERE cp.id = wallet_designation_pending_contract_sigs.charity_profile_id
        AND cp.claimed_by = auth.uid()
    )
  );

-- ============================================================================
-- 5. Append-only audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS charity_wallet_designations_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_profile_id UUID NOT NULL REFERENCES charity_profiles(id),
  changed_by UUID REFERENCES auth.users(id),
  previous_address TEXT,
  new_address TEXT,
  wallet_kind TEXT,
  signature TEXT,
  message TEXT,
  chain_id INTEGER,
  ip INET,
  user_agent TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'initial_designation_submitted',
    'contract_signature_pending',
    'contract_signature_verified',
    'email_sent',
    'email_confirmed',
    'expired',
    'admin_reset'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_history_profile ON charity_wallet_designations_history (charity_profile_id, created_at DESC);

ALTER TABLE charity_wallet_designations_history ENABLE ROW LEVEL SECURITY;

-- Owners can read their own audit history.
CREATE POLICY wallet_history_owner_read ON charity_wallet_designations_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM charity_profiles cp
      WHERE cp.id = charity_wallet_designations_history.charity_profile_id
        AND cp.claimed_by = auth.uid()
    )
  );

-- ============================================================================
-- 6. Lock down wallet_address writes from authenticated clients
-- ============================================================================
-- After this migration, the authenticated role can still UPDATE its own
-- charity_profiles row for non-wallet columns (mission, logo, etc.), but
-- attempts to write wallet_address or any wallet_designation_* column are
-- rejected. Only the service role (used inside edge functions) can write
-- those columns.

REVOKE UPDATE (
  wallet_address,
  wallet_designation_status,
  wallet_kind,
  wallet_designated_at,
  wallet_designation_signature,
  wallet_designation_message,
  wallet_designation_chain_id
) ON charity_profiles FROM authenticated;

COMMENT ON TABLE charity_wallet_designations_history IS
  'Append-only audit log of every wallet designation lifecycle event. Never delete rows.';
