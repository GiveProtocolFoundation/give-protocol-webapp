-- =============================================================================
-- GIV-721: Admin "High Priority" review — 3-day aging rule + admin email digest
--
-- Board requirement:
--   1. The admin dashboard "High Priority" section must surface any matter
--      requiring admin action that has been SITTING MORE THAN 3 DAYS —
--      charity management, donor management, fund management, or any other
--      customer-affecting matter.
--   2. When a matter crosses the 3-day threshold (becomes high priority),
--      an email must be sent to the platform admins.
--
-- Previous behaviour (GIV-372 version of get_admin_alerts):
--   - pending charity verifications were labelled 'high' immediately (no aging)
--   - removal requests were labelled 'high' immediately (no aging)
--   - volunteer validation requests only alerted after 90 days (created_at)
--   - open donation flags and aged pending validations were not covered
--   - no email was ever sent when a matter aged into high priority
--
-- This migration:
--   1. Creates admin_alert_notifications (dedup ledger for digest emails)
--   2. Adds admin_collect_alerts() — shared alert collector with the uniform
--      3-day escalation rule and broader queue coverage
--   3. Recreates get_admin_alerts() as a thin admin-guarded wrapper
--   4. Adds get_admin_alert_digest() — service-role-only, high severity rows
--   5. Adds get_admin_notification_emails() — service-role-only admin list
--   6. Adds invoke_admin_alert_digest() + daily pg_cron job that calls the
--      admin-alert-digest Edge Function via pg_net
--
-- Not covered (documented decision): charity_requests has no status/resolution
-- column, so "sitting unactioned" cannot be measured for it. New rows already
-- trigger an immediate admin email via charity-request-notify.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Dedup ledger: which (alert_type, entity_id) pairs admins were emailed for
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_alert_notifications (
  alert_type  TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_type, entity_id)
);

-- RLS with no policies: only service_role (bypasses RLS) can touch this table.
ALTER TABLE admin_alert_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE admin_alert_notifications IS
  'Ledger of high-priority admin alerts already emailed to admins by the '
  'admin-alert-digest Edge Function. Rows are removed when the underlying '
  'matter is resolved so a recurrence re-notifies. GIV-721.';

-- ---------------------------------------------------------------------------
-- 2. Shared collector with the uniform 3-day escalation rule
--    severity = 'high'  when the matter has been sitting > 3 days
--    severity = 'medium' when it is actionable but younger than 3 days
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_collect_alerts()
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Charity management: charities awaiting verification.
  -- Includes charities with a 'pending' verification row and charities with
  -- no verification row at all (GIV-372). Ages from when the review became
  -- pending (falls back to profile creation).
  SELECT
    'pending_verification'::TEXT         AS alert_type,
    CASE WHEN COALESCE(cv.created_at, p.created_at) < NOW() - INTERVAL '3 days'
         THEN 'high' ELSE 'medium' END::TEXT AS severity,
    'Pending Charity Verification'::TEXT AS title,
    ('Charity awaiting verification: ' || COALESCE(p.name, 'Unknown charity'))::TEXT,
    p.id                                 AS entity_id,
    'charity_verification'::TEXT         AS entity_type,
    COALESCE(cv.created_at, p.created_at) AS created_at,
    COUNT(*) OVER ()                     AS count
  FROM profiles p
  LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
  WHERE p.type = 'charity'
    AND (cv.status = 'pending' OR cv.id IS NULL)

  UNION ALL

  -- Donor management: account removal requests awaiting admin action.
  SELECT
    'removal_request'::TEXT,
    CASE WHEN rr.created_at < NOW() - INTERVAL '3 days'
         THEN 'high' ELSE 'medium' END::TEXT,
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

  UNION ALL

  -- Volunteer matters: validation requests that expired while still pending.
  -- The admin clock starts at expiry, not at creation.
  SELECT
    'expired_validation'::TEXT,
    CASE WHEN vr.expires_at < NOW() - INTERVAL '3 days'
         THEN 'high' ELSE 'medium' END::TEXT,
    'Expired Validation Request'::TEXT,
    ('Validation request expired for volunteer: ' || COALESCE(vp.name, vru.email, 'Unknown'))::TEXT,
    vr.id,
    'validation_request'::TEXT,
    vr.created_at,
    COUNT(*) OVER ()
  FROM validation_requests vr
  LEFT JOIN profiles vp ON vp.user_id = vr.volunteer_id
  LEFT JOIN auth.users vru ON vru.id = vr.volunteer_id
  WHERE vr.status = 'pending'
    AND vr.expires_at < NOW()

  UNION ALL

  -- Volunteer matters: validation requests still live but sitting > 3 days
  -- without a charity response — escalated to admins as customer-affecting.
  SELECT
    'pending_validation'::TEXT,
    'high'::TEXT,
    'Stale Validation Request'::TEXT,
    ('Volunteer hours awaiting validation for: ' || COALESCE(vp.name, vru.email, 'Unknown'))::TEXT,
    vr.id,
    'validation_request'::TEXT,
    vr.created_at,
    COUNT(*) OVER ()
  FROM validation_requests vr
  LEFT JOIN profiles vp ON vp.user_id = vr.volunteer_id
  LEFT JOIN auth.users vru ON vru.id = vr.volunteer_id
  WHERE vr.status = 'pending'
    AND vr.expires_at >= NOW()
    AND vr.created_at < NOW() - INTERVAL '3 days'

  ORDER BY created_at ASC;

  -- Fund/donation management: open donation flags awaiting resolution.
  -- donation_flags is created by the backend repository's migrations, so it
  -- is referenced only when present (keeps shadow/local databases working).
  IF to_regclass('public.donation_flags') IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'donation_flag'::TEXT,
      CASE WHEN df.created_at < NOW() - INTERVAL '3 days'
           THEN 'high' ELSE 'medium' END::TEXT,
      'Open Donation Flag'::TEXT,
      ('Flagged donation awaiting review: ' || COALESCE(df.flag_reason, 'No reason recorded'))::TEXT,
      df.id,
      'donation_flag'::TEXT,
      df.created_at,
      COUNT(*) OVER ()
    FROM donation_flags df
    WHERE df.resolved_at IS NULL
    ORDER BY df.created_at ASC;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_collect_alerts() IS
  'Shared collector for admin action items across charity, donor, volunteer '
  'and fund queues. Applies the uniform GIV-721 rule: severity=high when the '
  'matter has been sitting more than 3 days. Not directly grantable — called '
  'by get_admin_alerts() and get_admin_alert_digest().';

REVOKE ALL ON FUNCTION public.admin_collect_alerts() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Dashboard RPC: admin-guarded wrapper (same signature as before)
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin guard: JWT metadata first, profiles table fallback
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM admin_collect_alerts();
END;
$$;

COMMENT ON FUNCTION public.get_admin_alerts() IS
  'Returns all pending admin action items with GIV-721 3-day escalation: '
  'charity verifications, removal requests, expired/stale volunteer '
  'validations, and open donation flags. Admin-only.';

REVOKE ALL ON FUNCTION public.get_admin_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_alerts() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Digest RPC: high-severity rows only, for the Edge Function (service_role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_alert_digest()
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM admin_collect_alerts() a WHERE a.severity = 'high';
END;
$$;

COMMENT ON FUNCTION public.get_admin_alert_digest() IS
  'High-priority (sitting > 3 days) admin matters for the admin-alert-digest '
  'Edge Function email. Service-role only. GIV-721.';

REVOKE ALL ON FUNCTION public.get_admin_alert_digest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_alert_digest() TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Admin recipient list for digest emails (service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_notification_emails()
RETURNS TABLE (email TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.type = 'admin'
    AND u.email IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.get_admin_notification_emails() IS
  'Email addresses of platform admins for high-priority alert digests. '
  'Service-role only. GIV-721.';

REVOKE ALL ON FUNCTION public.get_admin_notification_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_notification_emails() TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Daily cron: invoke the admin-alert-digest Edge Function via pg_net.
--    Secrets come from Vault (production) with GUC fallback (local dev),
--    matching the charity-request-notify infrastructure pattern.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_admin_alert_digest()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_url TEXT;
  v_service_key   TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_functions_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF v_functions_url IS NULL THEN
      v_functions_url := current_setting('app.supabase_functions_url', true);
    END IF;
    IF v_service_key IS NULL THEN
      v_service_key := current_setting('app.service_role_key', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_functions_url IS NULL OR v_service_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/admin-alert-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION public.invoke_admin_alert_digest() IS
  'Calls the admin-alert-digest Edge Function via pg_net. Scheduled daily by '
  'pg_cron. Reads secrets from Vault (production) or GUC (local dev). GIV-721.';

REVOKE ALL ON FUNCTION public.invoke_admin_alert_digest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_admin_alert_digest() TO service_role;

-- Schedule daily at 08:00 UTC (idempotent: unschedule first if present)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('admin-alert-digest-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'admin-alert-digest-daily'
);

SELECT cron.schedule(
  'admin-alert-digest-daily',
  '0 8 * * *',   -- 08:00 UTC daily
  $$ SELECT public.invoke_admin_alert_digest(); $$
);
