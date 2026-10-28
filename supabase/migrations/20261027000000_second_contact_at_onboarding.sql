-- =============================================================================
-- Migration: Second contact captured at charity onboarding
-- GIV-1050 / MVP-CHR-07: wallet-change and attestation notices currently go
-- only to authorized_signer_email, a single inbox. Add a distinct second
-- contact so those notices have a second recipient and are no longer a
-- single-point-of-failure.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add second-contact columns to charity_profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_name TEXT;

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_email TEXT;

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS second_contact_verified_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Minimize second-contact PII exposure (mirror GIV-398 signer rule)
--    Revoke column-level SELECT from non-service roles. Service role (edge
--    functions) keeps access so notices can be addressed to the second
--    contact. Owner access is not yet exposed in the UI (capture-only).
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE SELECT (second_contact_name, second_contact_email, second_contact_verified_at)
  ON charity_profiles FROM authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Extend claim_charity_profile to record the second contact at onboarding
--    New trailing parameters default to NULL so existing 5-arg callers keep
--    working; the 5-arg overload remains in place.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein                   TEXT,
  p_signer_name           TEXT,
  p_signer_email          TEXT,
  p_signer_phone          TEXT,
  p_public_contact_email  TEXT DEFAULT NULL,
  p_second_contact_name   TEXT DEFAULT NULL,
  p_second_contact_email  TEXT DEFAULT NULL
)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile charity_profiles;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim a charity profile';
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
    second_contact_name     = p_second_contact_name,
    second_contact_email    = p_second_contact_email,
    claimed_by              = v_user_id,
    claimed_at              = NOW()
  WHERE ein = trim(p_ein)
  RETURNING * INTO v_profile;

  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Transitions a charity profile from unclaimed → claimed-pending and records '
  'the authorized signer plus an optional distinct second contact. '
  'Sets public_contact_email (defaults to signer email). '
  'Requires an authenticated session. SECURITY DEFINER. GIV-1050.';