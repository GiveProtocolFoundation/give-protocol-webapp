-- =============================================================================
-- Migration: Second contact captured at charity onboarding
-- GIV-1050 / MVP-CHR-07: wallet-change and attestation notices currently go
-- only to authorized_signer_email, a single inbox. Add a distinct second
-- contact so those notices have a second recipient and are no longer a
-- single-point-of-failure.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add second-contact columns to charity_profiles
--    second_contact_verified_at is RESERVED for the MVP-CHR-07 second-contact
--    email-verification flow: the column ships now so that flow needs no
--    second migration, but nothing writes or reads it yet.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_name TEXT;

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_email TEXT;

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN charity_profiles.second_contact_name IS
  'Distinct second contact captured at claim/onboarding (GIV-1050). PII: no anon/authenticated SELECT (table-level revoke + explicit column grants below).';
COMMENT ON COLUMN charity_profiles.second_contact_email IS
  'Email of the distinct second contact; receives wallet-change/attestation notices together with the signer (GIV-1050). PII: no anon/authenticated SELECT.';
COMMENT ON COLUMN charity_profiles.second_contact_verified_at IS
  'RESERVED for the MVP-CHR-07 second-contact email-verification flow; not written yet (GIV-1050).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Data minimization (QA GIV-1101 finding 1)
--    A column-level REVOKE is a no-op while the role still holds a table-level
--    SELECT grant (Postgres privileges are additive), so the previous
--    column-only revokes — including GIV-398's on the signer columns — never
--    hid anything on this table. Use the canonical pattern instead: revoke
--    table-level SELECT from anon/authenticated, then grant SELECT on an
--    explicit non-PII column list. service_role (edge functions), the table
--    owner, and SECURITY DEFINER functions are unaffected.
--    Remaining RPC-shaped exposure is tracked in GIV-1112.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON charity_profiles FROM anon, authenticated;

GRANT SELECT (
  id, ein, name, mission, location, website, logo_url, banner_image_url,
  photo_1_url, photo_2_url, photo_urls, ntee_code, founded, irs_status,
  employees, status, nominations_count, interested_donors_count,
  public_contact_email, public_contact_phone,
  claimed_by, claimed_at, verified_at, created_at, updated_at,
  wallet_address, wallet_type, wallet_kind, payment_processor,
  wallet_designation_status, wallet_designated_at,
  pending_wallet_address, pending_wallet_kind, pending_wallet_started_at,
  pending_wallet_effective_at, pending_wallet_reminder_24h_at,
  pending_wallet_reminder_48h_at
) ON charity_profiles TO anon, authenticated;

-- Migration-time assertion (QA GIV-1101 finding 1): fail loudly in any
-- environment instead of silently shipping an ineffective grant.
DO $$
BEGIN
  IF has_table_privilege('anon', 'charity_profiles', 'SELECT')
     OR has_table_privilege('authenticated', 'charity_profiles', 'SELECT') THEN
    RAISE EXCEPTION 'GIV-1050: table-level SELECT still granted on charity_profiles to anon/authenticated';
  END IF;

  IF has_column_privilege('anon', 'charity_profiles', 'second_contact_name', 'SELECT')
     OR has_column_privilege('authenticated', 'charity_profiles', 'second_contact_name', 'SELECT')
     OR has_column_privilege('anon', 'charity_profiles', 'second_contact_email', 'SELECT')
     OR has_column_privilege('authenticated', 'charity_profiles', 'second_contact_email', 'SELECT')
     OR has_column_privilege('anon', 'charity_profiles', 'authorized_signer_email', 'SELECT')
     OR has_column_privilege('authenticated', 'charity_profiles', 'authorized_signer_email', 'SELECT')
     OR has_column_privilege('anon', 'charity_profiles', 'authorized_signer_name', 'SELECT')
     OR has_column_privilege('authenticated', 'charity_profiles', 'authorized_signer_name', 'SELECT') THEN
    RAISE EXCEPTION 'GIV-1050: PII columns (second_contact_*/authorized_signer_*) are still readable by anon/authenticated';
  END IF;

  IF NOT has_column_privilege('anon', 'charity_profiles', 'name', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'charity_profiles', 'public_contact_email', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'charity_profiles', 'wallet_address', 'SELECT') THEN
    RAISE EXCEPTION 'GIV-1050: expected public columns lost SELECT for anon/authenticated';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. claim_charity_profile: single 7-arg version, second contact REQUIRED
--    (QA GIV-1101 finding 2). Drop the legacy 4-arg (20260425000000, replaced
--    by 20260606100000) and 5-arg (20260607000001) overloads so no caller can
--    bypass the second-contact requirement by calling an old signature, and
--    PostgREST named-arg resolution stops being overload-ambiguous. The body
--    folds in the GIV-372 pending-charity_verifications insert that only the
--    4-arg overload carried — keeping any old overload would have let callers
--    skip both the second contact AND the verification-row creation.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS claim_charity_profile(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein                   TEXT,
  p_signer_name           TEXT,
  p_signer_email          TEXT,
  p_signer_phone          TEXT,
  p_public_contact_email  TEXT,
  p_second_contact_name   TEXT,
  p_second_contact_email  TEXT
)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_profile     charity_profiles;
  v_profiles_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim a charity profile';
  END IF;

  -- Second contact is required (GIV-1050): enforced server-side so the
  -- requirement cannot be bypassed by calling the RPC directly.
  IF p_second_contact_name IS NULL OR btrim(p_second_contact_name) = '' THEN
    RAISE EXCEPTION 'Second contact name is required (GIV-1050)';
  END IF;
  IF p_second_contact_email IS NULL OR btrim(p_second_contact_email) = '' THEN
    RAISE EXCEPTION 'Second contact email is required (GIV-1050)';
  END IF;
  IF btrim(p_second_contact_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Second contact email is not a valid email address (GIV-1050)';
  END IF;
  IF lower(btrim(p_second_contact_email)) = lower(btrim(p_signer_email)) THEN
    RAISE EXCEPTION 'Second contact email must differ from the authorized signer email (GIV-1050)';
  END IF;

  -- Ensure the profile row exists
  SELECT * INTO v_profile FROM charity_profiles WHERE ein = trim(p_ein);

  IF NOT FOUND THEN
    -- Try to create via get_or_create
    SELECT * INTO v_profile FROM get_or_create_charity_profile(p_ein);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No charity found with EIN %', p_ein;
    END IF;
  END IF;

  IF v_profile.status <> 'unclaimed' THEN
    RAISE EXCEPTION 'Charity profile is already claimed (status: %)', v_profile.status;
  END IF;

  UPDATE charity_profiles SET
    status                  = 'claimed-pending',
    authorized_signer_name  = p_signer_name,
    authorized_signer_email = p_signer_email,
    authorized_signer_phone = p_signer_phone,
    public_contact_email    = COALESCE(p_public_contact_email, p_signer_email),
    second_contact_name     = btrim(p_second_contact_name),
    second_contact_email    = btrim(p_second_contact_email),
    claimed_by              = v_user_id,
    claimed_at              = NOW()
  WHERE ein = trim(p_ein)
  RETURNING * INTO v_profile;

  -- GIV-372: auto-create a pending verification row for admin review
  SELECT id INTO v_profiles_id
  FROM profiles
  WHERE user_id = v_user_id AND type = 'charity'
  LIMIT 1;

  IF v_profiles_id IS NOT NULL THEN
    INSERT INTO charity_verifications (charity_id, status)
    SELECT v_profiles_id, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM charity_verifications WHERE charity_id = v_profiles_id
    );
  END IF;

  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Transitions a charity profile from unclaimed → claimed-pending and records '
  'the authorized signer plus a REQUIRED distinct second contact (validated '
  'server-side: non-blank, well-formed, different from the signer email). '
  'Sets public_contact_email (defaults to signer email) and creates a pending '
  'charity_verifications row (GIV-372). Requires an authenticated session. '
  'SECURITY DEFINER. GIV-1050.';

-- Migration-time assertion (QA GIV-1101 finding 2): exactly one overload with
-- 7 required (non-defaulted) args must remain after this migration.
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'claim_charity_profile'
    AND n.nspname = 'public';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'GIV-1050: expected exactly one claim_charity_profile overload, found %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'claim_charity_profile'
    AND n.nspname = 'public'
    AND p.pronargs = 7
    AND p.proargdefaults IS NULL;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'GIV-1050: claim_charity_profile must have exactly 7 required (non-defaulted) args';
  END IF;
END $$;
