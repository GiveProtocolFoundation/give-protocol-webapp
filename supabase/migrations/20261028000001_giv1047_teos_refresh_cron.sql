-- GIV-1047: Schedule teos-refresh cron job (daily at 03:00 UTC)
--
-- Uses the vault-aware invoker pattern (from GIV-724 admin-alert-digest) to
-- read the service-role key securely rather than inlining it in the cron
-- schedule body. Falls back to the app.service_role_key GUC if the vault
-- secret is not present.
--
-- pg_cron fires -> invoke_teos_refresh() -> net.http_post -> teos-refresh edge fn

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 1. Invoker function — reads service key from vault, calls Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_teos_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key TEXT;
  v_functions_url TEXT;
BEGIN
  -- Try vault first (production), fall back to GUC (local dev / staging)
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL THEN
    v_service_key := current_setting('app.service_role_key', TRUE);
  END IF;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'invoke_teos_refresh: no service key available — skipping';
    RETURN;
  END IF;

  v_functions_url := current_setting('app.supabase_functions_url', TRUE);
  IF v_functions_url IS NULL THEN
    v_functions_url := current_setting('app.supabase_url', TRUE) || '/functions/v1';
  END IF;

  IF v_functions_url IS NULL THEN
    RAISE WARNING 'invoke_teos_refresh: no functions URL available — skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/teos-refresh',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_teos_refresh() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_teos_refresh() TO service_role;

COMMENT ON FUNCTION public.invoke_teos_refresh IS 'Vault-aware invoker for the teos-refresh Edge Function — called by pg_cron daily';


-- ============================================================================
-- 2. Schedule the cron job (idempotent)
-- ============================================================================

-- Remove existing schedule if present (idempotent re-run)
DO $$
BEGIN
  PERFORM cron.unschedule('teos-refresh-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'teos-refresh-daily');
EXCEPTION WHEN OTHERS THEN
  -- pg_cron may not have the job yet; that's fine
  NULL;
END;
$$;

-- Schedule: daily at 03:00 UTC (after OFAC refresh at ~02:00, before business hours)
SELECT cron.schedule(
  'teos-refresh-daily',
  '0 3 * * *',
  $$SELECT public.invoke_teos_refresh()$$
);
