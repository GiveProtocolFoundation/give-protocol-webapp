-- GIV-453: Add age-affirmation timestamp to profiles table
-- Nullable column — legacy rows stay NULL until user affirms.
-- The trigger writes now() server-side when signup metadata includes
-- ageAffirmed = true.  Client timestamps are never trusted.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age_affirmed_at timestamptz;

COMMENT ON COLUMN profiles.age_affirmed_at
  IS 'UTC timestamp when user affirmed age >= 16 (GDPR Art. 8). NULL = not yet affirmed.';

-- Update the auto-create-profile trigger to persist the affirmation
-- when the signup payload includes ageAffirmed = true.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, type, age_affirmed_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'type', 'donor'),
    CASE
      WHEN NEW.raw_user_meta_data->>'ageAffirmed' = 'true' THEN now()
      ELSE NULL
    END
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
