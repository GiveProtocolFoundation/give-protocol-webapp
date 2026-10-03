-- =============================================================================
-- Migration: Public platform stats for the /browse hero
-- Description: The hero tiles on /browse previously showed hard-coded figures.
--   This function returns real, aggregate-only counts so the page can display
--   them without granting anonymous visitors read access to the underlying
--   tables. No row-level or personal data is exposed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_platform_stats()
RETURNS TABLE (
  verified_organizations BIGINT,
  charitable_sectors     BIGINT,
  verified_volunteer_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM charity_profiles WHERE status = 'verified'),
    (SELECT COUNT(DISTINCT UPPER(LEFT(ntee_code, 1)))
       FROM charity_profiles
      WHERE status = 'verified' AND ntee_code IS NOT NULL AND ntee_code <> ''),
    (SELECT COALESCE(SUM(hours), 0) FROM volunteer_hours WHERE status = 'approved');
$$;

COMMENT ON FUNCTION public.get_public_platform_stats() IS
  'Aggregate-only counts (verified charities, distinct NTEE sectors, approved volunteer hours) for the public /browse hero.';

REVOKE ALL ON FUNCTION public.get_public_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_stats() TO anon, authenticated;
