-- =============================================================================
-- Migration: Create charity_wallets table + validation trigger + RLS + backfill
-- Issue: GIV-286 (child of GIV-285)
-- Description: Tiered wallet onboarding — stores Safe multisig, institutional
--   custody, and single-signer EOA metadata alongside the existing
--   charity_profiles.wallet_address designation system.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create charity_wallets table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS charity_wallets (
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_profile_id              UUID          NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  wallet_address                  TEXT          NOT NULL,
  chain_id                        INTEGER       NOT NULL,
  wallet_type                     TEXT          NOT NULL CHECK (wallet_type IN ('eoa', 'safe', 'institutional')),
  signer_count                    INTEGER,
  signer_threshold                INTEGER,
  custodian_name                  TEXT,
  custodian_attestation_doc_url   TEXT,
  proof_of_control_signature      TEXT,
  proof_of_control_message        TEXT,
  proof_of_control_verified_at    TIMESTAMPTZ,
  risk_acknowledgment_at          TIMESTAMPTZ,
  risk_acknowledgment_user_id     UUID          REFERENCES auth.users(id),
  is_primary                      BOOLEAN       NOT NULL DEFAULT false,
  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (charity_profile_id, wallet_address, chain_id)
);

COMMENT ON TABLE charity_wallets IS
  'Tiered charity receiving-wallet metadata. Supplements charity_profiles.wallet_address '
  'with Safe multisig, institutional custody, and EOA risk-acknowledgment data. '
  'Created by GIV-286.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Exactly one primary wallet per charity per chain
CREATE UNIQUE INDEX IF NOT EXISTS idx_charity_wallets_primary
  ON charity_wallets (charity_profile_id, chain_id)
  WHERE is_primary = true;

-- FK lookup index
CREATE INDEX IF NOT EXISTS idx_charity_wallets_profile
  ON charity_wallets (charity_profile_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_charity_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_charity_wallets_updated_at ON charity_wallets;
CREATE TRIGGER trg_charity_wallets_updated_at
  BEFORE UPDATE ON charity_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_charity_wallets_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Validation trigger — wallet-type-specific constraint enforcement
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_charity_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Safe multisig: requires valid signer configuration
  IF NEW.wallet_type = 'safe' THEN
    IF NEW.signer_count IS NULL OR NEW.signer_count < 2 THEN
      RAISE EXCEPTION 'Safe wallets require signer_count >= 2';
    END IF;
    IF NEW.signer_threshold IS NULL OR NEW.signer_threshold < 1 THEN
      RAISE EXCEPTION 'Safe wallets require signer_threshold >= 1';
    END IF;
    IF NEW.signer_threshold > NEW.signer_count THEN
      RAISE EXCEPTION 'signer_threshold cannot exceed signer_count';
    END IF;
    IF NEW.proof_of_control_verified_at IS NULL THEN
      RAISE EXCEPTION 'Safe wallets require proof_of_control_verified_at';
    END IF;
  END IF;

  -- Institutional custody: requires custodian details
  IF NEW.wallet_type = 'institutional' THEN
    IF NEW.custodian_name IS NULL OR NEW.custodian_name = '' THEN
      RAISE EXCEPTION 'Institutional wallets require custodian_name';
    END IF;
    IF NEW.custodian_attestation_doc_url IS NULL OR NEW.custodian_attestation_doc_url = '' THEN
      RAISE EXCEPTION 'Institutional wallets require custodian_attestation_doc_url';
    END IF;
  END IF;

  -- Single-signer EOA: requires explicit risk acknowledgment
  IF NEW.wallet_type = 'eoa' THEN
    IF NEW.risk_acknowledgment_at IS NULL THEN
      RAISE EXCEPTION 'EOA wallets require risk_acknowledgment_at';
    END IF;
    IF NEW.risk_acknowledgment_user_id IS NULL THEN
      RAISE EXCEPTION 'EOA wallets require risk_acknowledgment_user_id';
    END IF;
  END IF;

  -- All types: require proof of control OR custodian attestation
  IF NEW.wallet_type IN ('eoa', 'safe') AND NEW.proof_of_control_verified_at IS NULL THEN
    RAISE EXCEPTION '% wallets require proof_of_control_verified_at', NEW.wallet_type;
  END IF;
  IF NEW.wallet_type = 'institutional' AND NEW.custodian_attestation_doc_url IS NULL THEN
    RAISE EXCEPTION 'Institutional wallets require custodian_attestation_doc_url';
  END IF;

  -- 24h rate-limit on is_primary swap
  IF TG_OP = 'UPDATE' AND NEW.is_primary = true AND OLD.is_primary = false THEN
    IF EXISTS (
      SELECT 1 FROM charity_wallets
      WHERE charity_profile_id = NEW.charity_profile_id
        AND chain_id = NEW.chain_id
        AND is_primary = true
        AND id <> NEW.id
        AND updated_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RAISE EXCEPTION 'Primary wallet swap rate-limited: must wait 24 hours between swaps';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_charity_wallet ON charity_wallets;
CREATE TRIGGER trg_validate_charity_wallet
  BEFORE INSERT OR UPDATE ON charity_wallets
  FOR EACH ROW
  EXECUTE FUNCTION validate_charity_wallet();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE charity_wallets ENABLE ROW LEVEL SECURITY;

-- Public can read primary wallets (e.g. for donation widget display)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'charity_wallets_select_public' AND tablename = 'charity_wallets'
  ) THEN
    CREATE POLICY charity_wallets_select_public ON charity_wallets
      FOR SELECT
      USING (is_primary = true);
  END IF;
END $$;

-- Charity owners can manage (SELECT/INSERT/UPDATE/DELETE) their own wallets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'charity_wallets_manage_own' AND tablename = 'charity_wallets'
  ) THEN
    CREATE POLICY charity_wallets_manage_own ON charity_wallets
      FOR ALL
      TO authenticated
      USING (
        charity_profile_id IN (
          SELECT id FROM charity_profiles
          WHERE claimed_by = auth.uid()
        )
      )
      WITH CHECK (
        charity_profile_id IN (
          SELECT id FROM charity_profiles
          WHERE claimed_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Grant table access
GRANT SELECT ON charity_wallets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON charity_wallets TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SECURITY DEFINER override RPC for Foundation staff emergency primary swap
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_swap_primary_wallet(
  p_charity_profile_id UUID,
  p_new_primary_wallet_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin (reuse is_admin_user() from GIV-280)
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'admin_swap_primary_wallet requires admin privileges'
      USING ERRCODE = '42501';
  END IF;

  -- Verify the target wallet exists and belongs to the specified charity
  IF NOT EXISTS (
    SELECT 1 FROM charity_wallets
    WHERE id = p_new_primary_wallet_id
      AND charity_profile_id = p_charity_profile_id
  ) THEN
    RAISE EXCEPTION 'Wallet not found or does not belong to specified charity';
  END IF;

  -- Demote current primary wallet(s) for this charity+chain, bypassing trigger rate-limit
  UPDATE charity_wallets
  SET is_primary = false
  WHERE charity_profile_id = p_charity_profile_id
    AND chain_id = (SELECT chain_id FROM charity_wallets WHERE id = p_new_primary_wallet_id)
    AND is_primary = true
    AND id <> p_new_primary_wallet_id;

  -- Promote the new primary wallet
  UPDATE charity_wallets
  SET is_primary = true
  WHERE id = p_new_primary_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_swap_primary_wallet(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION admin_swap_primary_wallet IS
  'SECURITY DEFINER override for Foundation staff to swap a charity''s primary '
  'wallet without the 24h rate-limit. Requires admin JWT or profiles.type=admin.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Backfill: import existing charity_profiles.wallet_address rows
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO charity_wallets (
  charity_profile_id,
  wallet_address,
  chain_id,
  wallet_type,
  risk_acknowledgment_at,
  risk_acknowledgment_user_id,
  proof_of_control_verified_at,
  is_primary
)
SELECT
  cp.id,
  cp.wallet_address,
  8453,                              -- Base mainnet (primary chain)
  'eoa',
  '1970-01-01T00:00:00Z'::timestamptz,  -- Epoch sentinel for legacy backfill
  cp.claimed_by,
  '1970-01-01T00:00:00Z'::timestamptz,  -- Sentinel: pre-existing wallets
  true
FROM charity_profiles cp
WHERE cp.wallet_address IS NOT NULL
  AND cp.claimed_by IS NOT NULL
ON CONFLICT (charity_profile_id, wallet_address, chain_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Storage bucket: charity-attestations (private, for institutional custody docs)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'charity-attestations',
  'charity-attestations',
  false,                             -- Private: only authorized users can access
  10485760,                          -- 10 MB limit for attestation documents
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Charity owners can upload attestation documents
DROP POLICY IF EXISTS "Charities can upload attestations" ON storage.objects;
CREATE POLICY "Charities can upload attestations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'charity-attestations'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- Charity owners can view their own attestation documents
DROP POLICY IF EXISTS "Charities can view own attestations" ON storage.objects;
CREATE POLICY "Charities can view own attestations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'charity-attestations'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- Charity owners can update their attestation documents
DROP POLICY IF EXISTS "Charities can update own attestations" ON storage.objects;
CREATE POLICY "Charities can update own attestations"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'charity-attestations'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- Charity owners can delete their attestation documents
DROP POLICY IF EXISTS "Charities can delete own attestations" ON storage.objects;
CREATE POLICY "Charities can delete own attestations"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'charity-attestations'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- Admins can view all attestation documents (for review workflow)
DROP POLICY IF EXISTS "Admins can view all attestations" ON storage.objects;
CREATE POLICY "Admins can view all attestations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'charity-attestations'
  AND is_admin_user()
);
