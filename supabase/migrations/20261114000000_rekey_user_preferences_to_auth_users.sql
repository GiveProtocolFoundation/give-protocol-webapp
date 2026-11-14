-- Migration: Re-key user_preferences.user_id to auth.users(id)
--
-- Problem: user_preferences.user_id had a foreign key to profiles(id), but its
-- RLS policy ("Users can manage own preferences") requires user_id = auth.uid().
-- profiles.id is never equal to profiles.user_id, so no user could ever insert
-- a preferences row and nobody could opt out of public leaderboards. The GDPR
-- export and erasure paths already treat user_preferences.user_id as the auth
-- user id, so auth.users(id) is the key the rest of the system expects.
--
-- Donations are keyed by profiles.id (donor_id) while volunteer hours are keyed
-- by auth.users.id (volunteer_id). user_allows_public_visibility() therefore
-- resolves a profile id to its auth user id before looking up preferences, so
-- it works for both callers.

-- 1. Convert any existing rows keyed by profile id to the owning auth user id.
--    Rows that would collide with an existing auth-keyed row are dropped; the
--    auth-keyed row is the one the owner can actually manage.
DELETE FROM public.user_preferences up
USING public.profiles p
WHERE up.user_id = p.id
  AND EXISTS (
    SELECT 1 FROM public.user_preferences other
    WHERE other.user_id = p.user_id
  );

UPDATE public.user_preferences up
SET user_id = p.user_id
FROM public.profiles p
WHERE up.user_id = p.id;

-- 2. Swap the foreign key.
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Resolve profile ids to auth user ids in the visibility check.
CREATE OR REPLACE FUNCTION public.user_allows_public_visibility(
  p_user_id uuid,
  p_field text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        COALESCE((up.privacy_settings->>'publicProfile')::boolean, true)
        AND COALESCE((up.privacy_settings->>p_field)::boolean, true)
      FROM user_preferences up
      WHERE up.user_id = COALESCE(
        (SELECT p.user_id FROM profiles p WHERE p.id = p_user_id LIMIT 1),
        p_user_id
      )
      LIMIT 1
    ),
    true  -- No preferences row = default public
  );
$$;

COMMENT ON FUNCTION public.user_allows_public_visibility(uuid, text) IS
  'Checks if a user allows public visibility for a given privacy field. '
  'Accepts either an auth user id or a profiles.id (resolved to its auth user id). '
  'Used by RLS policies and application-level privacy filtering.';
