-- =============================================================================
-- GIV-763: Add 3 missing admin RPCs that block GIV-721 closure
--
-- QA probe (GIV-756) confirmed these RPCs return PGRST202 in production.
-- They are called by the deployed frontend but were not included in
-- 20260726000000_admin_dashboard_db_reconciliation.sql.
--
-- Missing RPCs:
--   1. admin_list_validation_requests  — Volunteer Validation → Requests tab
--   2. admin_suspicious_volunteer_patterns — Volunteer Validation → Patterns tab
--   3. admin_platform_health_summary   — Reports → Platform Health tab
--
-- Conventions (same as the reconciliation migration):
--   * All functions are SECURITY DEFINER, guard on is_admin_user().
--   * Idempotent: DROP FUNCTION IF EXISTS before CREATE.
--   * REVOKE from PUBLIC/anon, GRANT to authenticated/service_role.
-- =============================================================================


-- =============================================================================
-- 1. admin_list_validation_requests
--    Paginated, filtered list of self-reported volunteer hours for admin review.
--    Queries self_reported_hours directly (consistent with admin_validation_stats
--    and admin_override_validation in the reconciliation migration).
--    All string params declared TEXT to prevent PGRST202 type-mismatch.
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_list_validation_requests(text, text, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_validation_requests(text, uuid, uuid, text, text, text, integer, integer);

CREATE FUNCTION public.admin_list_validation_requests(
  p_status       TEXT DEFAULT NULL,
  p_org_id       TEXT DEFAULT NULL,
  p_volunteer_id TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_date_from    TEXT DEFAULT NULL,
  p_date_to      TEXT DEFAULT NULL,
  p_page         INT  DEFAULT 1,
  p_limit        INT  DEFAULT 50
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
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      srh.id,
      srh.volunteer_id,
      au.email::TEXT                                       AS volunteer_email,
      vp.name                                              AS volunteer_display_name,
      srh.organization_id                                  AS org_id,
      COALESCE(srh.organization_name, op.name)::TEXT       AS org_name,
      srh.hours::NUMERIC                                   AS hours_reported,
      srh.activity_date,
      srh.validation_status::TEXT                          AS status,
      srh.validated_by                                     AS validator_user_id,
      srh.validated_at::TIMESTAMPTZ                        AS validated_at,
      (srh.created_at + INTERVAL '30 days')::TIMESTAMPTZ   AS expires_at,
      srh.created_at::TIMESTAMPTZ                          AS created_at
    FROM self_reported_hours srh
    LEFT JOIN auth.users au ON au.id = srh.volunteer_id
    LEFT JOIN profiles vp ON vp.user_id = srh.volunteer_id
    LEFT JOIN profiles op ON op.id = srh.organization_id
    WHERE (p_status       IS NULL OR srh.validation_status::TEXT = p_status)
      AND (p_org_id       IS NULL OR srh.organization_id = p_org_id::UUID)
      AND (p_volunteer_id IS NULL OR srh.volunteer_id = p_volunteer_id::UUID)
      AND (p_date_from    IS NULL OR srh.activity_date >= p_date_from::DATE)
      AND (p_date_to      IS NULL OR srh.activity_date <= p_date_to::DATE)
      AND (p_search       IS NULL
           OR au.email::TEXT ILIKE '%' || p_search || '%'
           OR vp.name ILIKE '%' || p_search || '%'
           OR COALESCE(srh.organization_name, op.name, '') ILIKE '%' || p_search || '%')
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
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY
    CASE f.status
      WHEN 'pending'     THEN 1
      WHEN 'unvalidated' THEN 2
      WHEN 'approved'    THEN 3
      WHEN 'validated'   THEN 3
      WHEN 'rejected'    THEN 4
      WHEN 'expired'     THEN 5
      ELSE 6
    END,
    f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_validation_requests IS
  'Paginated, filtered list of self-reported volunteer-hours validation '
  'requests for the admin Volunteer Validation page. Admin-only. GIV-763.';

REVOKE ALL ON FUNCTION public.admin_list_validation_requests(text, text, text, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_validation_requests(text, text, text, text, text, text, integer, integer) TO authenticated, service_role;


-- =============================================================================
-- 2. admin_suspicious_volunteer_patterns
--    Volunteers exceeding 20 hours in a rolling 7-day window, grouped by org.
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_suspicious_volunteer_patterns();

CREATE FUNCTION public.admin_suspicious_volunteer_patterns()
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
  SELECT
    srh.volunteer_id,
    au.email::TEXT                                   AS volunteer_email,
    vp.name                                          AS volunteer_display_name,
    srh.organization_id                              AS org_id,
    COALESCE(srh.organization_name, op.name)::TEXT   AS org_name,
    SUM(srh.hours)::NUMERIC                          AS weekly_hours,
    COUNT(*)::BIGINT                                 AS total_requests
  FROM self_reported_hours srh
  LEFT JOIN auth.users au ON au.id = srh.volunteer_id
  LEFT JOIN profiles vp ON vp.user_id = srh.volunteer_id
  LEFT JOIN profiles op ON op.id = srh.organization_id
  WHERE srh.activity_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY srh.volunteer_id, au.email, vp.name, srh.organization_id,
           COALESCE(srh.organization_name, op.name)
  HAVING SUM(srh.hours) > 20
  ORDER BY SUM(srh.hours) DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_suspicious_volunteer_patterns IS
  'Identifies volunteers reporting more than 20 hours in the last 7 days, '
  'grouped by organization. Admin-only. GIV-763.';

REVOKE ALL ON FUNCTION public.admin_suspicious_volunteer_patterns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suspicious_volunteer_patterns() TO authenticated, service_role;


-- =============================================================================
-- 3. admin_platform_health_summary
--    Cross-cutting KPI aggregation with 7d and 30d trend deltas.
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_platform_health_summary(text);

CREATE FUNCTION public.admin_platform_health_summary(
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
  v_now           TIMESTAMPTZ := NOW();
  v_total_users   BIGINT;
  v_users_7d      BIGINT;
  v_users_30d     BIGINT;
  v_users_prev_7d BIGINT;
  v_users_prev_30d BIGINT;
  v_active_charities   BIGINT;
  v_charities_7d       BIGINT;
  v_charities_30d      BIGINT;
  v_charities_prev_7d  BIGINT;
  v_charities_prev_30d BIGINT;
  v_total_donations_usd NUMERIC;
  v_donations_7d        NUMERIC;
  v_donations_30d       NUMERIC;
  v_donations_prev_7d   NUMERIC;
  v_donations_prev_30d  NUMERIC;
  v_total_vol_hours     NUMERIC;
  v_vol_hours_7d        NUMERIC;
  v_vol_hours_30d       NUMERIC;
  v_vol_prev_7d         NUMERIC;
  v_vol_prev_30d        NUMERIC;
  v_active_donors       BIGINT;
  v_donors_7d           BIGINT;
  v_donors_30d          BIGINT;
  v_donors_prev_7d      BIGINT;
  v_donors_prev_30d     BIGINT;
  v_pending_verifications BIGINT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_period NOT IN ('7d', '30d', '90d') THEN
    RAISE EXCEPTION 'Invalid period: %. Must be 7d, 30d, or 90d', p_period;
  END IF;

  -- Total users
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_users_7d
    FROM profiles WHERE created_at >= v_now - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_users_prev_7d
    FROM profiles WHERE created_at >= v_now - INTERVAL '14 days'
                    AND created_at < v_now - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_users_30d
    FROM profiles WHERE created_at >= v_now - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_users_prev_30d
    FROM profiles WHERE created_at >= v_now - INTERVAL '60 days'
                    AND created_at < v_now - INTERVAL '30 days';

  -- Active charities (verified/approved)
  SELECT COUNT(*) INTO v_active_charities
    FROM charity_verifications WHERE status IN ('verified', 'approved');
  SELECT COUNT(*) INTO v_charities_7d
    FROM charity_verifications WHERE status IN ('verified', 'approved')
      AND reviewed_at >= v_now - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_charities_prev_7d
    FROM charity_verifications WHERE status IN ('verified', 'approved')
      AND reviewed_at >= v_now - INTERVAL '14 days'
      AND reviewed_at < v_now - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_charities_30d
    FROM charity_verifications WHERE status IN ('verified', 'approved')
      AND reviewed_at >= v_now - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_charities_prev_30d
    FROM charity_verifications WHERE status IN ('verified', 'approved')
      AND reviewed_at >= v_now - INTERVAL '60 days'
      AND reviewed_at < v_now - INTERVAL '30 days';

  -- Donation volume (crypto + fiat combined)
  SELECT
    COALESCE((SELECT SUM(d.amount) FROM donations d), 0)
    + COALESCE((SELECT SUM(fd.amount_cents::NUMERIC / 100) FROM fiat_donations fd WHERE fd.status = 'completed'), 0)
  INTO v_total_donations_usd;

  SELECT
    COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.created_at >= v_now - INTERVAL '7 days'), 0)
    + COALESCE((SELECT SUM(fd.amount_cents::NUMERIC / 100) FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '7 days'), 0)
  INTO v_donations_7d;

  SELECT
    COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.created_at >= v_now - INTERVAL '14 days' AND d.created_at < v_now - INTERVAL '7 days'), 0)
    + COALESCE((SELECT SUM(fd.amount_cents::NUMERIC / 100) FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '14 days' AND fd.created_at < v_now - INTERVAL '7 days'), 0)
  INTO v_donations_prev_7d;

  SELECT
    COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.created_at >= v_now - INTERVAL '30 days'), 0)
    + COALESCE((SELECT SUM(fd.amount_cents::NUMERIC / 100) FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '30 days'), 0)
  INTO v_donations_30d;

  SELECT
    COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.created_at >= v_now - INTERVAL '60 days' AND d.created_at < v_now - INTERVAL '30 days'), 0)
    + COALESCE((SELECT SUM(fd.amount_cents::NUMERIC / 100) FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '60 days' AND fd.created_at < v_now - INTERVAL '30 days'), 0)
  INTO v_donations_prev_30d;

  -- Volunteer hours (self-reported, approved/validated)
  SELECT COALESCE(SUM(hours), 0) INTO v_total_vol_hours
    FROM self_reported_hours WHERE validation_status::TEXT IN ('approved', 'validated');
  SELECT COALESCE(SUM(hours), 0) INTO v_vol_hours_7d
    FROM self_reported_hours WHERE validation_status::TEXT IN ('approved', 'validated')
      AND validated_at >= v_now - INTERVAL '7 days';
  SELECT COALESCE(SUM(hours), 0) INTO v_vol_prev_7d
    FROM self_reported_hours WHERE validation_status::TEXT IN ('approved', 'validated')
      AND validated_at >= v_now - INTERVAL '14 days'
      AND validated_at < v_now - INTERVAL '7 days';
  SELECT COALESCE(SUM(hours), 0) INTO v_vol_hours_30d
    FROM self_reported_hours WHERE validation_status::TEXT IN ('approved', 'validated')
      AND validated_at >= v_now - INTERVAL '30 days';
  SELECT COALESCE(SUM(hours), 0) INTO v_vol_prev_30d
    FROM self_reported_hours WHERE validation_status::TEXT IN ('approved', 'validated')
      AND validated_at >= v_now - INTERVAL '60 days'
      AND validated_at < v_now - INTERVAL '30 days';

  -- Active donors (made a donation in period window)
  WITH period_window AS (
    SELECT CASE p_period
      WHEN '7d'  THEN v_now - INTERVAL '7 days'
      WHEN '30d' THEN v_now - INTERVAL '30 days'
      WHEN '90d' THEN v_now - INTERVAL '90 days'
    END AS since
  )
  SELECT COUNT(DISTINCT donor_id) INTO v_active_donors
  FROM (
    SELECT d.donor_id FROM donations d, period_window pw WHERE d.created_at >= pw.since
    UNION
    SELECT fd.donor_id FROM fiat_donations fd, period_window pw WHERE fd.status = 'completed' AND fd.created_at >= pw.since
  ) active;

  SELECT COUNT(DISTINCT donor_id) INTO v_donors_7d
  FROM (
    SELECT d.donor_id FROM donations d WHERE d.created_at >= v_now - INTERVAL '7 days'
    UNION
    SELECT fd.donor_id FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '7 days'
  ) d7;

  SELECT COUNT(DISTINCT donor_id) INTO v_donors_prev_7d
  FROM (
    SELECT d.donor_id FROM donations d WHERE d.created_at >= v_now - INTERVAL '14 days' AND d.created_at < v_now - INTERVAL '7 days'
    UNION
    SELECT fd.donor_id FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '14 days' AND fd.created_at < v_now - INTERVAL '7 days'
  ) dp7;

  SELECT COUNT(DISTINCT donor_id) INTO v_donors_30d
  FROM (
    SELECT d.donor_id FROM donations d WHERE d.created_at >= v_now - INTERVAL '30 days'
    UNION
    SELECT fd.donor_id FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '30 days'
  ) d30;

  SELECT COUNT(DISTINCT donor_id) INTO v_donors_prev_30d
  FROM (
    SELECT d.donor_id FROM donations d WHERE d.created_at >= v_now - INTERVAL '60 days' AND d.created_at < v_now - INTERVAL '30 days'
    UNION
    SELECT fd.donor_id FROM fiat_donations fd WHERE fd.status = 'completed' AND fd.created_at >= v_now - INTERVAL '60 days' AND fd.created_at < v_now - INTERVAL '30 days'
  ) dp30;

  -- Pending verifications
  SELECT COUNT(*) INTO v_pending_verifications
    FROM charity_verifications WHERE status = 'pending';

  -- Return rows with percentage-change trends
  RETURN QUERY VALUES
    ('Total Users'::TEXT,
     v_total_users::NUMERIC,
     CASE WHEN v_users_prev_7d > 0 THEN ROUND((v_users_7d - v_users_prev_7d)::NUMERIC / v_users_prev_7d * 100, 1) ELSE NULL END,
     CASE WHEN v_users_prev_30d > 0 THEN ROUND((v_users_30d - v_users_prev_30d)::NUMERIC / v_users_prev_30d * 100, 1) ELSE NULL END,
     'count'::TEXT),

    ('Active Charities'::TEXT,
     v_active_charities::NUMERIC,
     CASE WHEN v_charities_prev_7d > 0 THEN ROUND((v_charities_7d - v_charities_prev_7d)::NUMERIC / v_charities_prev_7d * 100, 1) ELSE NULL END,
     CASE WHEN v_charities_prev_30d > 0 THEN ROUND((v_charities_30d - v_charities_prev_30d)::NUMERIC / v_charities_prev_30d * 100, 1) ELSE NULL END,
     'count'::TEXT),

    ('Donation Volume'::TEXT,
     ROUND(v_total_donations_usd, 2),
     CASE WHEN v_donations_prev_7d > 0 THEN ROUND((v_donations_7d - v_donations_prev_7d) / v_donations_prev_7d * 100, 1) ELSE NULL END,
     CASE WHEN v_donations_prev_30d > 0 THEN ROUND((v_donations_30d - v_donations_prev_30d) / v_donations_prev_30d * 100, 1) ELSE NULL END,
     'USD'::TEXT),

    ('Volunteer Hours'::TEXT,
     ROUND(v_total_vol_hours, 1),
     CASE WHEN v_vol_prev_7d > 0 THEN ROUND((v_vol_hours_7d - v_vol_prev_7d) / v_vol_prev_7d * 100, 1) ELSE NULL END,
     CASE WHEN v_vol_prev_30d > 0 THEN ROUND((v_vol_hours_30d - v_vol_prev_30d) / v_vol_prev_30d * 100, 1) ELSE NULL END,
     'hours'::TEXT),

    ('Active Donors'::TEXT,
     v_active_donors::NUMERIC,
     CASE WHEN v_donors_prev_7d > 0 THEN ROUND((v_donors_7d - v_donors_prev_7d)::NUMERIC / v_donors_prev_7d * 100, 1) ELSE NULL END,
     CASE WHEN v_donors_prev_30d > 0 THEN ROUND((v_donors_30d - v_donors_prev_30d)::NUMERIC / v_donors_prev_30d * 100, 1) ELSE NULL END,
     'count'::TEXT),

    ('Pending Verifications'::TEXT,
     v_pending_verifications::NUMERIC,
     NULL::NUMERIC,
     NULL::NUMERIC,
     'count'::TEXT);
END;
$$;

COMMENT ON FUNCTION public.admin_platform_health_summary IS
  'Cross-cutting platform KPIs (users, charities, donations, volunteer hours, '
  'active donors, pending verifications) with 7d/30d percentage-change trends. '
  'Admin-only. GIV-763.';

REVOKE ALL ON FUNCTION public.admin_platform_health_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_health_summary(text) TO authenticated, service_role;


-- =============================================================================
-- Verification (run after applying):
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND proname IN ('admin_list_validation_requests',
--                     'admin_suspicious_volunteer_patterns',
--                     'admin_platform_health_summary')
--   ORDER BY proname;
--   -- Should return 3 rows.
-- =============================================================================
