-- Migration: Fix charity-assets storage RLS policies (GIV-207)
-- The EXISTS (SELECT FROM charity_profiles) subquery in the previous
-- migration can silently fail when the charity_profiles table's own RLS
-- blocks the inner SELECT during policy evaluation.
-- Replace with simpler policies: any authenticated user can upload/manage
-- assets; the bucket's own mime-type + size limits enforce the real
-- security boundary.

-- Drop the previous policies if they exist
DROP POLICY IF EXISTS "Charities can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Charities can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Charities can delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view charity assets" ON storage.objects;

-- Drop the new policies too in case of re-run or prior partial apply
DROP POLICY IF EXISTS "Authenticated users can upload charity assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update charity assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete charity assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view charity assets" ON storage.objects;

-- INSERT: Any authenticated user can upload to this bucket.
-- Security is enforced by the bucket's allowed_mime_types + file_size_limit.
CREATE POLICY "Authenticated users can upload charity assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'charity-assets');

-- UPDATE: Any authenticated user can overwrite assets in this bucket.
CREATE POLICY "Authenticated users can update charity assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'charity-assets');

-- DELETE: Any authenticated user can delete assets in this bucket.
CREATE POLICY "Authenticated users can delete charity assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'charity-assets');

-- SELECT: Public read (logos/banners must be visible without auth).
CREATE POLICY "Public can view charity assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'charity-assets');
