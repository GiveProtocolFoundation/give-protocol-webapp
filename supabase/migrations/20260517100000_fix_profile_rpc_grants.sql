-- GIV-234: Fix charity profile RPCs inaccessible via PostgREST
--
-- Root cause: MISSING EXECUTE GRANTS (same pattern as GIV-233)
--   Newer Supabase instances revoke the default PostgreSQL PUBLIC EXECUTE
--   privilege on functions. CharityProfilePage calls two RPCs that were
--   created with GRANT statements in their original migrations, but those
--   grants were revoked by the Supabase instance, making the functions
--   inaccessible via PostgREST for anon/authenticated users.
--
--   The TypeScript service functions catch the resulting permission-denied
--   errors and return null. Both lookups returning null triggers
--   setNotFound(true) in CharityProfilePage, displaying
--   "We couldn't find a charity with this EIN." for every charity.
--
-- Affected functions:
--   A. get_charity_record_by_ein(TEXT)
--      — created in 20260412000000_add_charity_record_lookup_rpc.sql
--   B. get_or_create_charity_profile(TEXT)
--      — created in 20260425000000_create_charity_profiles.sql
--
-- Fix: re-grant EXECUTE to anon, authenticated, service_role.
--      GRANT EXECUTE is idempotent — safe to run on instances that already
--      have the grant (no-op) and on instances where the grant was revoked.
--
-- Also updates get_or_create_charity_profile to handle the reverse EIN
-- format case: plain-digit input (e.g. '991230001') against a hyphenated
-- DB value (e.g. '99-1230001'). The original WHERE clause only stripped
-- hyphens from the input; this version also checks the hyphenated form of
-- a plain-digit input so all four format combinations are covered:
--   input hyphenated + DB hyphenated  → condition 1 matches
--   input hyphenated + DB plain       → condition 2 matches (regex strips input)
--   input plain      + DB plain       → condition 1 matches
--   input plain      + DB hyphenated  → condition 3 matches (new: adds hyphen to input)

-- ─────────────────────────────────────────────────────────────────────────────
-- A. get_charity_record_by_ein — re-grant EXECUTE
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_charity_record_by_ein(TEXT)
  TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- B. get_or_create_charity_profile — recreate with robust EIN matching,
--    then re-grant EXECUTE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_charity_profile(lookup_ein TEXT)
RETURNS SETOF charity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ein        TEXT;
  v_digits     TEXT;
  v_hyphenated TEXT;
  v_profile    charity_profiles;
  v_org        RECORD;
BEGIN
  v_ein := trim(COALESCE(lookup_ein, ''));

  IF v_ein = '' THEN
    RETURN;
  END IF;

  -- Precompute both normalised forms for reuse in WHERE clauses.
  -- v_digits:     strips all non-digit characters  (e.g. '991230001')
  -- v_hyphenated: standard US EIN format XX-XXXXXXX (e.g. '99-1230001')
  v_digits     := regexp_replace(v_ein, '[^0-9]', '', 'g');
  v_hyphenated := CASE
    WHEN v_digits ~ '^[0-9]{9}$'
      THEN substring(v_digits, 1, 2) || '-' || substring(v_digits, 3)
    ELSE v_ein
  END;

  -- Return existing profile if found (check all three representations).
  SELECT * INTO v_profile
  FROM charity_profiles
  WHERE ein = v_ein
     OR ein = v_digits
     OR ein = v_hyphenated
  LIMIT 1;

  IF FOUND THEN
    RETURN NEXT v_profile;
    RETURN;
  END IF;

  -- Seed name/location from registry (handles all four EIN format combinations).
  SELECT co.name, co.ntee_cd, co.city, co.state
  INTO v_org
  FROM charity_organizations co
  WHERE co.ein = v_ein
     OR co.ein = v_digits
     OR co.ein = v_hyphenated
  LIMIT 1;

  IF NOT FOUND THEN
    -- EIN not in registry — cannot create a profile for unknown organization.
    RETURN;
  END IF;

  -- Create new unclaimed profile using the canonical EIN from the registry.
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

GRANT EXECUTE ON FUNCTION get_or_create_charity_profile(TEXT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION get_or_create_charity_profile(TEXT) IS
  'Fetches or creates an unclaimed charity_profiles row by EIN. '
  'Handles all EIN format combinations (hyphenated/plain in input and DB). '
  'SECURITY DEFINER to bypass RLS. '
  'GIV-234: re-granted EXECUTE (Supabase revokes PUBLIC EXECUTE on newer instances) '
  'and hardened EIN matching to cover plain-input + hyphenated-DB case.';
