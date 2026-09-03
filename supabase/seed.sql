-- =============================================================================
-- Give Protocol — Test Charity Seed Data (self-contained)
-- GIV-148: Creates charity_profiles table (if missing) + 12 verified test rows
--
-- USAGE: Paste the entire file into the Supabase SQL Editor and click Run.
--        Safe to re-run: table creation is IF NOT EXISTS; data uses DELETE+INSERT.
--
-- GIV-936: Image URLs point at self-hosted real photos under
--          public/images/charities/ (served at /images/charities/...) instead
--          of the unreachable picsum.photos placeholder service. Uses real
--          photography; see public/images/charities/ATTRIBUTION.md for credits.
--
-- GIV-937: Seeds causes (STEP 4) and portfolio funds (STEP 5) so the Causes and
--          Portfolio Funds tabs on /browse have content. Also fixes the charity
--          UUID literals, which used a 'seed...' prefix — 's' is not a hex digit,
--          so every run failed with "invalid input syntax for type uuid" and no
--          seed data was ever written. They now read '5eed...'.
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
  '5eed0001-0000-0000-0000-000000000001', '99-1230001',
  'Bright Futures Education Fund',
  'Providing scholarships, tutoring programs, and after-school enrichment to underserved youth in New York City — empowering the next generation through quality education and mentorship.',
  'New York, NY', 'https://brightfuturesedu.example.org',
  '/images/charities/99-1230001.jpg',
  '/images/charities/99-1230001.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230001.jpg','/images/charities/default.jpg','/images/charities/default.jpg'],
  'B70', '1998', 'Active', 45,
  'verified', 312, 1847,
  'Dr. Patricia Holloway', 'Executive Director',
  'pholloway@brightfuturesedu.example.org', '(212) 555-0101',
  NULL, '0x1111111111111111111111111111111111111111', 'existing_evm', 'helcim',
  '2024-03-15T10:00:00Z', '2024-04-01T14:30:00Z', '2024-03-10T08:00:00Z', NOW()
),

-- 2. Health / E
(
  '5eed0002-0000-0000-0000-000000000002', '99-1230002',
  'Healing Hearts Health Alliance',
  'Delivering free medical screenings, mental health support, and preventive care to uninsured and underinsured individuals across Maryland — because healthcare is a human right.',
  'Baltimore, MD', 'https://healinghearts.example.org',
  '/images/charities/99-1230002.jpg',
  '/images/charities/99-1230002.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230002.jpg','/images/charities/default.jpg','/images/charities/default.jpg'],
  'E20', '2005', 'Active', 28,
  'verified', 198, 923,
  'Michael R. Thompson, MD', 'Chief Medical Officer',
  'mthompson@healinghearts.example.org', '(410) 555-0202',
  NULL, '0x2222222222222222222222222222222222222222', 'existing_evm', 'paypal',
  '2024-02-20T09:00:00Z', '2024-03-05T11:00:00Z', '2024-02-15T07:00:00Z', NOW()
),

-- 3. Environment / C
(
  '5eed0003-0000-0000-0000-000000000003', '99-1230003',
  'Green Earth Conservation Network',
  'Protecting Pacific Northwest ecosystems through habitat restoration, community education, and advocacy for sustainable land and water use practices that ensure a livable future.',
  'Portland, OR', 'https://greenearthconservation.example.org',
  '/images/charities/99-1230003.jpg',
  '/images/charities/99-1230003.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230003.jpg','/images/charities/default.jpg'],
  'C30', '2001', 'Active', 19,
  'verified', 445, 2103,
  'Sarah Chen', 'Executive Director',
  'schen@greenearthconservation.example.org', '(503) 555-0303',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-01-10T08:00:00Z', '2024-01-25T16:00:00Z', '2024-01-05T06:00:00Z', NOW()
),

-- 4. Human Services / P
(
  '5eed0004-0000-0000-0000-000000000004', '99-1230004',
  'Families First Human Services',
  'Supporting vulnerable families in central Ohio with emergency assistance, job training, childcare subsidies, and wraparound social services that break the cycle of generational poverty.',
  'Columbus, OH', 'https://familiesfirstohio.example.org',
  '/images/charities/99-1230004.jpg',
  '/images/charities/99-1230004.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230004.jpg','/images/charities/default.jpg'],
  'P60', '1989', 'Active', 72,
  'verified', 89, 514,
  'Denise Williams', 'President & CEO',
  'dwilliams@familiesfirstohio.example.org', '(614) 555-0404',
  NULL, '0x4444444444444444444444444444444444444444', 'existing_evm', 'helcim',
  '2024-04-02T10:00:00Z', '2024-04-18T09:00:00Z', '2024-03-28T07:00:00Z', NOW()
),

-- 5. Arts & Culture / A
(
  '5eed0005-0000-0000-0000-000000000005', '99-1230005',
  'Metropolitan Arts Council',
  'Fostering creative expression and cultural enrichment in Chicago through grants to local artists, free public performances, and arts education in under-resourced schools across the metro area.',
  'Chicago, IL', 'https://metroartscouncil.example.org',
  '/images/charities/99-1230005.jpg',
  '/images/charities/99-1230005.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230005.jpg','/images/charities/default.jpg','/images/charities/default.jpg'],
  'A23', '1973', 'Active', 34,
  'verified', 267, 1392,
  'James A. Kowalski', 'Executive Director',
  'jkowalski@metroartscouncil.example.org', '(312) 555-0505',
  NULL, NULL, 'new_custodial', 'paypal',
  '2024-03-01T11:00:00Z', '2024-03-20T13:00:00Z', '2024-02-25T08:00:00Z', NOW()
),

-- 6. Food & Nutrition / K
(
  '5eed0006-0000-0000-0000-000000000006', '99-1230006',
  'Food Banks United Network',
  'Combating food insecurity across Dallas-Fort Worth by distributing over 2 million meals annually, operating mobile pantries, and advocating for policy changes to permanently end hunger.',
  'Dallas, TX', 'https://foodbanksunited.example.org',
  '/images/charities/99-1230006.jpg',
  '/images/charities/99-1230006.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230006.jpg','/images/charities/default.jpg'],
  'K31', '2010', 'Active', 52,
  'verified', 521, 3241,
  'Angela Martinez', 'Director of Operations',
  'amartinez@foodbanksunited.example.org', '(214) 555-0606',
  NULL, '0x6666666666666666666666666666666666666666', 'existing_evm', 'helcim',
  '2024-02-10T10:00:00Z', '2024-02-28T12:00:00Z', '2024-02-05T07:00:00Z', NOW()
),

-- 7. Youth Development / O
(
  '5eed0007-0000-0000-0000-000000000007', '99-1230007',
  'Youth Leaders Tomorrow Foundation',
  'Building the next generation of civic leaders through mentorship programs, leadership camps, and college preparation workshops for high school students across the Denver metro area.',
  'Denver, CO', 'https://youthleaderstomorrow.example.org',
  '/images/charities/99-1230007.jpg',
  '/images/charities/99-1230007.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230007.jpg','/images/charities/default.jpg'],
  'O50', '2015', 'Active', 11,
  'verified', 134, 678,
  'Marcus Johnson', 'Founder & Executive Director',
  'mjohnson@youthleaderstomorrow.example.org', '(720) 555-0707',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-03-20T09:00:00Z', '2024-04-05T15:00:00Z', '2024-03-15T06:00:00Z', NOW()
),

-- 8. Animal Welfare / D
(
  '5eed0008-0000-0000-0000-000000000008', '99-1230008',
  'Paws & Claws Animal Rescue',
  'Rescuing abandoned and abused animals in Central Texas, providing veterinary care, rehabilitation, and permanent loving homes through a network of over 300 dedicated foster families.',
  'Austin, TX', 'https://pawsandclawsrescue.example.org',
  '/images/charities/99-1230008.jpg',
  '/images/charities/99-1230008.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230008.jpg','/images/charities/default.jpg','/images/charities/default.jpg'],
  'D20', '2008', 'Active', 16,
  'verified', 389, 2087,
  'Lisa Nguyen', 'Rescue Director',
  'lnguyen@pawsandclawsrescue.example.org', '(512) 555-0808',
  NULL, '0x8888888888888888888888888888888888888888', 'existing_evm', 'paypal',
  '2024-01-25T10:00:00Z', '2024-02-12T14:00:00Z', '2024-01-20T07:00:00Z', NOW()
),

-- 9. International / Q
(
  '5eed0009-0000-0000-0000-000000000009', '99-1230009',
  'Global Mission International',
  'Delivering humanitarian aid, clean water projects, and sustainable agriculture training to communities in 18 countries — partnering with local organizations to create lasting, self-sufficient change.',
  'Miami, FL', 'https://globalmissionintl.example.org',
  '/images/charities/99-1230009.jpg',
  '/images/charities/99-1230009.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230009.jpg','/images/charities/default.jpg'],
  'Q33', '1995', 'Active', 38,
  'verified', 712, 4506,
  'Rev. Emmanuel Okafor', 'President',
  'eokafor@globalmissionintl.example.org', '(305) 555-0909',
  NULL, NULL, 'new_custodial', 'helcim',
  '2024-04-10T08:00:00Z', '2024-04-22T10:00:00Z', '2024-04-05T06:00:00Z', NOW()
),

-- 10. Housing / L
(
  '5eed0010-0000-0000-0000-000000000010', '99-1230010',
  'Shelter & Hope Housing Initiative',
  'Addressing the homelessness crisis in Seattle by providing transitional housing, case management, and workforce development programs that move people from the streets to stable, permanent homes.',
  'Seattle, WA', 'https://shelterandhope.example.org',
  '/images/charities/99-1230010.jpg',
  '/images/charities/99-1230010.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230010.jpg','/images/charities/default.jpg'],
  'L21', '2003', 'Active', 61,
  'verified', 156, 891,
  'Rebecca Torres', 'CEO',
  'rtorres@shelterandhope.example.org', '(206) 555-1010',
  NULL, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'existing_evm', 'helcim',
  '2024-02-01T09:00:00Z', '2024-02-18T11:00:00Z', '2024-01-27T07:00:00Z', NOW()
),

-- 11. Community Development / S
(
  '5eed0011-0000-0000-0000-000000000011', '99-1230011',
  'Neighborworks Community Development',
  'Revitalizing Phoenix neighborhoods through affordable housing construction, small business grants, resident leadership training, and community land trust stewardship for long-term stability.',
  'Phoenix, AZ', 'https://neighborworkspx.example.org',
  '/images/charities/99-1230011.jpg',
  '/images/charities/99-1230011.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230011.jpg','/images/charities/default.jpg','/images/charities/default.jpg'],
  'S20', '2000', 'Active', 29,
  'verified', 203, 1124,
  'Carlos Mendez', 'Executive Director',
  'cmendez@neighborworkspx.example.org', '(602) 555-1111',
  NULL, NULL, 'new_custodial', 'paypal',
  '2024-03-08T10:00:00Z', '2024-03-25T16:00:00Z', '2024-03-03T08:00:00Z', NOW()
),

-- 12. Mental Health / F
(
  '5eed0012-0000-0000-0000-000000000012', '99-1230012',
  'Mental Wellness Support Network',
  'Reducing the stigma of mental illness in Greater Boston through peer support groups, crisis counseling hotlines, and community training programs that build lasting mental health resilience.',
  'Boston, MA', 'https://mentalwellnessnetwork.example.org',
  '/images/charities/99-1230012.jpg',
  '/images/charities/99-1230012.jpg',
  '/images/charities/default.jpg',
  ARRAY['/images/charities/99-1230012.jpg','/images/charities/default.jpg'],
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


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Seed causes (one active cause per charity)
--
-- GIV-937: /browse?tab=causes reads `causes` WHERE status = 'active'
-- (see src/hooks/useFeaturedCauses.ts). Without these rows the Causes tab
-- renders its empty state. charity_id references charity_profiles.id, which
-- is how useFeaturedCauses resolves the charity name.
--
-- Images reuse the self-hosted charity photos under public/images/charities/
-- (served at /images/charities/...). Do NOT point these at picsum.photos or
-- unsplash.com — that is exactly what broke featured organizations in GIV-936.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM causes
WHERE charity_id IN (SELECT id FROM charity_profiles WHERE ein LIKE '99-123%');

INSERT INTO causes (
  id, charity_id, name, description, target_amount, raised_amount,
  category, image_url, impact, timeline, location, partners, status
)
SELECT
  v.id::uuid, cp.id, v.name, v.description,
  v.target_amount, v.raised_amount,
  v.category, '/images/charities/' || v.ein || '.jpg', v.impact, v.timeline, v.location, v.partners,
  'active'
FROM (VALUES
  (
    'c0a5e001-0000-4000-8000-000000000001', '99-1230001',
    'Scholarships for 500 NYC Students',
    'Fund a full year of tuition support, books, and one-on-one mentorship for 500 high-school students in underserved New York City neighborhoods. Every scholarship is paired with a volunteer mentor who stays with the student through graduation.',
    250000.00, 187400.00, 'Education',
    ARRAY['500 students receive full-year scholarships','Each student is paired with a trained mentor','Books and lab fees covered in full'],
    'September 2026 – June 2027', 'New York, NY',
    ARRAY['NYC Department of Education','Reading Partners']
  ),
  (
    'c0a5e002-0000-4000-8000-000000000002', '99-1230002',
    'Free Mobile Health Screenings',
    'Put two fully equipped mobile clinics on the road across Baltimore, delivering free blood pressure, diabetes, and cancer screenings to uninsured residents in neighborhoods with no primary care provider within three miles.',
    180000.00, 96250.00, 'Health',
    ARRAY['12,000 free screenings per year','Two mobile clinics staffed five days a week','Same-day referral into follow-up care'],
    'Rolling — year-round', 'Baltimore, MD',
    ARRAY['Johns Hopkins Community Physicians','Maryland Dept. of Health']
  ),
  (
    'c0a5e003-0000-4000-8000-000000000003', '99-1230003',
    'Restore 1,000 Acres of Salmon Habitat',
    'Replant native riparian forest and remove five obsolete culverts along Oregon tributaries to reopen spawning grounds that have been blocked for decades. Restored streambanks cool the water and bring salmon runs back.',
    420000.00, 312900.00, 'Environment',
    ARRAY['1,000 acres of riparian habitat restored','Five fish-passage barriers removed','40 miles of spawning stream reopened'],
    'March 2026 – November 2027', 'Portland, OR',
    ARRAY['Oregon Watershed Enhancement Board','Native Fish Society']
  ),
  (
    'c0a5e004-0000-4000-8000-000000000004', '99-1230004',
    'Emergency Rent Assistance Fund',
    'Keep central Ohio families in their homes with one-time emergency grants that cover back rent and utility arrears, paired with job placement and childcare navigation so the crisis does not repeat next month.',
    300000.00, 141800.00, 'Human Services',
    ARRAY['600 families kept out of eviction','Average grant clears three months of arrears','Job placement offered to every household served'],
    'Rolling — year-round', 'Columbus, OH',
    ARRAY['Franklin County Job & Family Services','United Way of Central Ohio']
  ),
  (
    'c0a5e005-0000-4000-8000-000000000005', '99-1230005',
    'Arts Education in 40 Chicago Schools',
    'Place teaching artists in forty under-resourced Chicago public schools that currently have no arts programming, covering instruments, studio materials, and a weekly residency for the full academic year.',
    195000.00, 88600.00, 'Arts & Culture',
    ARRAY['40 schools gain weekly arts instruction','9,000 students reached','Instruments and materials provided at no cost'],
    'August 2026 – May 2027', 'Chicago, IL',
    ARRAY['Chicago Public Schools','Ingenuity Inc.']
  ),
  (
    'c0a5e006-0000-4000-8000-000000000006', '99-1230006',
    'Two Million Meals for North Texas',
    'Scale mobile pantry routes across Dallas–Fort Worth so that families in food deserts get fresh produce and protein weekly, not just shelf-stable staples. Covers refrigerated transport, warehouse capacity, and driver hours.',
    500000.00, 388200.00, 'Food & Nutrition',
    ARRAY['2,000,000 meals distributed annually','30 mobile pantry stops each week','Fresh produce in every distribution'],
    'Rolling — year-round', 'Dallas, TX',
    ARRAY['Feeding America','Tarrant Area Food Bank']
  ),
  (
    'c0a5e007-0000-4000-8000-000000000007', '99-1230007',
    'Summer Leadership Academy',
    'A six-week paid summer academy for 300 Denver teens combining leadership training, financial literacy, and a stipended internship with a local employer — so a summer of growth does not cost a family its income.',
    165000.00, 74300.00, 'Youth Development',
    ARRAY['300 teens complete the academy','Every participant earns a paid stipend','Internship placement with 45 local employers'],
    'June 2027 – August 2027', 'Denver, CO',
    ARRAY['Denver Public Schools','Mile High United Way']
  ),
  (
    'c0a5e008-0000-4000-8000-000000000008', '99-1230008',
    'Spay, Neuter & Rehome 3,000 Animals',
    'Fund a high-volume spay/neuter clinic and foster network in Austin, cutting shelter intake at the source while covering vaccination, microchipping, and adoption placement for 3,000 dogs and cats.',
    140000.00, 102450.00, 'Animal Welfare',
    ARRAY['3,000 animals spayed or neutered','Zero-cost service for low-income owners','Foster network expanded to 200 homes'],
    'January 2027 – December 2027', 'Austin, TX',
    ARRAY['Austin Pets Alive!','Emancipet']
  ),
  (
    'c0a5e009-0000-4000-8000-000000000009', '99-1230009',
    'Clean Water Wells in Rural Communities',
    'Drill and maintain 60 borehole wells serving rural villages with no safe water source, training a local water committee at each site so repairs happen locally instead of waiting on an outside crew.',
    360000.00, 219700.00, 'International',
    ARRAY['60 wells serving 45,000 people','Local water committee trained at every site','Five-year maintenance fund included'],
    'February 2026 – December 2027', 'Miami, FL',
    ARRAY['Water Mission','Rotary International']
  ),
  (
    'c0a5e010-0000-4000-8000-000000000010', '99-1230010',
    'Transitional Housing for 120 Families',
    'Convert a vacant Seattle building into 120 transitional apartments with on-site case management, moving families out of shelters and vehicles into stable housing with a path to a permanent lease.',
    750000.00, 402150.00, 'Housing',
    ARRAY['120 transitional apartments opened','On-site case management for every family','Average stay ends in a permanent lease'],
    'May 2026 – October 2027', 'Seattle, WA',
    ARRAY['King County Regional Homelessness Authority','Enterprise Community Partners']
  ),
  (
    'c0a5e011-0000-4000-8000-000000000011', '99-1230011',
    'Small Business Microloans in Phoenix',
    'Provide 200 microloans averaging $7,500 to first-time entrepreneurs in Phoenix neighborhoods that banks have written off, bundled with bookkeeping and licensing support through the first year of trading.',
    220000.00, 118900.00, 'Community Development',
    ARRAY['200 microloans issued','Business coaching through year one','Focus on women- and minority-owned startups'],
    'Rolling — year-round', 'Phoenix, AZ',
    ARRAY['Local First Arizona','Accion Opportunity Fund']
  ),
  (
    'c0a5e012-0000-4000-8000-000000000012', '99-1230012',
    'Free Teen Counseling Hotline',
    'Staff a 24/7 counseling line for Boston teens with licensed clinicians instead of volunteers, plus warm handoffs into ongoing therapy for callers who need more than a single conversation.',
    210000.00, 155600.00, 'Mental Health',
    ARRAY['24/7 coverage by licensed clinicians','30,000 calls answered per year','Warm handoff into ongoing care'],
    'Rolling — year-round', 'Boston, MA',
    ARRAY['Boston Children''s Hospital','NAMI Massachusetts']
  )
) AS v(
  id, ein, name, description, target_amount, raised_amount,
  category, impact, timeline, location, partners
)
JOIN charity_profiles cp ON cp.ein = v.ein;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Seed portfolio funds
--
-- GIV-937: /browse?tab=funds reads `portfolio_funds` WHERE status = 'active'
-- (see src/hooks/useFeaturedPortfolioFunds.ts). charity_ids holds
-- charity_profiles.id values; the carousel shows its length as the charity
-- count and links to /portfolio/<fund id>.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM portfolio_funds
WHERE id IN (
  'fd000001-0000-4000-8000-000000000001',
  'fd000002-0000-4000-8000-000000000002',
  'fd000003-0000-4000-8000-000000000003',
  'fd000004-0000-4000-8000-000000000004'
);

INSERT INTO portfolio_funds (id, name, description, category, image_url, charity_ids, status)
VALUES
(
  'fd000001-0000-4000-8000-000000000001',
  'Environmental Impact Fund',
  'Supporting climate action and conservation across organizations working on habitat restoration, wildlife protection, and sustainable land use. One donation is split evenly across every charity in the portfolio.',
  'Environment',
  '/images/charities/99-1230003.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230003','99-1230008')),
  'active'
),
(
  'fd000002-0000-4000-8000-000000000002',
  'Education Impact Fund',
  'Advancing access to quality learning worldwide — scholarships, arts education, and youth leadership programs bundled into a single portfolio so donors can back the whole pipeline rather than one school.',
  'Education',
  '/images/charities/99-1230001.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230001','99-1230005','99-1230007')),
  'active'
),
(
  'fd000003-0000-4000-8000-000000000003',
  'Poverty Relief Fund',
  'Meeting immediate need and building a way out of it: emergency assistance, food security, transitional housing, and neighborhood economic development working together across four verified organizations.',
  'Human Services',
  '/images/charities/99-1230004.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230004','99-1230006','99-1230010','99-1230011')),
  'active'
),
(
  'fd000004-0000-4000-8000-000000000004',
  'Health & Wellness Fund',
  'Preventive care, mental health support, and clean water access for communities that have been priced out of all three. Covers screening clinics, crisis counseling, and international water infrastructure.',
  'Health',
  '/images/charities/99-1230002.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230002','99-1230009','99-1230012')),
  'active'
);
COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify (run separately after the above succeeds)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT ein, name, status, logo_url IS NOT NULL AS has_logo, ntee_code
-- FROM charity_profiles
-- WHERE ein LIKE '99-123%'
-- ORDER BY ein;
