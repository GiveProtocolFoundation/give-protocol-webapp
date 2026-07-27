-- Migration: admin_cascade_charity_moderation + admin_list_validation_requests de-dupe
-- Part of GIV-766 (QA follow-up to GIV-721/GIV-763).
--
-- 1. De-duplicate admin_list_validation_requests: two merged migrations
--    (20260726000001 and 20260727000000) define it with different parameter
--    types (p_org_id/p_volunteer_id as TEXT vs UUID). Applying both leaves two
--    overloads and PostgREST fails with PGRST203 (ambiguous function) on every
--    Volunteer Validation page load. Drop both signatures and recreate the
--    canonical UUID variant.
-- 2. Create admin_cascade_charity_moderation, called by the Content Moderation
--    page cascade action (adminContentModerationService.ts) but never created
--    in any prior migration.
--
-- Conventions: SECURITY DEFINER, is_admin_user() guard, revoked from anon.
-- Idempotent: DROP FUNCTION IF EXISTS before CREATE.

-- =============================================================================
-- SECTION A: de-duplicate admin_list_validation_requests overloads
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_list_validation_requests(text, text, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_validation_requests(text, uuid, uuid, text, text, text, integer, integer);

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
-- SECTION B: admin_cascade_charity_moderation
-- Applies a moderation action to ALL causes and volunteer opportunities that
-- belong to a charity. Returns the total number of affected rows.
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_cascade_charity_moderation(uuid, text, text);

CREATE FUNCTION public.admin_cascade_charity_moderation(
  p_charity_id UUID,
  p_action     TEXT,
  p_reason     TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
  v_causes INT;
  v_opportunities INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_new_status := CASE p_action
    WHEN 'hide'   THEN 'hidden'
    WHEN 'unhide' THEN 'visible'
    WHEN 'flag'   THEN 'flagged'
    WHEN 'unflag' THEN 'visible'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid moderation action: %. Must be hide, unhide, flag, or unflag', p_action;
  END IF;

  UPDATE causes
  SET moderation_status = v_new_status,
      moderation_reason = p_reason,
      moderated_at = NOW(),
      updated_at = NOW()
  WHERE charity_id = p_charity_id;
  GET DIAGNOSTICS v_causes = ROW_COUNT;

  UPDATE volunteer_opportunities
  SET moderation_status = v_new_status,
      moderation_reason = p_reason,
      moderated_at = NOW(),
      updated_at = NOW()
  WHERE charity_id = p_charity_id;
  GET DIAGNOSTICS v_opportunities = ROW_COUNT;

  RETURN v_causes + v_opportunities;
END;
$$;

COMMENT ON FUNCTION public.admin_cascade_charity_moderation(uuid, text, text) IS
  'Cascades a moderation action (hide/unhide/flag/unflag) across all causes '
  'and volunteer opportunities of a charity. Returns affected row count. '
  'Admin-only. GIV-766.';

REVOKE ALL ON FUNCTION public.admin_cascade_charity_moderation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cascade_charity_moderation(uuid, text, text) TO authenticated, service_role;
