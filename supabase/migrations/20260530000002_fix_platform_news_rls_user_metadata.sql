-- =============================================================================
-- Migration: Fix platform_news RLS policies — remove user_metadata references
-- Issue: GIV-279 follow-up / Supabase advisor lint "RLS references user metadata"
-- Description: user_metadata is end-user editable and must never appear in a
--   security policy. Replace all four admin policies with a profiles table
--   lookup, consistent with the rest of the codebase.
-- =============================================================================

-- Drop the four insecure policies
DROP POLICY IF EXISTS platform_news_admin_insert    ON platform_news;
DROP POLICY IF EXISTS platform_news_admin_update    ON platform_news;
DROP POLICY IF EXISTS platform_news_admin_delete    ON platform_news;
DROP POLICY IF EXISTS platform_news_admin_read_all  ON platform_news;

-- Admin insert
CREATE POLICY platform_news_admin_insert ON platform_news
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
        AND type = 'admin'
    )
  );

-- Admin update
CREATE POLICY platform_news_admin_update ON platform_news
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
        AND type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
        AND type = 'admin'
    )
  );

-- Admin delete
CREATE POLICY platform_news_admin_delete ON platform_news
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
        AND type = 'admin'
    )
  );

-- Admin select (includes inactive items)
CREATE POLICY platform_news_admin_read_all ON platform_news
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
        AND type = 'admin'
    )
  );
