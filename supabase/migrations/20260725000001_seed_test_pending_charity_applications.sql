-- =============================================================================
-- GIV-721 Follow-up: Seed 2 test pending charity applications for admin review
--
-- Purpose:
--   Creates 2 realistic pending charity applications so the board admin can
--   exercise the approve/reject/suspend workflow end-to-end. Charity 1 has been
--   sitting > 3 days (GIV-721 "high priority") and charity 2 is newer (medium).
--
-- Safety:
--   All inserts are ON CONFLICT DO NOTHING — idempotent to re-runs and to the
--   case where the accounts were already created via a prior migration run.
--   EINs use the 88-xxxx prefix which IRS never issues, making it clear these
--   are test fixtures.  Auth emails use the @test.giveprotocol.io domain which
--   is not a live inbox.
--
-- To remove test data after testing:
--   DELETE FROM charity_verifications WHERE charity_id IN (
--     '00000000-feed-a001-0000-000000000001',
--     '00000000-feed-a002-0000-000000000001'
--   );
--   DELETE FROM charity_profiles WHERE ein IN ('88-0001001','88-0002001');
--   DELETE FROM profiles WHERE id IN (
--     '00000000-feed-a001-0000-000000000001',
--     '00000000-feed-a002-0000-000000000001'
--   );
--   DELETE FROM auth.users WHERE id IN (
--     '00000000-feed-b001-0000-000000000001',
--     '00000000-feed-b002-0000-000000000001'
--   );
-- =============================================================================

-- Deterministic UUIDs (hex-only) for idempotency
DO $$
DECLARE
  v_user_id_1    UUID := '00000000-feed-b001-0000-000000000001'::UUID;
  v_user_id_2    UUID := '00000000-feed-b002-0000-000000000001'::UUID;
  v_profile_id_1 UUID := '00000000-feed-a001-0000-000000000001'::UUID;
  v_profile_id_2 UUID := '00000000-feed-a002-0000-000000000001'::UUID;
BEGIN

  -- ─────────────────────────────────────────────────────────────────────────
  -- Test Charity 1: Green Earth Alliance
  -- Submitted 6 days ago → severity "high" under GIV-721 3-day rule
  -- ─────────────────────────────────────────────────────────────────────────

  -- Auth user (email only; password is a bcrypt placeholder, not usable to sign in)
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_user_id_1,
    '00000000-0000-0000-0000-000000000000'::UUID,
    'authenticated', 'authenticated',
    'test-greenearthalliance@test.giveprotocol.io',
    crypt('test-seed-placeholder', gen_salt('bf', 4)),
    NOW() - INTERVAL '6 days',
    '{"type": "charity"}'::JSONB,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Profiles row (the generic user profile, type='charity')
  INSERT INTO profiles (id, user_id, name, type, created_at, updated_at)
  VALUES (
    v_profile_id_1,
    v_user_id_1,
    'Green Earth Alliance',
    'charity',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Charity profile (IRS/claim data with signer details for admin review)
  INSERT INTO charity_profiles (
    ein, name, mission, location, status,
    authorized_signer_name, authorized_signer_email, authorized_signer_phone,
    claimed_by, claimed_at, created_at, updated_at
  ) VALUES (
    '88-0001001',
    'Green Earth Alliance',
    'Environmental conservation and reforestation through community action, urban greening, and biodiversity education programs across the Pacific Northwest.',
    'Portland, OR',
    'claimed-pending',
    'Maria Santos',
    'msantos@greenearthalliance.org',
    '503-555-0101',
    v_user_id_1,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  )
  ON CONFLICT (ein) DO NOTHING;

  -- Pending verification row (created_at = 6 days ago → GIV-721 high priority)
  INSERT INTO charity_verifications (charity_id, status, created_at, updated_at)
  VALUES (
    v_profile_id_1,
    'pending',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  )
  ON CONFLICT DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Test Charity 2: Solar Aid Foundation
  -- Submitted 2 days ago → severity "medium" (under the 3-day threshold)
  -- ─────────────────────────────────────────────────────────────────────────

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_user_id_2,
    '00000000-0000-0000-0000-000000000000'::UUID,
    'authenticated', 'authenticated',
    'test-solaraidfoundation@test.giveprotocol.io',
    crypt('test-seed-placeholder', gen_salt('bf', 4)),
    NOW() - INTERVAL '2 days',
    '{"type": "charity"}'::JSONB,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, user_id, name, type, created_at, updated_at)
  VALUES (
    v_profile_id_2,
    v_user_id_2,
    'Solar Aid Foundation',
    'charity',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO charity_profiles (
    ein, name, mission, location, status,
    authorized_signer_name, authorized_signer_email, authorized_signer_phone,
    claimed_by, claimed_at, created_at, updated_at
  ) VALUES (
    '88-0002001',
    'Solar Aid Foundation',
    'Bringing solar-powered clean energy to off-grid communities in rural sub-Saharan Africa, improving health outcomes and enabling economic opportunity.',
    'San Francisco, CA',
    'claimed-pending',
    'David Chen',
    'dchen@solaraidfoundation.org',
    '415-555-0202',
    v_user_id_2,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (ein) DO NOTHING;

  INSERT INTO charity_verifications (charity_id, status, created_at, updated_at)
  VALUES (
    v_profile_id_2,
    'pending',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT DO NOTHING;

END;
$$;
