-- =============================================================================
-- Migration: Create charity_profiles table + RPCs
-- GIV-148: Platform charity profile table (unclaimed → claimed-pending → verified lifecycle)
-- Depends on: charity_organizations table (existing)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create charity_profiles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS charity_profiles (
  id                        UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  ein                       TEXT          NOT NULL UNIQUE,
  name                      TEXT          NOT NULL,
  mission                   TEXT,
  location                  TEXT,
  website                   TEXT,
  logo_url                  TEXT,
  -- Individual photo slots (updated by PhotosCard component via .update({photo_1_url: ...}))
  photo_1_url               TEXT,
  photo_2_url               TEXT,
  -- Array form for bulk reads (kept in sync manually or via trigger if needed)
  photo_urls                TEXT[]        NOT NULL DEFAULT '{}',
  ntee_code                 TEXT,
  founded                   TEXT,
  irs_status                TEXT,
  employees                 INTEGER,
  status                    TEXT          NOT NULL DEFAULT 'unclaimed'
                              CHECK (status IN ('unclaimed', 'claimed-pending', 'verified')),
  nominations_count         INTEGER       NOT NULL DEFAULT 0,
  interested_donors_count   INTEGER       NOT NULL DEFAULT 0,
  authorized_signer_name    TEXT,
  authorized_signer_title   TEXT,
  authorized_signer_email   TEXT,
  authorized_signer_phone   TEXT,
  claimed_by                UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address            TEXT,
  wallet_type               TEXT          CHECK (wallet_type IN ('new_custodial', 'existing_evm')),
  payment_processor         TEXT          CHECK (payment_processor IN ('helcim', 'paypal')),
  claimed_at                TIMESTAMPTZ,
  verified_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE charity_profiles IS
  'Platform-side charity profiles. Mirrors IRS charity_organizations with added '
  'on-platform lifecycle state: unclaimed → claimed-pending → verified. '
  'Created by GIV-148.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_charity_profiles_status
  ON charity_profiles (status);

CREATE INDEX IF NOT EXISTS idx_charity_profiles_claimed_by
  ON charity_profiles (claimed_by);

CREATE INDEX IF NOT EXISTS idx_charity_profiles_verified_logo
  ON charity_profiles (status, logo_url)
  WHERE status = 'verified' AND logo_url IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_charity_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_charity_profiles_updated_at ON charity_profiles;
CREATE TRIGGER trg_charity_profiles_updated_at
  BEFORE UPDATE ON charity_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_set_charity_profiles_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE charity_profiles ENABLE ROW LEVEL SECURITY;

-- Public SELECT: charity data is public
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='charity_profiles' AND policyname='charity_profiles_public_select') THEN
    CREATE POLICY "charity_profiles_public_select" ON charity_profiles
      FOR SELECT USING (true);
  END IF;
END $$;

-- Owner UPDATE: claimed user can update their own profile; service_role unrestricted
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='charity_profiles' AND policyname='charity_profiles_owner_update') THEN
    CREATE POLICY "charity_profiles_owner_update" ON charity_profiles
      FOR UPDATE USING (
        (claimed_by IS NOT NULL AND claimed_by = auth.uid())
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- INSERT restricted to service_role (profiles created via SECURITY DEFINER RPC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='charity_profiles' AND policyname='charity_profiles_service_insert') THEN
    CREATE POLICY "charity_profiles_service_insert" ON charity_profiles
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: get_or_create_charity_profile
--    Called by CharityProfilePage and CharityClaimForm to ensure a profile row exists.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_charity_profile(lookup_ein TEXT)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ein     TEXT;
  v_profile charity_profiles;
  v_org     RECORD;
BEGIN
  v_ein := trim(COALESCE(lookup_ein, ''));

  IF v_ein = '' THEN
    RETURN;
  END IF;

  -- Return existing profile if found
  SELECT * INTO v_profile FROM charity_profiles WHERE ein = v_ein;
  IF FOUND THEN
    RETURN NEXT v_profile;
    RETURN;
  END IF;

  -- Seed name/location from registry (handles hyphenated and plain EINs)
  SELECT co.name, co.ntee_cd, co.city, co.state
  INTO v_org
  FROM charity_organizations co
  WHERE co.ein = v_ein
     OR co.ein = regexp_replace(v_ein, '-', '', 'g')
  LIMIT 1;

  IF NOT FOUND THEN
    -- EIN not in registry — cannot create a profile for unknown organization
    RETURN;
  END IF;

  -- Create new unclaimed profile
  INSERT INTO charity_profiles (ein, name, ntee_code, location, status)
  VALUES (
    v_ein,
    v_org.name,
    v_org.ntee_cd,
    CASE
      WHEN v_org.city IS NOT NULL AND v_org.state IS NOT NULL
        THEN v_org.city || ', ' || v_org.state
      ELSE NULL
    END,
    'unclaimed'
  )
  RETURNING * INTO v_profile;

  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_charity_profile(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_charity_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_charity_profile(TEXT) TO service_role;

COMMENT ON FUNCTION get_or_create_charity_profile IS
  'Returns the charity_profiles row for the given EIN, creating an unclaimed stub '
  'from charity_organizations data if none exists. Returns empty set if EIN is not '
  'in the registry. SECURITY DEFINER — bypasses RLS insert restriction.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: claim_charity_profile
--    Called by CharityClaimForm after user signs up.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_charity_profile(
  p_ein          TEXT,
  p_signer_name  TEXT,
  p_signer_email TEXT,
  p_signer_phone TEXT
)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile charity_profiles;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim a charity profile';
  END IF;

  -- Ensure the profile row exists
  SELECT * INTO v_profile FROM charity_profiles WHERE ein = trim(p_ein);

  IF NOT FOUND THEN
    -- Try to create via get_or_create
    SELECT * INTO v_profile FROM get_or_create_charity_profile(p_ein);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No charity found with EIN %', p_ein;
    END IF;
  END IF;

  IF v_profile.status <> 'unclaimed' THEN
    RAISE EXCEPTION 'Charity profile is already claimed (status: %)', v_profile.status;
  END IF;

  UPDATE charity_profiles SET
    status                  = 'claimed-pending',
    authorized_signer_name  = p_signer_name,
    authorized_signer_email = p_signer_email,
    authorized_signer_phone = p_signer_phone,
    claimed_by              = v_user_id,
    claimed_at              = NOW()
  WHERE ein = trim(p_ein)
  RETURNING * INTO v_profile;

  RETURN NEXT v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION claim_charity_profile(TEXT, TEXT, TEXT, TEXT) IS
  'Transitions a charity profile from unclaimed → claimed-pending and records '
  'the authorized signer. Called after a charity rep signs up. '
  'Requires an authenticated session. SECURITY DEFINER.';
