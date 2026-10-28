-- =============================================================================
-- Migration: Schedule ofac-refresh edge function daily via pg_cron
-- GIV-1075 (operational wiring for GIV-1048).
--
-- Registers a daily pg_cron job that POSTs to the ofac-refresh Edge Function,
-- authenticating with the shared x-cron-secret header (CRON_SHARED_SECRET).
--
-- Secrets are read from Supabase Vault (production) with GUC fallback (local
-- dev), mirroring the invoke_admin_alert_digest() / charity-request-notify
-- infrastructure pattern. Vault prerequisites (created once, outside CI):
--   - 'supabase_functions_url'  (already used by existing cron jobs)
--   - 'CRON_SHARED_SECRET'      (shared with wallet-designation-recheck and
--                                wallet-domain-attribution-recheck)
--
-- The ofac-refresh function also accepts Authorization: Bearer
-- <SERVICE_ROLE_KEY> for manual/admin seeding runs.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Invoke helper (SECURITY DEFINER, service-role only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invoke_ofac_refresh()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_url TEXT;
  v_cron_secret   TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_functions_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1;
    SELECT decrypted_secret INTO v_cron_secret
      FROM vault.decrypted_secrets WHERE name = 'CRON_SHARED_SECRET' LIMIT 1;

    IF v_functions_url IS NULL THEN
      v_functions_url := current_setting('app.supabase_functions_url', true);
    END IF;
    IF v_cron_secret IS NULL THEN
      v_cron_secret := current_setting('app.cron_shared_secret', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_functions_url IS NULL OR v_cron_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/ofac-refresh',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION public.invoke_ofac_refresh() IS
  'Calls the ofac-refresh Edge Function via pg_net with the shared '
  'x-cron-secret header. Scheduled daily by pg_cron; also usable to seed the '
  'SDN cache manually. Reads secrets from Vault (production) or GUC (local '
  'dev). GIV-1075.';

REVOKE ALL ON FUNCTION public.invoke_ofac_refresh() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_ofac_refresh() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Daily schedule (idempotent: unschedule first if present)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('ofac-refresh-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ofac-refresh-daily'
);

SELECT cron.schedule(
  'ofac-refresh-daily',
  '15 10 * * *',   -- 10:15 UTC daily (after admin-alert-digest @08:00)
  $$ SELECT public.invoke_ofac_refresh(); $$
);