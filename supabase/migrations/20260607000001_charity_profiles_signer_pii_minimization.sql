-- =============================================================================
-- Migration: Data minimization for charity_profiles authorized signer PII
-- GIV-398: Revoke column-level SELECT on signer PII, add public contact columns,
--          create owner-only RPCs for signer access and email-based claim.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Revoke column-level SELECT on PII columns from non-service roles
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE SELECT (authorized_signer_name, authorized_signer_email, authorized_signer_phone)
  ON charity_profiles FROM authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add public contact columns (organization-level, visible to all)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS public_contact_email TEXT;

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS public_contact_phone TEXT;

-- Explicit column-level GRANT for the new public columns
GRANT SELECT (public_contact_email, public_contact_phone)
  ON charity_profiles TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: get_my_charity_profile_signer
--    Owner-only access to authorized signer PII fields.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_charity_profile_signer()
RETURNS TABLE(
  authorized_signer_name TEXT,
  authorized_signer_email TEXT,
  authorized_signer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      cp.authorized_signer_name,
      cp.authorized_signer_email,
      cp.authorized_signer_phone
    FROM charity_profiles cp
    WHERE cp.claimed_by = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_charity_profile_signer() TO authenticated;

COMMENT ON FUNCTION get_my_charity_profile_signer IS
  'Returns the authorized signer PII for the charity profile owned by the '
  'calling user. Only returns data when claimed_by = auth.uid(). '
  'SECURITY DEFINER — bypasses column-level REVOKE. GIV-398.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: claim_charity_profile_by_signer_email
--    Self-repair: authenticated user whose auth.email() matches
--    authorized_signer_email on an unclaimed profile can claim it.
--    No client-supplied email parameter — uses auth.email() server-side.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_charity_profile_by_signer_email()
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
  v_profile charity_profiles;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Read the user's verified email from the JWT
  v_email := lower(trim(auth.email()));
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  -- Find unclaimed profile matching the user's email
  SELECT * INTO v_profile
    FROM charity_profiles
    WHERE lower(trim(authorized_signer_email)) = v_email
      AND claimed_by IS NULL
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Self-repair: link user to their charity profile
  UPDATE charity_profiles
    SET claimed_by = v_user_id,
        claimed_at = COALESCE(claimed_at, NOW())
    WHERE id = v_profile.id
      AND claimed_by IS NULL;

  -- Return the updated row
  SELECT * INTO v_profile FROM charity_profiles WHERE id = v_profile.id;
  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_charity_profile_by_signer_email() TO authenticated;

COMMENT ON FUNCTION claim_charity_profile_by_signer_email IS
  'Self-repair RPC: claims an unclaimed charity profile where '
  'authorized_signer_email matches the calling user''s auth.email(). '
  'Closes the email-spoof bypass by reading auth.email() server-side. '
  'SECURITY DEFINER — bypasses column-level REVOKE. GIV-398.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update claim_charity_profile RPC to also set public_contact_email
--    When claiming, default public_contact_email to the signer email.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein          TEXT,
  p_signer_name  TEXT,
  p_signer_email TEXT,
  p_signer_phone TEXT,
  p_public_contact_email TEXT DEFAULT NULL
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
    claimed_by              = v_user_id,
    claimed_at              = NOW()
  WHERE ein = trim(p_ein)
  RETURNING * INTO v_profile;

  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Transitions a charity profile from unclaimed → claimed-pending and records '
  'the authorized signer. Sets public_contact_email (defaults to signer email). '
  'Requires an authenticated session. SECURITY DEFINER. GIV-398.';
