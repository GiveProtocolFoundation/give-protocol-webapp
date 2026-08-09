-- Fix function_search_path_mutable lint warning on trg_set_profiles_updated_at.
-- This trigger function (added in 20260725000003_add_updated_at_to_profiles.sql)
-- was missed by the earlier search_path hardening pass in
-- 20260712000000_fix_supabase_security_warnings.sql.

CREATE OR REPLACE FUNCTION public.trg_set_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
