-- =============================================================================
-- Hotfix: Fix get_admin_recent_activity 42804 type mismatch on actor_name
--
-- Symptom: The /admin dashboard "Recent Activity" card still fails after
-- 20260825000000 with:
--   get_admin_recent_activity RPC failed: structure of query does not match
--   function result type (code: 42804)
--   details: Returned type character varying does not match expected type
--            text in column 5.
--
-- Root cause: Same class as the event_time bug fixed in 20260825000000, but
-- on actor_name. profiles.name and auth.users.email are stored as
-- `character varying`. Each branch computes actor_name as a bare
-- `COALESCE(dp.name, du.email, 'Unknown donor')` with no surrounding
-- operator, so PL/pgSQL keeps PostgreSQL's inferred `character varying`
-- result type. That doesn't match the function's declared
-- `actor_name TEXT` column, unlike sibling columns such as `description`
-- which use the `||` concatenation operator and are implicitly cast to
-- `text` as a side effect.
--
-- Fix: Wrap every actor_name COALESCE with an explicit ::TEXT cast, so the
-- result always matches the declared RETURNS TABLE regardless of the
-- underlying column storage type.
--
-- PostgreSQL 42P13: cannot change return type via CREATE OR REPLACE FUNCTION
-- when the OUT-parameter set differs, so DROP first before recreating.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_admin_recent_activity(integer, integer);

CREATE FUNCTION public.get_admin_recent_activity(
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
  v_result_count BIGINT;
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
      COALESCE(dp.name, du.email, 'Unknown donor')::TEXT      AS actor_name,
      d.charity_id                                            AS entity_id,
      'donation'::TEXT                                        AS entity_type,
      d.amount                                                AS amount_usd,
      d.created_at::TIMESTAMPTZ                               AS event_time
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
      COALESCE(dp.name, fdu.email, 'Unknown donor')::TEXT,
      fd.charity_id,
      'donation'::TEXT,
      fd.amount_cents::NUMERIC / 100,
      fd.created_at::TIMESTAMPTZ
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
      COALESCE(p.name, pu.email, 'Unknown')::TEXT,
      p.id,
      'user'::TEXT,
      NULL::NUMERIC,
      p.created_at::TIMESTAMPTZ
    FROM profiles p
    LEFT JOIN auth.users pu ON pu.id = p.user_id

    UNION ALL

    -- Charity verification status changes
    SELECT
      cv.id,
      'verification'::TEXT,
      'Charity verification ' || cv.status || ': ' || COALESCE(cp.name, 'charity'),
      cv.charity_id,
      COALESCE(cp.name, 'Unknown charity')::TEXT,
      cv.charity_id,
      'charity_verification'::TEXT,
      NULL::NUMERIC,
      cv.updated_at::TIMESTAMPTZ
    FROM charity_verifications cv
    LEFT JOIN profiles cp ON cp.id = cv.charity_id

    UNION ALL

    -- Volunteer hours submissions
    SELECT
      vh.id,
      'volunteer_hours'::TEXT,
      'Volunteer hours submitted: ' || vh.hours || 'h for ' || COALESCE(op.title, 'opportunity'),
      vh.volunteer_id,
      COALESCE(vp.name, vu.email, 'Unknown volunteer')::TEXT,
      vh.opportunity_id,
      'volunteer_hours'::TEXT,
      NULL::NUMERIC,
      vh.created_at::TIMESTAMPTZ
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

  -- Audit the PII list access
  GET DIAGNOSTICS v_result_count = ROW_COUNT;
  PERFORM insert_admin_audit_read_entry(
    'user',
    NULL,
    jsonb_build_object(
      'source', 'get_admin_recent_activity',
      'limit', v_limit,
      'result_count', v_result_count
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_recent_activity(INT, INT) IS
  'Returns paginated recent activity feed across donations, registrations, and '
  'verification events. Audits PII access via insert_admin_audit_read_entry. '
  'Requires admin JWT claim. All event_time columns explicitly cast to '
  'TIMESTAMPTZ and all actor_name columns explicitly cast to TEXT to prevent '
  '42804 when source tables store TIMESTAMP without time zone or '
  'character varying. Part of GIV-85/GIV-413/GIV-930.';

REVOKE ALL ON FUNCTION public.get_admin_recent_activity(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_recent_activity(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_recent_activity(INT, INT) TO service_role;
