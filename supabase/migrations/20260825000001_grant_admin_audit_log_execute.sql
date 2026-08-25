-- =============================================================================
-- Hotfix: Grant EXECUTE on admin_get_audit_log / insert_admin_audit_entry
--
-- Symptom: The /admin/reports "Audit Trail" subtab shows "Data Load Error":
--   admin_get_audit_log RPC failed: permission denied for function
--   admin_get_audit_log (code: 42501)
--
-- Root cause: 20260411000001_create_admin_audit_infrastructure.sql created
-- admin_get_audit_log and insert_admin_audit_entry without any REVOKE/GRANT
-- statements. Supabase projects default to
-- `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`, so
-- newly created functions are not callable by anyone but the owner unless
-- EXECUTE is explicitly granted. Every sibling admin RPC (get_admin_alerts,
-- get_admin_dashboard_stats, get_admin_recent_activity,
-- insert_admin_audit_read_entry, admin_list_charities, etc.) received an
-- explicit GRANT either in its creation migration or in the
-- 20260712000000_fix_supabase_security_warnings.sql cleanup — these two
-- functions were missed by both.
--
-- Fix: Grant EXECUTE to authenticated + service_role (the internal admin-role
-- guard inside each function already enforces the actual authorization
-- check), matching every other admin RPC's grant pattern.
-- =============================================================================

REVOKE ALL ON FUNCTION public.admin_get_audit_log(
  TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_log(
  TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.insert_admin_audit_entry(
  TEXT, TEXT, UUID, JSONB, JSONB, INET
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_admin_audit_entry(
  TEXT, TEXT, UUID, JSONB, JSONB, INET
) TO authenticated, service_role;
