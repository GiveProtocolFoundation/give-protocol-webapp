-- Migration: Create admin dashboard RPC functions
-- Part of GIV-85: Replace admin dashboard mock data with real Supabase aggregate queries
-- Depends on GIV-84 (20260411000001_create_admin_audit_infrastructure.sql) for the
-- insert_admin_audit_entry() helper and admin_audit_log RLS policies.

-- =============================================================================
-- 1. get_admin_dashboard_stats()
--    Real-time aggregate counts for the admin dashboard KPI cards.
--    Returns: total donors, charities (verified vs pending), volunteers,
--             donation volume (crypto + fiat in USD), and trend data (7d / 30d).
-- =============================================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
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
  -- Admin guard: only users with user_type = 'admin' can call this
  IF auth.jwt() -> 'user_metadata' ->> 'type' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  -- Total donors (profiles with user_type = 'donor')
  SELECT COUNT(*)
  INTO v_total_donors
  FROM profiles
  WHERE type ='donor';

  -- Total charities (profiles with user_type = 'charity')
  SELECT COUNT(*)
  INTO v_total_charities
  FROM profiles
  WHERE type ='charity';

  -- Verified vs pending charities from charity_verifications
  SELECT
    COUNT(*) FILTER (WHERE status = 'verified'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_verified_charities, v_pending_charities
  FROM charity_verifications;

  -- Total volunteers (profiles with user_type = 'volunteer')
  SELECT COUNT(*)
  INTO v_total_volunteers
  FROM profiles
  WHERE type ='volunteer';

  -- Crypto donation volume (sum of amount from donations table)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_crypto_volume_usd
  FROM donations;

  -- Fiat donation volume (sum of amount_cents / 100 from fiat_donations)
  SELECT COALESCE(SUM(amount_cents), 0) / 100
  INTO v_fiat_volume_usd
  FROM fiat_donations
  WHERE status = 'completed';

  v_total_volume_usd := v_crypto_volume_usd + v_fiat_volume_usd;

  -- Trend: donations in last 7 days
  SELECT COUNT(*)
  INTO v_donations_7d
  FROM (
    SELECT id FROM donations WHERE created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT id FROM fiat_donations WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'completed'
  ) d;

  -- Trend: donations in last 30 days
  SELECT COUNT(*)
  INTO v_donations_30d
  FROM (
    SELECT id FROM donations WHERE created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT id FROM fiat_donations WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'completed'
  ) d;

  -- Trend: new user registrations in last 7 days
  SELECT COUNT(*)
  INTO v_registrations_7d
  FROM profiles
  WHERE created_at >= NOW() - INTERVAL '7 days';

  -- Trend: new user registrations in last 30 days
  SELECT COUNT(*)
  INTO v_registrations_30d
  FROM profiles
  WHERE created_at >= NOW() - INTERVAL '30 days';

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

COMMENT ON FUNCTION get_admin_dashboard_stats() IS
  'Returns real-time aggregate KPI stats for the admin dashboard. '
  'Requires admin JWT claim (user_type = admin). Part of GIV-85.';

REVOKE ALL ON FUNCTION get_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO service_role;

-- =============================================================================
-- 2. get_admin_recent_activity(p_limit, p_offset)
--    Last N events union across donations, registrations, and verifications.
--    Returns rows sorted by event_time DESC.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_admin_recent_activity(
  p_limit  INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  event_type    TEXT,
  description   TEXT,
  actor_id      UUID,
  actor_name    TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  amount_usd    NUMERIC,
  event_time    TIMESTAMPTZ,
  total_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  INT := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset INT := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  -- Admin guard
  IF auth.jwt() -> 'user_metadata' ->> 'type' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH events AS (
    -- Crypto donations
    SELECT
      d.id                                                    AS event_id,
      'donation'::TEXT                                        AS event_type,
      'Crypto donation to ' || COALESCE(cp.name, 'charity')
                                                              AS description,
      d.donor_id                                              AS actor_id,
      COALESCE(dp.name, du.email, 'Unknown donor')         AS actor_name,
      d.charity_id                                            AS entity_id,
      'donation'::TEXT                                        AS entity_type,
      d.amount                                                AS amount_usd,
      d.created_at                                            AS event_time
    FROM donations d
    LEFT JOIN profiles dp ON dp.id = d.donor_id
    LEFT JOIN auth.users du ON du.id = dp.user_id
    LEFT JOIN profiles cp ON cp.id = d.charity_id

    UNION ALL

    -- Fiat donations
    SELECT
      fd.id,
      'donation'::TEXT,
      'Fiat donation to ' || COALESCE(cp.name, 'charity'),
      fd.donor_id,
      COALESCE(dp.name, fdu.email, 'Unknown donor'),
      fd.charity_id,
      'donation'::TEXT,
      fd.amount_cents::NUMERIC / 100,
      fd.created_at
    FROM fiat_donations fd
    LEFT JOIN profiles dp ON dp.id = fd.donor_id
    LEFT JOIN auth.users fdu ON fdu.id = dp.user_id
    LEFT JOIN profiles cp ON cp.id = fd.charity_id
    WHERE fd.status = 'completed'

    UNION ALL

    -- New user registrations
    SELECT
      p.id,
      'registration'::TEXT,
      initcap(p.type) || ' registered: ' || COALESCE(p.name, pu.email, 'Unknown'),
      p.id,
      COALESCE(p.name, pu.email, 'Unknown'),
      p.id,
      'user'::TEXT,
      NULL::NUMERIC,
      p.created_at
    FROM profiles p
    LEFT JOIN auth.users pu ON pu.id = p.user_id

    UNION ALL

    -- Charity verification status changes
    SELECT
      cv.id,
      'verification'::TEXT,
      'Charity verification ' || cv.status || ': ' || COALESCE(cp.name, 'charity'),
      cv.charity_id,
      COALESCE(cp.name, 'Unknown charity'),
      cv.charity_id,
      'charity_verification'::TEXT,
      NULL::NUMERIC,
      cv.updated_at
    FROM charity_verifications cv
    LEFT JOIN profiles cp ON cp.id = cv.charity_id

    UNION ALL

    -- Volunteer hours submissions
    SELECT
      vh.id,
      'volunteer_hours'::TEXT,
      'Volunteer hours submitted: ' || vh.hours || 'h for ' || COALESCE(op.title, 'opportunity'),
      vh.volunteer_id,
      COALESCE(vp.name, vu.email, 'Unknown volunteer'),
      vh.opportunity_id,
      'volunteer_hours'::TEXT,
      NULL::NUMERIC,
      vh.created_at
    FROM volunteer_hours vh
    LEFT JOIN profiles vp ON vp.user_id = vh.volunteer_id
    LEFT JOIN auth.users vu ON vu.id = vp.user_id
    LEFT JOIN volunteer_opportunities op ON op.id = vh.opportunity_id
  ),
  counted AS (
    SELECT *, COUNT(*) OVER () AS total
    FROM events
  )
  SELECT
    c.event_id,
    c.event_type,
    c.description,
    c.actor_id,
    c.actor_name,
    c.entity_id,
    c.entity_type,
    c.amount_usd,
    c.event_time,
    c.total
  FROM counted c
  ORDER BY c.event_time DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION get_admin_recent_activity(INT, INT) IS
  'Returns paginated recent activity feed across donations, registrations, and '
  'verification events. Requires admin JWT claim. Part of GIV-85.';

REVOKE ALL ON FUNCTION get_admin_recent_activity(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(INT, INT) TO service_role;

-- =============================================================================
-- 3. get_admin_alerts()
--    Pending charity verifications, flagged donations, expired validation requests.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_admin_alerts()
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
  -- Admin guard
  IF auth.jwt() -> 'user_metadata' ->> 'type' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY

  -- Pending charity verifications (high priority)
  SELECT
    'pending_verification'::TEXT    AS alert_type,
    'high'::TEXT                    AS severity,
    'Pending Charity Verification'::TEXT AS title,
    ('Charity awaiting verification: ' || COALESCE(p.name, 'Unknown charity'))::TEXT,
    cv.charity_id                   AS entity_id,
    'charity_verification'::TEXT    AS entity_type,
    cv.created_at,
    COUNT(*) OVER ()                AS count
  FROM charity_verifications cv
  LEFT JOIN profiles p ON p.id = cv.charity_id
  WHERE cv.status = 'pending'

  UNION ALL

  -- Expired validation requests (medium priority)
  -- Requests older than 90 days that are still pending
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

COMMENT ON FUNCTION get_admin_alerts() IS
  'Returns all pending admin action items: charity verifications awaiting review, '
  'expired validation requests, and pending removal requests. '
  'Requires admin JWT claim. Part of GIV-85.';

REVOKE ALL ON FUNCTION get_admin_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_alerts() TO service_role;
