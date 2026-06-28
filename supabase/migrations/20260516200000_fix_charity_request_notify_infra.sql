-- Remediation migration: Fix missing infrastructure for charity request email notifications
-- Context: GIV-237 — pg_net extension, trigger, and Postgres settings were not applied
-- by the 20260501000000 migration (CREATE EXTENSION failed silently on hosted Supabase
-- because `postgres` is not superuser).
--
-- What this migration does:
--   1. Enables the pg_net extension (available on all hosted Supabase projects)
--   2. Recreates the trg_charity_requests_notify trigger
--   3. Upgrades the trigger function to read secrets from Supabase Vault
--      instead of app.* GUCs (which require superuser to set on hosted Supabase)
--
-- Vault secrets must be pre-populated (one-time setup, already done 2026-05-16):
--   SELECT vault.create_secret('<functions_url>', 'supabase_functions_url', '...');
--   SELECT vault.create_secret('<service_role_key>', 'service_role_key', '...');

-- 1. Enable pg_net (HTTP client extension for Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Recreate the trigger (idempotent — drops first if exists)
DROP TRIGGER IF EXISTS trg_charity_requests_notify ON charity_requests;

CREATE TRIGGER trg_charity_requests_notify
  AFTER INSERT ON charity_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_charity_request();

-- 3. Replace the trigger function to read from Vault instead of GUCs
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
  -- Read settings from Vault (production) or fall back to GUC (local dev)
  BEGIN
    SELECT decrypted_secret INTO v_functions_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    -- Fall back to GUC if vault is empty (local dev)
    IF v_functions_url IS NULL THEN
      v_functions_url := current_setting('app.supabase_functions_url', true);
    END IF;
    IF v_service_key IS NULL THEN
      v_service_key := current_setting('app.service_role_key', true);
    END IF;
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
      'requestId',     NEW.id,
      'ein',           NEW.ein,
      'userId',        NEW.user_id,
      'contactEmail',  NEW.contact_email
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_admin_charity_request IS
  'Fires charity-request-notify Edge Function after a new charity_requests row is inserted. Reads secrets from Vault (production) or GUC (local dev). Passes contact_email so the function can send a requester confirmation.';
