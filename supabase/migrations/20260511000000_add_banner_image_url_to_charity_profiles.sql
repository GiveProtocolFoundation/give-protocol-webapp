-- =============================================================================
-- Migration: Add banner_image_url to charity_profiles
-- GIV-202: LogoBannerUploadCard integration requires banner column
-- =============================================================================

ALTER TABLE charity_profiles
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

COMMENT ON COLUMN charity_profiles.banner_image_url IS
  'Public URL of the charity banner image stored in the charity-assets bucket. '
  'Added by GIV-202 for the LogoBannerUploadCard feature.';
