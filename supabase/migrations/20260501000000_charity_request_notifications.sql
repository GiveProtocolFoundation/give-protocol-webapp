-- Migration: Charity request admin notifications + admin listing RPC
-- Adds:
--   1. admin_list_charity_requests RPC for the admin dashboard view
--   2. AFTER INSERT trigger on charity_requests that invokes the
--      charity-request-notify Edge Function via pg_net so admins are emailed
--      when a donor requests an unclaimed charity.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 1. admin_list_charity_requests — aggregated list grouped by EIN
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_list_charity_requests(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  ein                   TEXT,
  request_count         BIGINT,
  first_requested_at    TIMESTAMPTZ,
  latest_requested_at   TIMESTAMPTZ,
  latest_requester_email TEXT,
  total_count           BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_limit < 1 OR p_limit > 500 THEN p_limit := 100; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  RETURN QUERY
  WITH grouped AS (
    SELECT
      cr.ein,
      COUNT(*)::BIGINT                 AS request_count,
      MIN(cr.created_at)               AS first_requested_at,
      MAX(cr.created_at)               AS latest_requested_at,
      (
        SELECT u.email
        FROM charity_requests cr2
        LEFT JOIN auth.users u ON u.id = cr2.user_id
        WHERE cr2.ein = cr.ein
        ORDER BY cr2.created_at DESC
        LIMIT 1
      )                                AS latest_requester_email
    FROM charity_requests cr
    GROUP BY cr.ein
  )
  SELECT
    g.ein,
    g.request_count,
    g.first_requested_at,
    g.latest_requested_at,
    g.latest_requester_email,
    (SELECT COUNT(*) FROM grouped)::BIGINT AS total_count
  FROM grouped g
  ORDER BY g.latest_requested_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_charity_requests IS
  'Returns charity requests aggregated by EIN with counts and latest requester. Admin-only.';

-- =============================================================================
-- 2. Trigger function: notify admins on new charity request
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_admin_charity_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_url TEXT;
  v_service_key   TEXT;
BEGIN
  -- Read settings; if either is missing, skip silently (e.g., local dev)
  BEGIN
    v_functions_url := current_setting('app.supabase_functions_url');
    v_service_key   := current_setting('app.service_role_key');
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_functions_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/charity-request-notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'requestId', NEW.id,
      'ein',       NEW.ein,
      'userId',    NEW.user_id
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_admin_charity_request IS
  'Fires charity-request-notify Edge Function after a new charity_requests row is inserted.';

DROP TRIGGER IF EXISTS trg_charity_requests_notify ON charity_requests;

CREATE TRIGGER trg_charity_requests_notify
  AFTER INSERT ON charity_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_charity_request();
