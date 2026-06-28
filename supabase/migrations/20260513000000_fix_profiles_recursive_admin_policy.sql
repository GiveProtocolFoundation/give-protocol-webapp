-- =============================================================================
-- Fix infinite recursion on profiles.admin_read_all_profiles
-- =============================================================================
--
-- The production database contained a definition of admin_read_all_profiles
-- whose USING clause queried the profiles table itself:
--
--   USING (
--     EXISTS (SELECT 1 FROM profiles p
--             WHERE p.user_id = auth.uid() AND p.type = 'admin')
--     OR auth.role() = 'service_role'
--   )
--
-- Because the policy was defined on profiles, evaluating it re-entered the
-- same policy, producing `42P17: infinite recursion detected in policy for
-- relation "profiles"`. PostgREST surfaced this to clients as HTTP 500 on
-- every `GET /rest/v1/profiles?...` call, which in turn triggered the
-- useProfile retry loop in the webapp.
--
-- The intended definition (per migration 20260411000003_admin_donor_management.sql)
-- uses a JWT claim check that performs no DB lookup, and therefore cannot
-- recurse. This migration drops whatever definition is currently present and
-- recreates the policy using the JWT-based predicate.
-- =============================================================================

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;

CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );
