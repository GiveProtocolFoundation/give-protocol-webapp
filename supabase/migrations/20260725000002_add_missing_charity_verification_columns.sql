-- =============================================================================
-- GIV-721 Hotfix: Add missing columns to charity_verifications table
--
-- Root cause:
--   The charity_verifications table was created in Supabase before the
--   20260606100000_fix_charity_verification_pipeline.sql migration was written.
--   That migration used CREATE TABLE IF NOT EXISTS — a no-op since the table
--   already existed — so the review_notes and reviewed_at columns were never
--   added. RPCs that reference cv.review_notes (admin_list_charities,
--   get_charity_verification_status, admin_update_charity_status) all fail
--   with error 42703: column cv.review_notes does not exist.
--
-- Fix:
--   Add the two missing columns with IF NOT EXISTS so this migration is safe
--   to run against both databases that already have the columns (fresh installs)
--   and those that don't (the production database).
-- =============================================================================

ALTER TABLE public.charity_verifications
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.charity_verifications.review_notes IS
  'Admin notes recorded when approving, rejecting, or suspending a charity. '
  'NULL for pending verifications. GIV-721.';

COMMENT ON COLUMN public.charity_verifications.reviewed_at IS
  'Timestamp when an admin last changed the verification status. '
  'NULL for verifications that have never been actioned. GIV-721.';
