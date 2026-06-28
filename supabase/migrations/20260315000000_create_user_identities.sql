-- Migration: create_user_identities table for unified identity orchestration
-- Links Web2 (email) and Web3 (wallet) identities to a single Supabase auth user.

-- Core identity linkage table
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  primary_auth_method TEXT NOT NULL DEFAULT 'email'
    CHECK (primary_auth_method IN ('email', 'wallet')),
  wallet_linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_identity UNIQUE (user_id),
  CONSTRAINT unique_wallet_address UNIQUE (wallet_address)
);

-- Index for fast wallet lookups during wallet-based login
CREATE INDEX IF NOT EXISTS idx_user_identities_wallet
  ON user_identities(wallet_address)
  WHERE wallet_address IS NOT NULL;

-- RLS
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own identity" ON user_identities;
CREATE POLICY "Users can view own identity"
  ON user_identities FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own identity" ON user_identities;
CREATE POLICY "Users can update own identity"
  ON user_identities FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role can insert identities" ON user_identities;
CREATE POLICY "Service role can insert identities"
  ON user_identities FOR INSERT
  WITH CHECK (true);

-- Add role column to profiles if not present
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'donor'
    CHECK (role IN ('donor', 'charity', 'volunteer', 'admin'));

-- Backfill role from existing type column
UPDATE profiles SET role = type WHERE role IS NULL OR role = 'donor';

-- Auto-create user_identities row on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user_identity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_identities (user_id, primary_auth_method)
  VALUES (NEW.id, 'email')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to make migration idempotent
DROP TRIGGER IF EXISTS on_auth_user_created_identity ON auth.users;

CREATE TRIGGER on_auth_user_created_identity
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_identity();

-- Auto-update updated_at on user_identities changes
CREATE OR REPLACE FUNCTION public.update_user_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_identities_updated_at ON user_identities;

CREATE TRIGGER set_user_identities_updated_at
  BEFORE UPDATE ON user_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_user_identities_updated_at();
