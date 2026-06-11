-- Migration: GDPR coverage for charity_wallets table
-- Part of GIV-314: Implement charity_wallets GDPR erasure RPC + export + storage cleanup
-- Parent: GIV-313. Plan: GIV-312.
--
-- 1. Confirms/relaxes risk_acknowledgment_user_id to be NULLable
--    (idempotent — checks information_schema.columns before altering).
--
-- 2. Replaces execute_gdpr_erasure to add Step 5c: anonymize charity_wallets.
--    Wallet rows are preserved (on-chain audit trail) but PII fields are
--    anonymized and the custodian attestation URL is cleared.

-- ─── 1. Ensure risk_acknowledgment_user_id is NULLable ─────────────────────────
-- The column was defined without NOT NULL in 20260527000000_charity_wallets.sql,
-- but we verify and relax it idempotently in case a later migration added the
-- constraint.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'charity_wallets'
      AND column_name  = 'risk_acknowledgment_user_id'
      AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE charity_wallets ALTER COLUMN risk_acknowledgment_user_id DROP NOT NULL;
    RAISE NOTICE 'risk_acknowledgment_user_id: NOT NULL constraint dropped';
  ELSE
    RAISE NOTICE 'risk_acknowledgment_user_id: already NULLable — no change needed';
  END IF;
END
$$;

COMMENT ON COLUMN charity_wallets.risk_acknowledgment_user_id IS
  'FK to auth.users. NULLable to support GDPR erasure: set to NULL during '
  'erasure to sever the identity link while retaining the wallet audit record.';

-- ─── 2. Update execute_gdpr_erasure RPC (add Step 5c: charity_wallets) ─────────

CREATE OR REPLACE FUNCTION execute_gdpr_erasure(
  p_user_id    UUID,
  p_user_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- ── Step 2: Anonymize volunteer_applications PII fields ──────────────────
  UPDATE volunteer_applications
  SET
    full_name = '[deleted]',
    email     = '[deleted]',
    phone     = NULL,
    location  = NULL,
    age_range = NULL,
    message   = NULL
  WHERE applicant_id = p_user_id;

  -- ── Step 3: Anonymize charity_profile authorized signer fields ───────────
  UPDATE charity_profile
  SET
    authorized_signer_name  = '[deleted]',
    authorized_signer_email = '[deleted]',
    authorized_signer_phone = NULL,
    claimed_by              = NULL
  WHERE claimed_by = p_user_id;

  -- ── Step 4: Anonymize charity_nominations.nominator_email ────────────────
  -- Match by email address since nominator_email is not a FK to auth.users
  UPDATE charity_nominations
  SET nominator_email = '[deleted]'
  WHERE nominator_email = p_user_email;

  -- ── Step 5: Set volunteer_verifications.volunteer_id = NULL ──────────────
  -- Verifications are part of on-chain audit trail; rows must be preserved.
  UPDATE volunteer_verifications
  SET volunteer_id = NULL
  WHERE volunteer_id = p_user_id;

  -- ── Step 5b: Anonymize fiat_donations PII and sever donor_id FK ──────────
  -- Financial transaction records are retained for accounting compliance
  -- (GDPR Art. 17(3)(b) legal obligation basis).
  -- PII fields are anonymized; donor_id is set to NULL to sever identity link.
  UPDATE fiat_donations
  SET
    donor_name    = '[deleted]',
    donor_email   = '[deleted]',
    donor_address = NULL,
    donor_id      = NULL
  WHERE donor_id = p_user_id;

  -- ── Step 5c: Anonymize charity_wallets ───────────────────────────────────
  -- Wallet rows are preserved for on-chain audit trail (proof_of_control,
  -- chain_id, wallet_type, timestamps). PII and custody attestation fields
  -- are anonymized/cleared.
  UPDATE charity_wallets
  SET
    wallet_address                = '[deleted]',
    custodian_name                = CASE WHEN custodian_name IS NOT NULL THEN '[deleted]' ELSE NULL END,
    custodian_attestation_doc_url = NULL,
    risk_acknowledgment_user_id   = NULL
  WHERE charity_profile_id IN (
    SELECT id FROM charity_profiles WHERE claimed_by = p_user_id
  );

  -- ── Step 6: Hard delete wallet_aliases ───────────────────────────────────
  DELETE FROM wallet_aliases
  WHERE user_id = p_user_id;

  -- ── Step 7: Hard delete user_identities ──────────────────────────────────
  DELETE FROM user_identities
  WHERE user_id = p_user_id;

  -- ── Step 8: Hard delete user_preferences ─────────────────────────────────
  DELETE FROM user_preferences
  WHERE user_id = p_user_id;

  -- ── Step 9: Hard delete profiles ─────────────────────────────────────────
  -- This triggers no cascades; auth.users deletion (Step 10) handles the rest.
  DELETE FROM profiles
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION execute_gdpr_erasure(UUID, TEXT) IS
  'Executes GDPR erasure Steps 2–9 atomically in a transaction. '
  'Step 5b anonymizes fiat_donations PII and severs the donor_id FK link. '
  'Step 5c anonymizes charity_wallets PII and clears custodian attestation. '
  'Financial/wallet audit records are retained per accounting/legal requirements. '
  'Called by the gdpr-erasure-cron Edge Function. Steps 1, 10, and 11 are '
  'handled externally by the Edge Function.';

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION execute_gdpr_erasure(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_gdpr_erasure(UUID, TEXT) TO service_role;
