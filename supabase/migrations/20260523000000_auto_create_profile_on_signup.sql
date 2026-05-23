-- =============================================================================
-- Auto-create profiles row on new user sign-up via SECURITY DEFINER trigger
-- =============================================================================
-- When email confirmation is enabled, supabase.auth.signUp() returns a null
-- session.  Any subsequent client-side INSERT to the profiles table runs as
-- the anon role, which fails the RLS policy
--   "Users can insert own profile": USING ((SELECT auth.uid()) = user_id)
-- because auth.uid() is null for the unauthenticated anon request → 401.
--
-- Fix: create a SECURITY DEFINER trigger that fires AFTER INSERT ON auth.users
-- and inserts the profile row server-side, bypassing RLS entirely.
-- The type is read from raw_user_meta_data->>'type', defaulting to 'donor'.
-- ON CONFLICT DO NOTHING makes the trigger idempotent in case of retries.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'type', 'donor')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
