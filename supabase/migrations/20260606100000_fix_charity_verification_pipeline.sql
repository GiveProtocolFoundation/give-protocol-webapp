-- =============================================================================
-- Migration: Fix Charity Verification Pipeline
-- GIV-372: Admin Approvals of Pending Verifications
--
-- Root cause: claim_charity_profile() sets charity_profiles.status to
-- 'claimed-pending' but never creates a charity_verifications row. As a
-- result, get_admin_alerts(), get_admin_dashboard_stats(), and
-- get_admin_recent_activity() all miss pending charities. Additionally,
-- admin_update_charity_status() updates charity_verifications but never
-- syncs the change back to charity_profiles.status.
--
-- Fixes:
--   1. Ensure charity_verifications table exists (defensive)
--   2. Create get_charity_verification_status RPC if missing
--   3. Update claim_charity_profile to auto-insert a pending verification row
--   4. Update admin_update_charity_status to sync charity_profiles.status
--   5. Update admin_list_charities to include EIN + signer details
--   6. Update get_admin_alerts to catch charities without verification rows
--   7. Update get_admin_dashboard_stats to count pending correctly
--   8. Backfill existing claimed-pending charities missing verification rows
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure charity_verifications table exists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_verifications (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id    UUID         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'verified', 'rejected', 'suspended')),
  review_notes  TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS to be safe)
CREATE INDEX IF NOT EXISTS idx_charity_verifications_charity_id
  ON charity_verifications (charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_verifications_status
  ON charity_verifications (status);

-- RLS (idempotent)
ALTER TABLE charity_verifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Create get_charity_verification_status RPC
--    Called by the charity-facing VerificationStatusBanner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_charity_verification_status(p_user_id UUID)
RETURNS TABLE (
  status       TEXT,
  review_notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cv.status, 'pending')::TEXT AS status,
    cv.review_notes
  FROM profiles p
  LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
  WHERE p.user_id = p_user_id
    AND p.type = 'charity'
  ORDER BY cv.created_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_charity_verification_status(UUID) IS
  'Returns the verification status and review notes for a charity user. '
  'Falls back to pending when no charity_verifications row exists. GIV-372.';

REVOKE ALL ON FUNCTION get_charity_verification_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_charity_verification_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_charity_verification_status(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Update claim_charity_profile to auto-insert a pending verification row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein          TEXT,
  p_signer_name  TEXT,
  p_signer_email TEXT,
  p_signer_phone TEXT
)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_profile    charity_profiles;
  v_profiles_id UUID;
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
    claimed_by              = v_user_id,
    claimed_at              = NOW()
  WHERE ein = trim(p_ein)
  RETURNING * INTO v_profile;

  -- *** GIV-372 FIX: Auto-create a pending verification row ***
  -- Look up the profiles row for this user to get the charity_id
  SELECT id INTO v_profiles_id
  FROM profiles
  WHERE user_id = v_user_id AND type = 'charity'
  LIMIT 1;

  IF v_profiles_id IS NOT NULL THEN
    -- Only insert if no verification row exists yet
    INSERT INTO charity_verifications (charity_id, status)
    SELECT v_profiles_id, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM charity_verifications WHERE charity_id = v_profiles_id
    );
  END IF;

  RETURN NEXT v_profile;
END;
$$;

COMMENT ON FUNCTION claim_charity_profile IS
  'Transitions a charity profile from unclaimed to claimed-pending, records '
  'the authorized signer, and creates a pending verification row for admin '
  'review. Requires an authenticated session. SECURITY DEFINER. GIV-372.';

-- ---------------------------------------------------------------------------
-- 4. Update admin_update_charity_status to sync charity_profiles.status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_update_charity_status(
  p_charity_id  UUID,
  p_new_status  TEXT,
  p_reason      TEXT  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id        UUID;
  v_prev_status     TEXT;
  v_verification_id UUID;
  v_action_type     TEXT;
  v_user_id         UUID;
BEGIN
  -- Guard: only admin users can call this function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Validate new_status
  IF p_new_status NOT IN ('pending', 'verified', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status value: %. Must be one of: pending, verified, approved, rejected, suspended', p_new_status;
  END IF;

  v_admin_id := auth.uid();

  -- Get current verification row (or treat as pending if none)
  SELECT id, status
  INTO v_verification_id, v_prev_status
  FROM charity_verifications
  WHERE charity_id = p_charity_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prev_status IS NULL THEN
    v_prev_status := 'pending';
  END IF;

  -- Determine action_type for audit log
  v_action_type := CASE p_new_status
    WHEN 'verified'   THEN 'verification_approve'
    WHEN 'approved'   THEN 'verification_approve'
    WHEN 'rejected'   THEN 'verification_reject'
    WHEN 'suspended'  THEN 'charity_suspend'
    WHEN 'pending'    THEN 'charity_reinstate'
    ELSE 'charity_status_change'
  END;

  -- Upsert charity_verifications
  IF v_verification_id IS NOT NULL THEN
    UPDATE charity_verifications
    SET
      status      = p_new_status,
      review_notes = p_reason,
      reviewed_at  = NOW(),
      updated_at   = NOW()
    WHERE id = v_verification_id;
  ELSE
    INSERT INTO charity_verifications (charity_id, status, review_notes, reviewed_at)
    VALUES (p_charity_id, p_new_status, p_reason, NOW())
    RETURNING id INTO v_verification_id;
  END IF;

  -- *** GIV-372 FIX: Sync charity_profiles.status ***
  -- Look up the auth user behind this profiles row, then find their charity_profiles
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_charity_id
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE charity_profiles
    SET
      status      = CASE p_new_status
                      WHEN 'verified' THEN 'verified'
                      WHEN 'approved' THEN 'verified'
                      ELSE status  -- no change for rejected/suspended/pending
                    END,
      verified_at = CASE
                      WHEN p_new_status IN ('verified', 'approved') THEN NOW()
                      ELSE verified_at
                    END
    WHERE claimed_by = v_user_id;
  END IF;

  -- Insert into charity_status_audit (specialized audit table)
  INSERT INTO charity_status_audit (
    charity_id, previous_status, new_status, reason, admin_user_id
  )
  VALUES (
    p_charity_id, v_prev_status, p_new_status, p_reason, v_admin_id
  );

  -- Insert into master admin_audit_log
  INSERT INTO admin_audit_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  VALUES (
    v_admin_id,
    v_action_type,
    'charity',
    p_charity_id,
    jsonb_build_object('status', v_prev_status),
    jsonb_build_object('status', p_new_status, 'reason', p_reason)
  );

  RETURN v_verification_id;
END;
$$;

COMMENT ON FUNCTION admin_update_charity_status IS
  'Updates a charity verification status, syncs charity_profiles.status, '
  'and atomically writes to both charity_status_audit and admin_audit_log. '
  'Valid statuses: pending, verified, approved, rejected, suspended. '
  'Admin-only. GIV-372.';

-- ---------------------------------------------------------------------------
-- 5. Update admin_list_charities to include EIN + signer details from
--    charity_profiles for proper admin review context
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_list_charities(
  p_status        TEXT        DEFAULT NULL,
  p_category      TEXT        DEFAULT NULL,
  p_search        TEXT        DEFAULT NULL,
  p_page          INT         DEFAULT 1,
  p_limit         INT         DEFAULT 50
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  name                TEXT,
  category            TEXT,
  logo_url            TEXT,
  mission             TEXT,
  verification_id     UUID,
  verification_status TEXT,
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,
  wallet_address      TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  total_count         BIGINT,
  -- GIV-372: new columns for admin review context
  ein                 TEXT,
  signer_name         TEXT,
  signer_email        TEXT,
  signer_phone        TEXT,
  claimed_at          TIMESTAMPTZ,
  charity_profile_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  -- Guard: only admin users can call this function
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Clamp pagination
  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.user_id,
      p.name,
      (p.meta ->> 'category')::TEXT              AS category,
      (p.meta ->> 'logoUrl')::TEXT               AS logo_url,
      (p.meta ->> 'mission')::TEXT               AS mission,
      cv.id                                       AS verification_id,
      COALESCE(cv.status, 'pending')::TEXT        AS verification_status,
      cv.review_notes,
      cv.reviewed_at,
      (p.meta ->> 'walletAddress')::TEXT          AS wallet_address,
      p.created_at,
      p.updated_at,
      -- GIV-372: join charity_profiles for EIN and signer data
      cp.ein,
      cp.authorized_signer_name                   AS signer_name,
      cp.authorized_signer_email                  AS signer_email,
      cp.authorized_signer_phone                  AS signer_phone,
      cp.claimed_at,
      cp.status                                   AS charity_profile_status
    FROM profiles p
    LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
    LEFT JOIN charity_profiles cp ON cp.claimed_by = p.user_id
    WHERE p.type = 'charity'
      AND (p_status  IS NULL OR COALESCE(cv.status, 'pending') = p_status)
      AND (p_category IS NULL OR (p.meta ->> 'category') = p_category)
      AND (p_search   IS NULL OR p.name ILIKE '%' || p_search || '%'
           OR cp.ein ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.user_id,
    f.name,
    f.category,
    f.logo_url,
    f.mission,
    f.verification_id,
    f.verification_status,
    f.review_notes,
    f.reviewed_at,
    f.wallet_address,
    f.created_at,
    f.updated_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count,
    f.ein,
    f.signer_name,
    f.signer_email,
    f.signer_phone,
    f.claimed_at,
    f.charity_profile_status
  FROM filtered f
  ORDER BY
    CASE f.verification_status
      WHEN 'pending'  THEN 1
      WHEN 'verified' THEN 2
      WHEN 'approved' THEN 2
      WHEN 'suspended' THEN 3
      WHEN 'rejected' THEN 4
      ELSE 5
    END,
    f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_charities IS
  'Returns a paginated, filtered list of all charity profiles with verification '
  'status and charity_profiles data (EIN, signer, claim info) for admin review. '
  'Pending charities are sorted first. Admin-only. GIV-372.';

-- ---------------------------------------------------------------------------
-- 6. Update get_admin_alerts to also catch charities without verification rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_alerts()
RETURNS TABLE (
  alert_type    TEXT,
  severity      TEXT,
  title         TEXT,
  description   TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  created_at    TIMESTAMPTZ,
  count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin guard: JWT metadata first, profiles table fallback
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY

  -- Pending charity verifications (high priority)
  -- Includes both: charities with a 'pending' verification row,
  -- and charities with NO verification row at all (GIV-372 fix)
  SELECT
    'pending_verification'::TEXT    AS alert_type,
    'high'::TEXT                    AS severity,
    'Pending Charity Verification'::TEXT AS title,
    ('Charity awaiting verification: ' || COALESCE(p.name, 'Unknown charity'))::TEXT,
    p.id                            AS entity_id,
    'charity_verification'::TEXT    AS entity_type,
    p.created_at,
    COUNT(*) OVER ()                AS count
  FROM profiles p
  LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
  WHERE p.type = 'charity'
    AND (cv.status = 'pending' OR cv.id IS NULL)

  UNION ALL

  -- Expired validation requests (medium priority)
  SELECT
    'expired_validation'::TEXT,
    'medium'::TEXT,
    'Expired Validation Request'::TEXT,
    ('Validation request expired for volunteer: ' || COALESCE(vp.name, vru.email, 'Unknown'))::TEXT,
    vr.id,
    'validation_request'::TEXT,
    vr.created_at,
    COUNT(*) OVER ()
  FROM validation_requests vr
  LEFT JOIN profiles vp ON vp.user_id = vr.volunteer_id
  LEFT JOIN auth.users vru ON vru.id = vp.user_id
  WHERE vr.status = 'pending'
    AND vr.created_at < NOW() - INTERVAL '90 days'

  UNION ALL

  -- Removal requests awaiting admin action (high priority)
  SELECT
    'removal_request'::TEXT,
    'high'::TEXT,
    'Pending Removal Request'::TEXT,
    ('Account removal requested by: ' || COALESCE(rp.name, rru.email, 'Unknown user'))::TEXT,
    rr.user_id,
    'user'::TEXT,
    rr.created_at,
    COUNT(*) OVER ()
  FROM removal_requests rr
  LEFT JOIN profiles rp ON rp.user_id = rr.user_id
  LEFT JOIN auth.users rru ON rru.id = rp.user_id
  WHERE rr.status = 'pending'

  ORDER BY created_at ASC;

END;
$$;

COMMENT ON FUNCTION public.get_admin_alerts() IS
  'Returns all pending admin action items: charity verifications awaiting review '
  '(including charities with no verification row), expired validation requests, '
  'and pending removal requests. Admin-only. GIV-372.';

REVOKE ALL ON FUNCTION public.get_admin_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_alerts() TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Update get_admin_dashboard_stats to count pending correctly
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result            JSONB;
  v_total_donors      BIGINT;
  v_total_charities   BIGINT;
  v_verified_charities BIGINT;
  v_pending_charities  BIGINT;
  v_total_volunteers  BIGINT;
  v_crypto_volume_usd NUMERIC;
  v_fiat_volume_usd   NUMERIC;
  v_total_volume_usd  NUMERIC;
  v_donations_7d      BIGINT;
  v_donations_30d     BIGINT;
  v_registrations_7d  BIGINT;
  v_registrations_30d BIGINT;
BEGIN
  -- Admin guard: JWT metadata first, profiles table fallback
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_total_donors
  FROM profiles WHERE type = 'donor';

  SELECT COUNT(*) INTO v_total_charities
  FROM profiles WHERE type = 'charity';

  -- GIV-372 FIX: Count verified from charity_verifications,
  -- but count pending as charities WITHOUT a non-pending verification row
  SELECT COUNT(*) INTO v_verified_charities
  FROM charity_verifications
  WHERE status IN ('verified', 'approved');

  SELECT COUNT(*) INTO v_pending_charities
  FROM profiles p
  LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
  WHERE p.type = 'charity'
    AND (cv.status = 'pending' OR cv.id IS NULL);

  SELECT COUNT(*) INTO v_total_volunteers
  FROM profiles WHERE type = 'volunteer';

  SELECT COALESCE(SUM(amount), 0) INTO v_crypto_volume_usd
  FROM donations;

  SELECT COALESCE(SUM(amount_cents), 0) / 100 INTO v_fiat_volume_usd
  FROM fiat_donations WHERE status = 'completed';

  v_total_volume_usd := v_crypto_volume_usd + v_fiat_volume_usd;

  SELECT COUNT(*) INTO v_donations_7d
  FROM (
    SELECT id FROM donations WHERE created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT id FROM fiat_donations WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'completed'
  ) d;

  SELECT COUNT(*) INTO v_donations_30d
  FROM (
    SELECT id FROM donations WHERE created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT id FROM fiat_donations WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'completed'
  ) d;

  SELECT COUNT(*) INTO v_registrations_7d
  FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_registrations_30d
  FROM profiles WHERE created_at >= NOW() - INTERVAL '30 days';

  v_result := jsonb_build_object(
    'totalDonors',         v_total_donors,
    'totalCharities',      v_total_charities,
    'verifiedCharities',   v_verified_charities,
    'pendingCharities',    v_pending_charities,
    'totalVolunteers',     v_total_volunteers,
    'cryptoVolumeUsd',     v_crypto_volume_usd,
    'fiatVolumeUsd',       v_fiat_volume_usd,
    'totalVolumeUsd',      v_total_volume_usd,
    'trends', jsonb_build_object(
      'donations7d',       v_donations_7d,
      'donations30d',      v_donations_30d,
      'registrations7d',   v_registrations_7d,
      'registrations30d',  v_registrations_30d
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_stats() IS
  'Returns real-time aggregate KPI stats for the admin dashboard. '
  'Correctly counts pending charities including those without verification rows. '
  'Admin-only. GIV-372.';

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Backfill: Create pending verification rows for existing claimed-pending
--    charities that don't have one
-- ---------------------------------------------------------------------------
INSERT INTO charity_verifications (charity_id, status)
SELECT p.id, 'pending'
FROM profiles p
LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
WHERE p.type = 'charity'
  AND cv.id IS NULL;
