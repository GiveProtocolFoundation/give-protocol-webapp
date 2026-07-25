-- =============================================================================
-- GIV-721 Hotfix: Add missing updated_at column to profiles table
--
-- Root cause:
--   The profiles table was created in Supabase before the migration files in
--   this repo were written. It was created without an updated_at column.
--   admin_list_charities (20260606100000) and the seed migration
--   (20260725000001) both reference profiles.updated_at, causing error 42703:
--   "column p.updated_at does not exist" on /admin/charities.
--
-- Fix:
--   Add updated_at with IF NOT EXISTS (safe on fresh installs that already
--   have the column) and backfill existing rows from created_at.
--   Also add a trigger to keep updated_at current going forward.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill existing rows: set updated_at = created_at as best approximation
UPDATE public.profiles
SET updated_at = created_at
WHERE updated_at = NOW() AND created_at < NOW() - INTERVAL '1 minute';

COMMENT ON COLUMN public.profiles.updated_at IS
  'Timestamp of the last update to this profile row. Added by GIV-721 hotfix '
  'migration; backfilled from created_at for pre-existing rows.';

-- Trigger to auto-maintain updated_at on every row update
CREATE OR REPLACE FUNCTION public.trg_set_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_profiles_updated_at();
