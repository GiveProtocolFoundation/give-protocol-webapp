-- =============================================================================
-- GIV-721 Hotfix: Fix admin_list_charities 42804 type mismatch + missing
-- charity_verifications.updated_at column
--
-- Root cause 1 (42804 datatype_mismatch):
--   The profiles table was created before migration files were written, so its
--   timestamp columns may be TIMESTAMP (without timezone) rather than TIMESTAMPTZ.
--   admin_list_charities RETURNS TABLE declares `created_at TIMESTAMPTZ` and
--   `updated_at TIMESTAMPTZ`, but when the inner SELECT returns TIMESTAMP values,
--   PostgreSQL PL/pgSQL raises 42804 ("structure of query does not match function
--   result type") because RETURN QUERY does not apply implicit casts.
--
-- Root cause 2 (admin_update_charity_status failure):
--   admin_update_charity_status executes `updated_at = NOW()` but
--   charity_verifications.updated_at was never created (CREATE TABLE IF NOT EXISTS
--   in 20260606100000 was a no-op because the table already existed). Migration
--   20260725000002 added only review_notes and reviewed_at, not updated_at.
--
-- Fix:
--   1. Add charity_verifications.updated_at IF NOT EXISTS (TEXT columns already
--      added by 20260725000002).
--   2. Recreate admin_list_charities with explicit ::TIMESTAMPTZ casts on all
--      timestamp columns sourced from profiles. This resolves 42804 regardless
--      of the actual underlying column storage type.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add missing updated_at to charity_verifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.charity_verifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.charity_verifications.updated_at IS
  'Timestamp of last update to this verification row. Added by GIV-721 hotfix '
  'migration 20260725000004; backfilled to created_at for pre-existing rows.';

-- Backfill existing rows
UPDATE public.charity_verifications
SET updated_at = created_at
WHERE updated_at = NOW() AND created_at < NOW() - INTERVAL '1 minute';

-- ---------------------------------------------------------------------------
-- 2. Recreate admin_list_charities with explicit TIMESTAMPTZ casts
--    to fix 42804 when profiles.created_at / profiles.updated_at are stored
--    as TIMESTAMP (without timezone) rather than TIMESTAMPTZ.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_list_charities(
  p_status        TEXT        DEFAULT NULL,
  p_category      TEXT        DEFAULT NULL,
  p_search        TEXT        DEFAULT NULL,
  p_page          INT         DEFAULT 1,
  p_limit         INT         DEFAULT 50
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  name                TEXT,
  category            TEXT,
  logo_url            TEXT,
  mission             TEXT,
  verification_id     UUID,
  verification_status TEXT,
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,
  wallet_address      TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  total_count         BIGINT,
  ein                 TEXT,
  signer_name         TEXT,
  signer_email        TEXT,
  signer_phone        TEXT,
  claimed_at          TIMESTAMPTZ,
  charity_profile_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.user_id,
      p.name,
      (p.meta ->> 'category')::TEXT              AS category,
      (p.meta ->> 'logoUrl')::TEXT               AS logo_url,
      (p.meta ->> 'mission')::TEXT               AS mission,
      cv.id                                       AS verification_id,
      COALESCE(cv.status, 'pending')::TEXT        AS verification_status,
      cv.review_notes,
      cv.reviewed_at::TIMESTAMPTZ                 AS reviewed_at,
      (p.meta ->> 'walletAddress')::TEXT          AS wallet_address,
      p.created_at::TIMESTAMPTZ                   AS created_at,
      p.updated_at::TIMESTAMPTZ                   AS updated_at,
      cp.ein,
      cp.authorized_signer_name                   AS signer_name,
      cp.authorized_signer_email                  AS signer_email,
      cp.authorized_signer_phone                  AS signer_phone,
      cp.claimed_at::TIMESTAMPTZ                  AS claimed_at,
      cp.status                                   AS charity_profile_status
    FROM profiles p
    LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
    LEFT JOIN charity_profiles cp ON cp.claimed_by = p.user_id
    WHERE p.type = 'charity'
      AND (p_status   IS NULL OR COALESCE(cv.status, 'pending') = p_status)
      AND (p_category IS NULL OR (p.meta ->> 'category') = p_category)
      AND (p_search   IS NULL OR p.name ILIKE '%' || p_search || '%'
           OR cp.ein ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.user_id,
    f.name,
    f.category,
    f.logo_url,
    f.mission,
    f.verification_id,
    f.verification_status,
    f.review_notes,
    f.reviewed_at,
    f.wallet_address,
    f.created_at,
    f.updated_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count,
    f.ein,
    f.signer_name,
    f.signer_email,
    f.signer_phone,
    f.claimed_at,
    f.charity_profile_status
  FROM filtered f
  ORDER BY
    CASE f.verification_status
      WHEN 'pending'   THEN 1
      WHEN 'verified'  THEN 2
      WHEN 'approved'  THEN 2
      WHEN 'suspended' THEN 3
      WHEN 'rejected'  THEN 4
      ELSE 5
    END,
    f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_charities IS
  'Returns a paginated, filtered list of charity profiles with verification '
  'status and EIN/signer details for admin review. Pending charities are sorted '
  'first. All timestamp columns are cast to TIMESTAMPTZ to prevent 42804 when '
  'the profiles table stores timestamps without timezone. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION admin_list_charities(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_charities(text, text, text, integer, integer) TO authenticated, service_role;
