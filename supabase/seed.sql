-- =============================================================================
-- Give Protocol — Test Charity Seed Data (self-contained)
-- GIV-148: Creates charity_profiles table (if missing) + 12 verified test rows
--
-- USAGE: Paste the entire file into the Supabase SQL Editor and click Run.
--        Safe to re-run: table creation is IF NOT EXISTS; data uses DELETE+INSERT.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Ensure charity_profiles table exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS charity_profiles (
  id                        UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  ein                       TEXT          NOT NULL UNIQUE,
  name                      TEXT          NOT NULL,
  mission                   TEXT,
  location                  TEXT,
  website                   TEXT,
  logo_url                  TEXT,
  photo_1_url               TEXT,
  photo_2_url               TEXT,
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

-- Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_charity_profiles_status
  ON charity_profiles (status);
CREATE INDEX IF NOT EXISTS idx_charity_profiles_claimed_by
  ON charity_profiles (claimed_by);
CREATE INDEX IF NOT EXISTS idx_charity_profiles_verified_logo
  ON charity_profiles (status, logo_url)
  WHERE status = 'verified' AND logo_url IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE charity_profiles ENABLE ROW LEVEL SECURITY;

-- Public read policy (charity data is public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'charity_profiles' AND policyname = 'charity_profiles_public_select'
  ) THEN
    CREATE POLICY "charity_profiles_public_select" ON charity_profiles
      FOR SELECT USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Seed 12 test charities
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- Clean up any previous run of this seed (idempotent)
DELETE FROM charity_organizations WHERE ein LIKE '99-123%' AND country = 'US';
DELETE FROM charity_profiles      WHERE ein LIKE '99-123%';

INSERT INTO charity_profiles (
  id, ein, name, mission, location, website,
  logo_url, photo_1_url, photo_2_url, photo_urls,
  ntee_code, founded, irs_status, employees,
  status, nominations_count, interested_donors_count,
  authorized_signer_name, authorized_signer_title,
  authorized_signer_email, authorized_signer_phone,
  claimed_by, wallet_address, wallet_type, payment_processor,
  claimed_at, verified_at, created_at, updated_at
) VALUES

-- 1. Education / B
(
  'seed0001-0000-0000-0000-000000000001', '99-1230001',
  'Bright Futures Education Fund',
  'Providing scholarships, tutoring programs, and after-school enrichment to underserved youth in New York City — empowering the next generation through quality education and mentorship.',
  'New York, NY', 'https://brightfuturesedu.example.org',
  'https://picsum.photos/seed/bfef2024/400/300',
  'https://picsum.photos/seed/bfef2024a/800/600',
  'https://picsum.photos/seed/bfef2024b/800/600',
  ARRAY['https://picsum.photos/seed/bfef2024a/800/600','https://picsum.photos/seed/bfef2024b/800/600','https://picsum.photos/seed/bfef2024c/800/600'],
  'B70', '1998', 'Active', 45,
  'verified', 312, 1847,
  'Dr. Patricia Holloway', 'Executive Director',
  'pholloway@brightfuturesedu.example.org', '(212) 555-0101',
  NULL, '0x1111111111111111111111111111111111111111', 'existing_evm', 'helcim',
  '2024-03-15T10:00:00Z', '2024-04-01T14:30:00Z', '2024-03-10T08:00:00Z', NOW()
),

-- 2. Health / E
(
  'seed0002-0000-0000-0000-000000000002', '99-1230002',
  'Healing Hearts Health Alliance',
  'Delivering free medical screenings, mental health support, and preventive care to uninsured and underinsured individuals across Maryland — because healthcare is a human right.',
  'Baltimore, MD', 'https://healinghearts.example.org',
  'https://picsum.photos/seed/hhha2024/400/300',
  'https://picsum.photos/seed/hhha2024a/800/600',
  'https://picsum.photos/seed/hhha2024b/800/600',
  ARRAY['https://picsum.photos/seed/hhha2024a/800/600','https://picsum.photos/seed/hhha2024b/800/600','https://picsum.photos/seed/hhha2024c/800/600'],
  'E20', '2005', 'Active', 28,
  'verified', 198, 923,
  'Michael R. Thompson, MD', 'Chief Medical Officer',
  'mthompson@healinghearts.example.org', '(410) 555-0202',
  NULL, '0x2222222222222222222222222222222222222222', 'existing_evm', 'paypal',
  '2024-02-20T09:00:00Z', '2024-03-05T11:00:00Z', '2024-02-15T07:00:00Z', NOW()
),

-- 3. Environment / C
(
  'seed0003-0000-0000-0000-000000000003', '99-1230003',
  'Green Earth Conservation Network',
  'Protecting Pacific Northwest ecosystems through habitat restoration, community education, and advocacy for sustainable land and water use practices that ensure a livable future.',
  'Portland, OR', 'https://greenearthconservation.example.org',
  'https://picsum.photos/seed/gecn2024/400/300',
  'https://picsum.photos/seed/gecn2024a/800/600',
  'https://picsum.photos/seed/gecn2024b/800/600',
  ARRAY['https://picsum.photos/seed/gecn2024a/800/600','https://picsum.photos/seed/gecn2024b/800/600'],
  'C30', '2001', 'Active', 19,
  'verified', 445, 2103,
  'Sarah Chen', 'Executive Director',
  'schen@greenearthconservation.example.org', '(503) 555-0303',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-01-10T08:00:00Z', '2024-01-25T16:00:00Z', '2024-01-05T06:00:00Z', NOW()
),

-- 4. Human Services / P
(
  'seed0004-0000-0000-0000-000000000004', '99-1230004',
  'Families First Human Services',
  'Supporting vulnerable families in central Ohio with emergency assistance, job training, childcare subsidies, and wraparound social services that break the cycle of generational poverty.',
  'Columbus, OH', 'https://familiesfirstohio.example.org',
  'https://picsum.photos/seed/ffhs2024/400/300',
  'https://picsum.photos/seed/ffhs2024a/800/600',
  'https://picsum.photos/seed/ffhs2024b/800/600',
  ARRAY['https://picsum.photos/seed/ffhs2024a/800/600','https://picsum.photos/seed/ffhs2024b/800/600'],
  'P60', '1989', 'Active', 72,
  'verified', 89, 514,
  'Denise Williams', 'President & CEO',
  'dwilliams@familiesfirstohio.example.org', '(614) 555-0404',
  NULL, '0x4444444444444444444444444444444444444444', 'existing_evm', 'helcim',
  '2024-04-02T10:00:00Z', '2024-04-18T09:00:00Z', '2024-03-28T07:00:00Z', NOW()
),

-- 5. Arts & Culture / A
(
  'seed0005-0000-0000-0000-000000000005', '99-1230005',
  'Metropolitan Arts Council',
  'Fostering creative expression and cultural enrichment in Chicago through grants to local artists, free public performances, and arts education in under-resourced schools across the metro area.',
  'Chicago, IL', 'https://metroartscouncil.example.org',
  'https://picsum.photos/seed/mac2024/400/300',
  'https://picsum.photos/seed/mac2024a/800/600',
  'https://picsum.photos/seed/mac2024b/800/600',
  ARRAY['https://picsum.photos/seed/mac2024a/800/600','https://picsum.photos/seed/mac2024b/800/600','https://picsum.photos/seed/mac2024c/800/600'],
  'A23', '1973', 'Active', 34,
  'verified', 267, 1392,
  'James A. Kowalski', 'Executive Director',
  'jkowalski@metroartscouncil.example.org', '(312) 555-0505',
  NULL, NULL, 'new_custodial', 'paypal',
  '2024-03-01T11:00:00Z', '2024-03-20T13:00:00Z', '2024-02-25T08:00:00Z', NOW()
),

-- 6. Food & Nutrition / K
(
  'seed0006-0000-0000-0000-000000000006', '99-1230006',
  'Food Banks United Network',
  'Combating food insecurity across Dallas-Fort Worth by distributing over 2 million meals annually, operating mobile pantries, and advocating for policy changes to permanently end hunger.',
  'Dallas, TX', 'https://foodbanksunited.example.org',
  'https://picsum.photos/seed/fbun2024/400/300',
  'https://picsum.photos/seed/fbun2024a/800/600',
  'https://picsum.photos/seed/fbun2024b/800/600',
  ARRAY['https://picsum.photos/seed/fbun2024a/800/600','https://picsum.photos/seed/fbun2024b/800/600'],
  'K31', '2010', 'Active', 52,
  'verified', 521, 3241,
  'Angela Martinez', 'Director of Operations',
  'amartinez@foodbanksunited.example.org', '(214) 555-0606',
  NULL, '0x6666666666666666666666666666666666666666', 'existing_evm', 'helcim',
  '2024-02-10T10:00:00Z', '2024-02-28T12:00:00Z', '2024-02-05T07:00:00Z', NOW()
),

-- 7. Youth Development / O
(
  'seed0007-0000-0000-0000-000000000007', '99-1230007',
  'Youth Leaders Tomorrow Foundation',
  'Building the next generation of civic leaders through mentorship programs, leadership camps, and college preparation workshops for high school students across the Denver metro area.',
  'Denver, CO', 'https://youthleaderstomorrow.example.org',
  'https://picsum.photos/seed/yltf2024/400/300',
  'https://picsum.photos/seed/yltf2024a/800/600',
  'https://picsum.photos/seed/yltf2024b/800/600',
  ARRAY['https://picsum.photos/seed/yltf2024a/800/600','https://picsum.photos/seed/yltf2024b/800/600'],
  'O50', '2015', 'Active', 11,
  'verified', 134, 678,
  'Marcus Johnson', 'Founder & Executive Director',
  'mjohnson@youthleaderstomorrow.example.org', '(720) 555-0707',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-03-20T09:00:00Z', '2024-04-05T15:00:00Z', '2024-03-15T06:00:00Z', NOW()
),

-- 8. Animal Welfare / D
(
  'seed0008-0000-0000-0000-000000000008', '99-1230008',
  'Paws & Claws Animal Rescue',
  'Rescuing abandoned and abused animals in Central Texas, providing veterinary care, rehabilitation, and permanent loving homes through a network of over 300 dedicated foster families.',
  'Austin, TX', 'https://pawsandclawsrescue.example.org',
  'https://picsum.photos/seed/pacr2024/400/300',
  'https://picsum.photos/seed/pacr2024a/800/600',
  'https://picsum.photos/seed/pacr2024b/800/600',
  ARRAY['https://picsum.photos/seed/pacr2024a/800/600','https://picsum.photos/seed/pacr2024b/800/600','https://picsum.photos/seed/pacr2024c/800/600'],
  'D20', '2008', 'Active', 16,
  'verified', 389, 2087,
  'Lisa Nguyen', 'Rescue Director',
  'lnguyen@pawsandclawsrescue.example.org', '(512) 555-0808',
  NULL, '0x8888888888888888888888888888888888888888', 'existing_evm', 'paypal',
  '2024-01-25T10:00:00Z', '2024-02-12T14:00:00Z', '2024-01-20T07:00:00Z', NOW()
),

-- 9. International / Q
(
  'seed0009-0000-0000-0000-000000000009', '99-1230009',
  'Global Mission International',
  'Delivering humanitarian aid, clean water projects, and sustainable agriculture training to communities in 18 countries — partnering with local organizations to create lasting, self-sufficient change.',
  'Miami, FL', 'https://globalmissionintl.example.org',
  'https://picsum.photos/seed/gmi2024/400/300',
  'https://picsum.photos/seed/gmi2024a/800/600',
  'https://picsum.photos/seed/gmi2024b/800/600',
  ARRAY['https://picsum.photos/seed/gmi2024a/800/600','https://picsum.photos/seed/gmi2024b/800/600'],
  'Q33', '1995', 'Active', 38,
  'verified', 712, 4506,
  'Rev. Emmanuel Okafor', 'President',
  'eokafor@globalmissionintl.example.org', '(305) 555-0909',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-04-10T08:00:00Z', '2024-04-22T10:00:00Z', '2024-04-05T06:00:00Z', NOW()
),

-- 10. Housing / L
(
  'seed0010-0000-0000-0000-000000000010', '99-1230010',
  'Shelter & Hope Housing Initiative',
  'Addressing the homelessness crisis in Seattle by providing transitional housing, case management, and workforce development programs that move people from the streets to stable, permanent homes.',
  'Seattle, WA', 'https://shelterandhope.example.org',
  'https://picsum.photos/seed/sahi2024/400/300',
  'https://picsum.photos/seed/sahi2024a/800/600',
  'https://picsum.photos/seed/sahi2024b/800/600',
  ARRAY['https://picsum.photos/seed/sahi2024a/800/600','https://picsum.photos/seed/sahi2024b/800/600'],
  'L21', '2003', 'Active', 61,
  'verified', 156, 891,
  'Rebecca Torres', 'CEO',
  'rtorres@shelterandhope.example.org', '(206) 555-1010',
  NULL, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'existing_evm', 'helcim',
  '2024-02-01T09:00:00Z', '2024-02-18T11:00:00Z', '2024-01-27T07:00:00Z', NOW()
),

-- 11. Community Development / S
(
  'seed0011-0000-0000-0000-000000000011', '99-1230011',
  'Neighborworks Community Development',
  'Revitalizing Phoenix neighborhoods through affordable housing construction, small business grants, resident leadership training, and community land trust stewardship for long-term stability.',
  'Phoenix, AZ', 'https://neighborworkspx.example.org',
  'https://picsum.photos/seed/nwcd2024/400/300',
  'https://picsum.photos/seed/nwcd2024a/800/600',
  'https://picsum.photos/seed/nwcd2024b/800/600',
  ARRAY['https://picsum.photos/seed/nwcd2024a/800/600','https://picsum.photos/seed/nwcd2024b/800/600','https://picsum.photos/seed/nwcd2024c/800/600'],
  'S20', '2000', 'Active', 29,
  'verified', 203, 1124,
  'Carlos Mendez', 'Executive Director',
  'cmendez@neighborworkspx.example.org', '(602) 555-1111',
  NULL, NULL, 'new_custodial', 'paypal',
  '2024-03-08T10:00:00Z', '2024-03-25T16:00:00Z', '2024-03-03T08:00:00Z', NOW()
),

-- 12. Mental Health / F
(
  'seed0012-0000-0000-0000-000000000012', '99-1230012',
  'Mental Wellness Support Network',
  'Reducing the stigma of mental illness in Greater Boston through peer support groups, crisis counseling hotlines, and community training programs that build lasting mental health resilience.',
  'Boston, MA', 'https://mentalwellnessnetwork.example.org',
  'https://picsum.photos/seed/mwsn2024/400/300',
  'https://picsum.photos/seed/mwsn2024a/800/600',
  'https://picsum.photos/seed/mwsn2024b/800/600',
  ARRAY['https://picsum.photos/seed/mwsn2024a/800/600','https://picsum.photos/seed/mwsn2024b/800/600'],
  'F32', '2012', 'Active', 23,
  'verified', 441, 2756,
  'Dr. Aisha Patel', 'Clinical Director',
  'apatel@mentalwellnessnetwork.example.org', '(617) 555-1212',
  NULL, '0xcccccccccccccccccccccccccccccccccccccccc', 'existing_evm', 'helcim',
  '2024-04-15T10:00:00Z', '2024-04-25T12:00:00Z', '2024-04-10T07:00:00Z', NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Insert matching charity_organizations registry rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO charity_organizations (
  ein, name, city, state, zip,
  ntee_cd, deductibility, is_on_platform, platform_charity_id,
  country, registry_source, data_source, data_vintage, last_synced_at
)
SELECT
  cp.ein,
  cp.name,
  split_part(cp.location, ', ', 1)  AS city,
  split_part(cp.location, ', ', 2)  AS state,
  '00000'                            AS zip,
  cp.ntee_code                       AS ntee_cd,
  'PC'                               AS deductibility,
  true                               AS is_on_platform,
  cp.id::text                        AS platform_charity_id,
  'US'                               AS country,
  'IRS_BMF'                          AS registry_source,
  'irs'                              AS data_source,
  '2024-01-01'::date                 AS data_vintage,
  NOW()                              AS last_synced_at
FROM charity_profiles cp
WHERE cp.ein LIKE '99-123%';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify (run separately after the above succeeds)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT ein, name, status, logo_url IS NOT NULL AS has_logo, ntee_code
-- FROM charity_profiles
-- WHERE ein LIKE '99-123%'
-- ORDER BY ein;
