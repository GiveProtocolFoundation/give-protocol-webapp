-- =============================================================================
-- Migration: Remove broad SELECT policy from public charity-assets bucket
-- Supabase advisor lint 0025 (public_bucket_allows_listing)
-- Description: The bucket is already public, so direct public URL access works
--   without an RLS SELECT policy. The policy only grants unauthenticated bucket
--   enumeration (listing all object names), which is not needed — the app
--   always accesses assets via known URLs, never via storage.list().
-- =============================================================================

DROP POLICY IF EXISTS "Public can view charity assets" ON storage.objects;
