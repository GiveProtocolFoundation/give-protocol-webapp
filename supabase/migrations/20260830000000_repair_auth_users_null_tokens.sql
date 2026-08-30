-- Repair NULL token columns in auth.users that break GoTrue's admin listUsers.
--
-- Symptom: supabase.auth.admin.listUsers() returns HTTP 500
--   "Database error finding users" (code: unexpected_failure) for any page
--   that contains an affected row. Reading a single user (perPage: 1) can
--   succeed while a larger page fails, because the corrupt row only has to be
--   somewhere in the returned set.
--
-- Cause: GoTrue scans these columns into non-nullable Go strings. GoTrue always
--   writes '' (empty string), but a row created or modified outside GoTrue
--   (direct SQL, legacy/half-created accounts, some tooling) can leave them
--   NULL. Scanning NULL into a non-nullable string fails the whole query.
--
-- This surfaced as:
--   * the scheduled auth-confirm-seam E2E failing at Step 2 (listUsers), and
--   * supabase/functions/username-reminder silently returning 200 without ever
--     sending a reminder (it swallows the listUsers error).
--
-- The fix is the documented, idempotent repair: backfill NULL -> ''. The WHERE
-- clause makes this a no-op once every row is clean, so it is safe to re-run.

UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;

-- Targeted email -> user lookup, so callers never have to enumerate the entire
-- auth.users table to find one account. listUsers() is O(n) and, as above, 500s
-- for a whole page if any row is corrupt. This returns just the single row the
-- caller needs. SECURITY DEFINER so it can read auth.users; EXECUTE granted only
-- to service_role (edge functions), never to anon/authenticated, so it cannot be
-- used for email enumeration from the client.
CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(p_email text)
RETURNS TABLE (id uuid, raw_user_meta_data jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, u.raw_user_meta_data
  FROM auth.users AS u
  WHERE u.email = lower(p_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_auth_user_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_by_email(text) TO service_role;
