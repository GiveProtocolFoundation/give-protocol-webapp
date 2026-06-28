-- Migration: Create charity-assets storage bucket for logo and banner uploads
-- Required by LogoBannerUploadCard (GIV-201) and PhotosCard.
-- Upload path convention: {ein}/{kind}.{ext}  e.g. 99-1230001/logo.png

-- 1. Create the bucket (public so logo/banner URLs can be rendered without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'charity-assets',
  'charity-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS policies
-- Simplified: any authenticated user with a claimed charity_profiles row can
-- upload/update/delete in the charity-assets bucket. The path convention
-- ({ein}/{kind}.{ext}) is enforced by the frontend, not by RLS, to avoid
-- issues with storage.foldername() across Supabase versions.

-- INSERT: Authenticated charity owners can upload
DROP POLICY IF EXISTS "Charities can upload assets" ON storage.objects;
CREATE POLICY "Charities can upload assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'charity-assets'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- UPDATE: Authenticated charity owners can overwrite (upsert)
DROP POLICY IF EXISTS "Charities can update own assets" ON storage.objects;
CREATE POLICY "Charities can update own assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'charity-assets'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- DELETE: Authenticated charity owners can remove assets
DROP POLICY IF EXISTS "Charities can delete own assets" ON storage.objects;
CREATE POLICY "Charities can delete own assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'charity-assets'
  AND EXISTS (
    SELECT 1 FROM charity_profiles
    WHERE charity_profiles.claimed_by = auth.uid()
  )
);

-- SELECT: Public read (bucket is public, logos/banners should be viewable by anyone)
DROP POLICY IF EXISTS "Anyone can view charity assets" ON storage.objects;
CREATE POLICY "Anyone can view charity assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'charity-assets');

-- 3. RPC: repair_claimed_by
-- The charity_profiles_owner_update RLS policy requires claimed_by IS NOT NULL,
-- so the client-side self-repair UPDATE on rows where claimed_by IS NULL will
-- be silently rejected. This SECURITY DEFINER function bypasses RLS.
CREATE OR REPLACE FUNCTION repair_claimed_by(
  p_ein   TEXT,
  p_user  UUID,
  p_email TEXT DEFAULT NULL
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

  -- Only allow the caller to claim for themselves
  IF auth.uid() <> p_user THEN
    RAISE EXCEPTION 'Cannot repair claimed_by for a different user';
  END IF;

  UPDATE charity_profiles
  SET claimed_by = p_user,
      authorized_signer_email = COALESCE(p_email, authorized_signer_email)
  WHERE ein = p_ein
    AND claimed_by IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION repair_claimed_by(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION repair_claimed_by IS
  'Self-repair: sets claimed_by on an unclaimed charity profile. '
  'SECURITY DEFINER to bypass the owner-update RLS policy that requires '
  'claimed_by IS NOT NULL. Only allows the authenticated user to set '
  'claimed_by to their own auth.uid().';
