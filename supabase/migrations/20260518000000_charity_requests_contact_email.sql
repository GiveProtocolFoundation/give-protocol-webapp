-- Migration: Add contact_email to charity_requests and thread it through the
-- notification trigger so the edge function can send a confirmation to the
-- person who submitted the claim request.

-- 1. Add nullable contact_email column
ALTER TABLE charity_requests
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Replace the trigger function so it passes contact_email to the edge function
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
  'Fires charity-request-notify Edge Function after a new charity_requests row is inserted. Passes contact_email so the function can send a requester confirmation.';
