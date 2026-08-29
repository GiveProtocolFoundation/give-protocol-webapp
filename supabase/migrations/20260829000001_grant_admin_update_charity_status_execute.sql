-- =============================================================================
-- GIV-932 Hotfix: Grant EXECUTE on admin_update_charity_status RPC
--
-- Symptom: The Approve / Reject / Suspend / Reinstate buttons on
--   /admin/charities do nothing. The admin_update_charity_status RPC fails
--   with "permission denied for function admin_update_charity_status
--   (code: 42501)".
--
-- Root cause: admin_update_charity_status was created in
--   20260411000002_admin_charity_management.sql and recreated in
--   20260606100000_fix_charity_verification_pipeline.sql, but neither
--   migration (nor 20260712000000_fix_supabase_security_warnings.sql, nor
--   20260725000004) ever granted EXECUTE to authenticated. Supabase projects
--   default to `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM
--   PUBLIC`, so the function is callable only by its owner. This is the same
--   gap fixed for admin_get_audit_log / insert_admin_audit_entry in
--   20260825000001 (GIV-935).
--
-- Fix: Grant EXECUTE to authenticated + service_role, matching every other
--   admin RPC's revoke/grant pattern. Authorization is still enforced by the
--   internal is_admin_user() guard inside the function.
-- =============================================================================

REVOKE ALL ON FUNCTION public.admin_update_charity_status(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_charity_status(UUID, TEXT, TEXT)
  TO authenticated, service_role;
