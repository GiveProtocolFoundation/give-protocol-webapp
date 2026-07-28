-- =============================================================================
-- GIV-786: Fix enum mismatch in admin_volunteer_report, admin_validation_stats,
-- and admin_override_validation.
--
-- validation_status_enum values are: pending, validated, rejected, unvalidated,
-- expired. The original RPCs (20260726000000) reference 'approved' which does
-- not exist in the enum, causing 22P02 errors at runtime.
--
-- This migration is idempotent: DROP FUNCTION IF EXISTS for every historical
-- signature, then CREATE OR REPLACE with corrected enum values.
-- =============================================================================

-- ─── Section A: admin_volunteer_report ────────────────────────────────────────

DROP FUNCTION IF EXISTS public.admin_volunteer_report(timestamptz, timestamptz);

CREATE FUNCTION public.admin_volunteer_report(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  period              TEXT,
  hours_submitted     NUMERIC,
  hours_validated     NUMERIC,
  hours_rejected      NUMERIC,
  rejection_rate      NUMERIC,
  avg_validation_days NUMERIC
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
  WITH all_hours AS (
    SELECT
      vh.hours::NUMERIC   AS hours,
      vh.status           AS status,
      vh.created_at::TIMESTAMPTZ AS created_at,
      vh.approved_at::TIMESTAMPTZ AS decided_at
    FROM volunteer_hours vh
    UNION ALL
    SELECT
      srh.hours::NUMERIC,
      CASE srh.validation_status
        WHEN 'validated' THEN 'approved'
        WHEN 'rejected'  THEN 'rejected'
        ELSE 'pending'
      END,
      srh.created_at::TIMESTAMPTZ,
      srh.validated_at::TIMESTAMPTZ
    FROM self_reported_hours srh
  ),
  months AS (
    SELECT month_start FROM generate_series(
      date_trunc('month', p_date_from),
      date_trunc('month', p_date_to),
      INTERVAL '1 month'
    ) AS g(month_start)
  ),
  per_month AS (
    SELECT
      m.month_start,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.created_at >= m.month_start
          AND h.created_at < m.month_start + INTERVAL '1 month') AS hours_submitted,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.status = 'approved'
          AND COALESCE(h.decided_at, h.created_at) >= m.month_start
          AND COALESCE(h.decided_at, h.created_at) < m.month_start + INTERVAL '1 month') AS hours_validated,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.status = 'rejected'
          AND COALESCE(h.decided_at, h.created_at) >= m.month_start
          AND COALESCE(h.decided_at, h.created_at) < m.month_start + INTERVAL '1 month') AS hours_rejected,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (h.decided_at - h.created_at)) / 86400), 0)
        FROM all_hours h
        WHERE h.decided_at IS NOT NULL
          AND h.decided_at >= m.month_start
          AND h.decided_at < m.month_start + INTERVAL '1 month') AS avg_validation_days
    FROM months m
  )
  SELECT
    to_char(pm.month_start, 'YYYY-MM') AS period,
    pm.hours_submitted::NUMERIC,
    pm.hours_validated::NUMERIC,
    pm.hours_rejected::NUMERIC,
    CASE WHEN (pm.hours_validated + pm.hours_rejected) > 0
      THEN ROUND(pm.hours_rejected / (pm.hours_validated + pm.hours_rejected), 4)
      ELSE 0 END::NUMERIC AS rejection_rate,
    ROUND(pm.avg_validation_days::NUMERIC, 2) AS avg_validation_days
  FROM per_month pm
  ORDER BY pm.month_start;
END;
$$;

COMMENT ON FUNCTION public.admin_volunteer_report IS
  'Monthly volunteer hours submission/validation metrics across formal and '
  'self-reported hours. Admin-only. GIV-786: fixed validated enum value.';

REVOKE ALL ON FUNCTION public.admin_volunteer_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_volunteer_report(timestamptz, timestamptz) TO authenticated, service_role;


-- ─── Section B: admin_validation_stats ────────────────────────────────────────

DROP FUNCTION IF EXISTS public.admin_validation_stats();

CREATE FUNCTION public.admin_validation_stats()
RETURNS TABLE (
  total_pending           BIGINT,
  total_approved          BIGINT,
  total_rejected          BIGINT,
  total_expired           BIGINT,
  avg_response_time_hours NUMERIC,
  expiration_rate         NUMERIC,
  rejection_rate          NUMERIC,
  pending_by_org          JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending  BIGINT;
  v_approved BIGINT;
  v_rejected BIGINT;
  v_expired  BIGINT;
  v_avg_hours NUMERIC;
  v_by_org   JSONB;
  v_decided  BIGINT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE srh.validation_status = 'pending'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'validated'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'rejected'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'expired'),
    COALESCE(AVG(EXTRACT(EPOCH FROM (srh.validated_at - srh.created_at)) / 3600)
      FILTER (WHERE srh.validated_at IS NOT NULL), 0)
  INTO v_pending, v_approved, v_rejected, v_expired, v_avg_hours
  FROM self_reported_hours srh;

  SELECT COALESCE(jsonb_agg(o), '[]'::JSONB) INTO v_by_org
  FROM (
    SELECT
      srh.organization_id   AS org_id,
      MAX(srh.organization_name) AS org_name,
      COUNT(*)              AS pending_count
    FROM self_reported_hours srh
    WHERE srh.validation_status = 'pending'
    GROUP BY srh.organization_id
    ORDER BY COUNT(*) DESC
  ) o;

  v_decided := v_approved + v_rejected + v_expired;

  RETURN QUERY SELECT
    v_pending,
    v_approved,
    v_rejected,
    v_expired,
    ROUND(v_avg_hours, 2),
    CASE WHEN v_decided > 0 THEN ROUND(v_expired::NUMERIC / v_decided, 4) ELSE 0 END,
    CASE WHEN v_decided > 0 THEN ROUND(v_rejected::NUMERIC / v_decided, 4) ELSE 0 END,
    v_by_org;
END;
$$;

COMMENT ON FUNCTION public.admin_validation_stats IS
  'Aggregate self-reported volunteer-hours validation stats with per-org '
  'pending breakdown. Admin-only. GIV-786: fixed validated enum value.';

REVOKE ALL ON FUNCTION public.admin_validation_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_validation_stats() TO authenticated, service_role;


-- ─── Section C: admin_override_validation ─────────────────────────────────────
-- The original accepts 'approved' as a valid p_new_status value but the enum
-- value is 'validated'. Accept both for backwards compatibility with any
-- existing callers, mapping 'approved' → 'validated' before the UPDATE.

DROP FUNCTION IF EXISTS public.admin_override_validation(uuid, text, text);

CREATE FUNCTION public.admin_override_validation(
  p_request_id UUID,
  p_new_status TEXT,
  p_reason     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
  v_status  TEXT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Map 'approved' to the correct enum value 'validated'
  IF p_new_status = 'approved' THEN
    v_status := 'validated';
  ELSIF p_new_status IN ('validated', 'rejected', 'pending', 'expired') THEN
    v_status := p_new_status;
  ELSE
    RAISE EXCEPTION 'Invalid validation status: %', p_new_status;
  END IF;

  UPDATE self_reported_hours
  SET validation_status = v_status,
      validated_at = CASE WHEN v_status IN ('validated', 'rejected') THEN NOW() ELSE validated_at END,
      updated_at = NOW()
  WHERE id = p_request_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Validation request % not found', p_request_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_override_validation IS
  'Admin override of a self-reported volunteer-hours validation decision. '
  'Accepts both approved and validated as status values. Admin-only. GIV-786.';

REVOKE ALL ON FUNCTION public.admin_override_validation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_override_validation(uuid, text, text) TO authenticated, service_role;
