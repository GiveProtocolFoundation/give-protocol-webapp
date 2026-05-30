-- =============================================================================
-- Migration: Fix profiles RLS performance (auth_rls_initplan lint 0003)
-- Description: Wrap bare auth.uid() / auth.role() / auth.jwt() calls in scalar
--   subqueries so Postgres evaluates them once per query, not once per row.
--   Also fixes admin_read_all_profiles: replaces the user_metadata reference
--   (end-user editable) with app_metadata (server-controlled), while keeping
--   the JWT-based predicate to avoid the infinite-recursion bug documented in
--   20260513000000_fix_profiles_recursive_admin_policy.sql.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. active_users_read_own_profile
--    Before: auth.uid() = user_id  (evaluated per row)
--    After:  (SELECT auth.uid()) = user_id  (evaluated once per query)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "active_users_read_own_profile" ON profiles;

CREATE POLICY "active_users_read_own_profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND user_status = 'active'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_read_all_profiles
--    Before: auth.jwt()->'user_metadata'->>'type' = 'admin'   (insecure + per-row)
--            OR auth.role() = 'service_role'                   (per-row)
--    After:  (SELECT auth.jwt()->'app_metadata'->>'type') = 'admin'
--            OR (SELECT auth.role()) = 'service_role'
--
--    Notes:
--    - app_metadata is only writable by service-role / admin, unlike user_metadata.
--    - A profiles-table subquery cannot be used here: this policy IS on profiles,
--      so a self-referencing lookup causes infinite recursion (see migration
--      20260513000000_fix_profiles_recursive_admin_policy.sql for details).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;

CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'type') = 'admin'
    OR (SELECT auth.role()) = 'service_role'
  );
