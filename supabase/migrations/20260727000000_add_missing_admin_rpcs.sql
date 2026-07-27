-- Migration: Add 3 missing admin RPCs
-- GIV-763: admin_list_validation_requests, admin_suspicious_volunteer_patterns,
-- admin_platform_health_summary — called by the deployed frontend but never
-- created in the database.
--
-- Depends on: is_admin_user() from 20260525200000_fix_admin_guard_profiles_fallback.sql
-- Tables: validation_requests, self_reported_hours, profiles, donations,
--         fiat_donations, volunteer_hours, charity_verifications

-- =============================================================================
-- 1. admin_list_validation_requests
--    Paginated, filterable list of validation requests for the Volunteer
--    Validation → Requests tab.
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_list_validation_requests(
  p_status       TEXT    DEFAULT NULL,
  p_org_id       UUID    DEFAULT NULL,
  p_volunteer_id UUID    DEFAULT NULL,
  p_search       TEXT    DEFAULT NULL,
  p_date_from    TEXT    DEFAULT NULL,
  p_date_to      TEXT    DEFAULT NULL,
  p_page         INT     DEFAULT 1,
  p_limit        INT     DEFAULT 50
)
RETURNS TABLE (
  id                     UUID,
  volunteer_id           UUID,
  volunteer_email        TEXT,
  volunteer_display_name TEXT,
  org_id                 UUID,
  org_name               TEXT,
  hours_reported         NUMERIC,
  activity_date          DATE,
  status                 TEXT,
  validator_user_id      UUID,
  validated_at           TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ,
  total_count            BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  INT := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset INT := (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_limit;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      vr.id,
      vr.volunteer_id,
      u.email::text                       AS volunteer_email,
      p.name::text                        AS volunteer_display_name,
      vr.organization_id                  AS org_id,
      op.name::text                       AS org_name,
      sr.hours                            AS hours_reported,
      sr.activity_date,
      vr.status::text,
      vr.responded_by                     AS validator_user_id,
      vr.responded_at                     AS validated_at,
      vr.expires_at,
      vr.created_at
    FROM validation_requests vr
    JOIN self_reported_hours sr ON sr.id = vr.self_reported_hours_id
    LEFT JOIN profiles p  ON p.user_id = vr.volunteer_id
    LEFT JOIN auth.users u ON u.id = vr.volunteer_id
    LEFT JOIN profiles op ON op.id = vr.organization_id
    WHERE (p_status IS NULL OR vr.status = p_status)
      AND (p_org_id IS NULL OR vr.organization_id = p_org_id)
      AND (p_volunteer_id IS NULL OR vr.volunteer_id = p_volunteer_id)
      AND (p_date_from IS NULL OR vr.created_at >= p_date_from::timestamptz)
      AND (p_date_to IS NULL OR vr.created_at <= p_date_to::timestamptz)
      AND (p_search IS NULL OR p_search = '' OR
           p.name ILIKE '%' || p_search || '%' OR
           u.email ILIKE '%' || p_search || '%' OR
           op.name ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.volunteer_id,
    f.volunteer_email,
    f.volunteer_display_name,
    f.org_id,
    f.org_name,
    f.hours_reported,
    f.activity_date,
    f.status,
    f.validator_user_id,
    f.validated_at,
    f.expires_at,
    f.created_at,
    COUNT(*) OVER ()::bigint AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_validation_requests(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) IS
  'Paginated, filterable list of volunteer validation requests for admin UI. '
  'Requires admin role via is_admin_user(). Part of GIV-763.';

REVOKE ALL ON FUNCTION admin_list_validation_requests(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_validation_requests(TEXT, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) TO authenticated, service_role;

-- =============================================================================
-- 2. admin_suspicious_volunteer_patterns
--    Volunteers exceeding a rolling 7-day hour threshold, for the Volunteer
--    Validation → Patterns tab.
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_suspicious_volunteer_patterns()
RETURNS TABLE (
  volunteer_id           UUID,
  volunteer_email        TEXT,
  volunteer_display_name TEXT,
  org_id                 UUID,
  org_name               TEXT,
  weekly_hours           NUMERIC,
  total_requests         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH recent_hours AS (
    SELECT
      sr.volunteer_id,
      sr.organization_id,
      SUM(sr.hours) AS weekly_hours
    FROM self_reported_hours sr
    WHERE sr.activity_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY sr.volunteer_id, sr.organization_id
    HAVING SUM(sr.hours) > 40
  ),
  request_counts AS (
    SELECT
      vr.volunteer_id,
      vr.organization_id,
      COUNT(*) AS total_requests
    FROM validation_requests vr
    GROUP BY vr.volunteer_id, vr.organization_id
  )
  SELECT
    rh.volunteer_id,
    u.email::text                AS volunteer_email,
    p.name::text                 AS volunteer_display_name,
    rh.organization_id           AS org_id,
    op.name::text                AS org_name,
    rh.weekly_hours,
    COALESCE(rc.total_requests, 0)::bigint AS total_requests
  FROM recent_hours rh
  LEFT JOIN profiles p  ON p.user_id = rh.volunteer_id
  LEFT JOIN auth.users u ON u.id = rh.volunteer_id
  LEFT JOIN profiles op ON op.id = rh.organization_id
  LEFT JOIN request_counts rc
    ON rc.volunteer_id = rh.volunteer_id
   AND rc.organization_id = rh.organization_id
  ORDER BY rh.weekly_hours DESC;
END;
$$;

COMMENT ON FUNCTION admin_suspicious_volunteer_patterns() IS
  'Returns volunteers with >40 self-reported hours in the last 7 days, grouped '
  'by organisation. Requires admin role via is_admin_user(). Part of GIV-763.';

REVOKE ALL ON FUNCTION admin_suspicious_volunteer_patterns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_suspicious_volunteer_patterns() TO authenticated, service_role;

-- =============================================================================
-- 3. admin_platform_health_summary
--    Cross-cutting KPI aggregation for the Reports → Platform Health tab.
--    Accepts p_period: '7d', '30d', or '90d'.
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_platform_health_summary(
  p_period TEXT DEFAULT '30d'
)
RETURNS TABLE (
  metric   TEXT,
  value    NUMERIC,
  trend_7d NUMERIC,
  trend_30d NUMERIC,
  unit     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval INTERVAL;
  v_now      TIMESTAMPTZ := NOW();
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_interval := CASE p_period
    WHEN '7d'  THEN INTERVAL '7 days'
    WHEN '90d' THEN INTERVAL '90 days'
    ELSE INTERVAL '30 days'
  END;

  RETURN QUERY

  -- Total Users
  SELECT
    'Total Users'::text,
    (SELECT COUNT(*)::numeric FROM profiles),
    (SELECT COUNT(*)::numeric FROM profiles WHERE created_at >= v_now - INTERVAL '7 days'),
    (SELECT COUNT(*)::numeric FROM profiles WHERE created_at >= v_now - INTERVAL '30 days'),
    'count'::text

  UNION ALL

  -- Active Charities
  SELECT
    'Active Charities'::text,
    (SELECT COUNT(*)::numeric FROM profiles WHERE type = 'charity'),
    (SELECT COUNT(*)::numeric FROM profiles WHERE type = 'charity' AND created_at >= v_now - INTERVAL '7 days'),
    (SELECT COUNT(*)::numeric FROM profiles WHERE type = 'charity' AND created_at >= v_now - INTERVAL '30 days'),
    'count'::text

  UNION ALL

  -- Total Donation Volume (USD)
  SELECT
    'Donation Volume'::text,
    (
      SELECT COALESCE(SUM(d.amount), 0) +
             COALESCE((SELECT SUM(fd.amount_cents) / 100.0 FROM fiat_donations fd WHERE fd.status = 'completed'), 0)
      FROM donations d
    )::numeric,
    (
      SELECT COALESCE(SUM(d.amount), 0) +
             COALESCE((SELECT SUM(fd.amount_cents) / 100.0 FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '7 days'), 0)
      FROM donations d
      WHERE d.created_at >= v_now - INTERVAL '7 days'
    )::numeric,
    (
      SELECT COALESCE(SUM(d.amount), 0) +
             COALESCE((SELECT SUM(fd.amount_cents) / 100.0 FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '30 days'), 0)
      FROM donations d
      WHERE d.created_at >= v_now - INTERVAL '30 days'
    )::numeric,
    'usd'::text

  UNION ALL

  -- Volunteer Hours Submitted
  SELECT
    'Volunteer Hours'::text,
    (SELECT COALESCE(SUM(avh.hours), 0)::numeric FROM all_volunteer_hours avh),
    (SELECT COALESCE(SUM(avh.hours), 0)::numeric FROM all_volunteer_hours avh WHERE avh.created_at >= v_now - INTERVAL '7 days'),
    (SELECT COALESCE(SUM(avh.hours), 0)::numeric FROM all_volunteer_hours avh WHERE avh.created_at >= v_now - INTERVAL '30 days'),
    'hours'::text

  UNION ALL

  -- Pending Verifications
  SELECT
    'Pending Verifications'::text,
    (SELECT COUNT(*)::numeric FROM charity_verifications WHERE status = 'pending'),
    NULL::numeric,
    NULL::numeric,
    'count'::text

  UNION ALL

  -- Validation Approval Rate
  SELECT
    'Validation Approval Rate'::text,
    CASE
      WHEN (SELECT COUNT(*) FROM validation_requests WHERE status IN ('approved', 'rejected')) = 0 THEN 0
      ELSE (
        SELECT (COUNT(*) FILTER (WHERE status = 'approved'))::numeric /
               NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0)::numeric
        FROM validation_requests
      )
    END,
    NULL::numeric,
    NULL::numeric,
    'ratio'::text;
END;
$$;

COMMENT ON FUNCTION admin_platform_health_summary(TEXT) IS
  'Cross-cutting platform KPIs with 7d/30d trend columns. Supports period '
  'presets: 7d, 30d, 90d. Requires admin role via is_admin_user(). Part of GIV-763.';

REVOKE ALL ON FUNCTION admin_platform_health_summary(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_platform_health_summary(TEXT) TO authenticated, service_role;
