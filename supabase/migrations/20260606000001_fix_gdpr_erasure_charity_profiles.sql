-- Migration: Fix execute_gdpr_erasure Step 3 table name
-- Fixes GIV-355: Step 3 referenced "charity_profile" (singular) which does not
-- exist. The correct table is "charity_profiles" (plural), as defined in
-- 20260425000000_create_charity_profiles.sql.
--
-- Parent migration: 20260604000001_gdpr_charity_wallets.sql (GIV-314)
-- All other steps are identical.

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

  -- ── Step 3: Anonymize charity_profiles authorized signer fields ──────────
  -- FIX (GIV-355): corrected table name from "charity_profile" to
  -- "charity_profiles" to match the actual relation created in
  -- 20260425000000_create_charity_profiles.sql.
  UPDATE charity_profiles
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
  'Step 3 anonymizes charity_profiles authorized signer PII. '
  'Step 5b anonymizes fiat_donations PII and severs the donor_id FK link. '
  'Step 5c anonymizes charity_wallets PII and clears custodian attestation. '
  'Financial/wallet audit records are retained per accounting/legal requirements. '
  'Called by the gdpr-erasure-cron Edge Function. Steps 1, 10, and 11 are '
  'handled externally by the Edge Function. '
  'Fix: 20260606000001 corrected Step 3 table name from charity_profile to '
  'charity_profiles (GIV-355).';

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION execute_gdpr_erasure(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_gdpr_erasure(UUID, TEXT) TO service_role;
