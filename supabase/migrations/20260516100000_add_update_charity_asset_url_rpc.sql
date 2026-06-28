-- Migration: Add RPC for updating charity profile asset URLs (GIV-207)
-- The charity_profiles_owner_update RLS policy can silently reject
-- client-side UPDATEs (PostgREST returns 200 with 0 rows affected).
-- This SECURITY DEFINER function ensures the logo_url/banner_image_url
-- update always persists when called by the profile owner.

CREATE OR REPLACE FUNCTION update_charity_asset_url(
  p_ein    TEXT,
  p_column TEXT,
  p_url    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Only allow the profile owner to update
  IF NOT EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE ein = p_ein AND claimed_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not the owner of this charity profile';
  END IF;

  -- Only allow known asset columns
  IF p_column NOT IN ('logo_url', 'banner_image_url') THEN
    RAISE EXCEPTION 'Invalid column: %', p_column;
  END IF;

  IF p_column = 'logo_url' THEN
    UPDATE charity_profiles SET logo_url = p_url WHERE ein = p_ein;
  ELSE
    UPDATE charity_profiles SET banner_image_url = p_url WHERE ein = p_ein;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_charity_asset_url(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_charity_asset_url IS
  'Updates logo_url or banner_image_url on a charity profile. '
  'SECURITY DEFINER to bypass RLS (PostgREST can silently return 0 rows '
  'when the owner-update policy evaluation fails in certain contexts). '
  'Only the profile owner (claimed_by = auth.uid()) can call this.';
