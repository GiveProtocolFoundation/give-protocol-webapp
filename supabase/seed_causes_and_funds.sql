-- =============================================================================
-- Give Protocol — Causes + Portfolio Funds seed (ADDITIVE, production-safe)
-- GIV-937
--
-- USAGE: Paste this entire file into the Supabase SQL Editor and click Run.
--        Safe to re-run: it replaces only the rows it owns.
--
-- WHY THIS FILE EXISTS, SEPARATE FROM seed.sql
--   seed.sql begins by DELETE-ing and re-INSERT-ing charity_profiles /
--   charity_organizations with fixed UUID literals ('5eed...'). Charities that
--   already live in a deployed database have their own gen_random_uuid() ids,
--   so running seed.sql there would delete those rows, recreate them under new
--   ids, and drop any claimed_by / verified_at state they had picked up —
--   orphaning anything that referenced the old ids.
--
--   This file never touches charity_profiles or charity_organizations. It reads
--   them (by EIN) and only writes `causes` and `portfolio_funds`, so it is safe
--   to run against a database that already has charity data.
--
-- PREREQUISITES
--   - The seeded test charities (EIN 99-1230001 .. 99-1230012) exist in
--     charity_profiles. Rows are matched by EIN, whatever their id.
--   - Tables `causes` and `portfolio_funds` exist. If not, apply migrations
--     20251128000000_create_causes_table.sql and
--     20260426000000_create_portfolio_funds_table.sql first.
--
-- WHAT THE APP DOES WITH THESE ROWS
--   /browse?tab=causes -> src/hooks/useFeaturedCauses.ts  (causes, status='active')
--   /browse?tab=funds  -> src/hooks/useFeaturedPortfolioFunds.ts
--                                        (portfolio_funds, status='active')
--
-- Images reference the self-hosted covers under public/images/charities/
-- (served at /images/charities/...). Never point these at picsum.photos or
-- unsplash.com — dead placeholder hosts are what broke featured orgs in GIV-936.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Guard: stop early with a clear message if the charities are missing, rather
-- than silently inserting nothing and leaving the tabs empty.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  found INTEGER;
BEGIN
  SELECT count(*) INTO found
  FROM charity_profiles
  WHERE ein LIKE '99-123%';

  IF found = 0 THEN
    RAISE EXCEPTION
      'No charity_profiles rows with EIN like 99-123%% were found. Seed the test charities first (supabase/seed.sql STEP 2), then re-run this file.';
  END IF;

  RAISE NOTICE 'Found % seeded charity profiles to attach causes and funds to.', found;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Causes — one active cause per seeded charity
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove only the causes this script owns, so re-running does not duplicate.
DELETE FROM causes
WHERE charity_id IN (SELECT id FROM charity_profiles WHERE ein LIKE '99-123%');

INSERT INTO causes (
  charity_id, name, description, target_amount, raised_amount,
  category, image_url, impact, timeline, location, partners, status
)
SELECT
  cp.id, v.name, v.description,
  v.target_amount, v.raised_amount,
  v.category, '/images/charities/' || v.ein || '.jpg',
  v.impact, v.timeline, v.location, v.partners,
  'active'
FROM (VALUES
  (
    '99-1230001',
    'Scholarships for 500 NYC Students',
    'Fund a full year of tuition support, books, and one-on-one mentorship for 500 high-school students in underserved New York City neighborhoods. Every scholarship is paired with a volunteer mentor who stays with the student through graduation.',
    250000.00, 187400.00, 'Education',
    ARRAY['500 students receive full-year scholarships','Each student is paired with a trained mentor','Books and lab fees covered in full'],
    'September 2026 – June 2027', 'New York, NY',
    ARRAY['NYC Department of Education','Reading Partners']
  ),
  (
    '99-1230002',
    'Free Mobile Health Screenings',
    'Put two fully equipped mobile clinics on the road across Baltimore, delivering free blood pressure, diabetes, and cancer screenings to uninsured residents in neighborhoods with no primary care provider within three miles.',
    180000.00, 96250.00, 'Health',
    ARRAY['12,000 free screenings per year','Two mobile clinics staffed five days a week','Same-day referral into follow-up care'],
    'Rolling — year-round', 'Baltimore, MD',
    ARRAY['Johns Hopkins Community Physicians','Maryland Dept. of Health']
  ),
  (
    '99-1230003',
    'Restore 1,000 Acres of Salmon Habitat',
    'Replant native riparian forest and remove five obsolete culverts along Oregon tributaries to reopen spawning grounds that have been blocked for decades. Restored streambanks cool the water and bring salmon runs back.',
    420000.00, 312900.00, 'Environment',
    ARRAY['1,000 acres of riparian habitat restored','Five fish-passage barriers removed','40 miles of spawning stream reopened'],
    'March 2026 – November 2027', 'Portland, OR',
    ARRAY['Oregon Watershed Enhancement Board','Native Fish Society']
  ),
  (
    '99-1230004',
    'Emergency Rent Assistance Fund',
    'Keep central Ohio families in their homes with one-time emergency grants that cover back rent and utility arrears, paired with job placement and childcare navigation so the crisis does not repeat next month.',
    300000.00, 141800.00, 'Human Services',
    ARRAY['600 families kept out of eviction','Average grant clears three months of arrears','Job placement offered to every household served'],
    'Rolling — year-round', 'Columbus, OH',
    ARRAY['Franklin County Job & Family Services','United Way of Central Ohio']
  ),
  (
    '99-1230005',
    'Arts Education in 40 Chicago Schools',
    'Place teaching artists in forty under-resourced Chicago public schools that currently have no arts programming, covering instruments, studio materials, and a weekly residency for the full academic year.',
    195000.00, 88600.00, 'Arts & Culture',
    ARRAY['40 schools gain weekly arts instruction','9,000 students reached','Instruments and materials provided at no cost'],
    'August 2026 – May 2027', 'Chicago, IL',
    ARRAY['Chicago Public Schools','Ingenuity Inc.']
  ),
  (
    '99-1230006',
    'Two Million Meals for North Texas',
    'Scale mobile pantry routes across Dallas–Fort Worth so that families in food deserts get fresh produce and protein weekly, not just shelf-stable staples. Covers refrigerated transport, warehouse capacity, and driver hours.',
    500000.00, 388200.00, 'Food & Nutrition',
    ARRAY['2,000,000 meals distributed annually','30 mobile pantry stops each week','Fresh produce in every distribution'],
    'Rolling — year-round', 'Dallas, TX',
    ARRAY['Feeding America','Tarrant Area Food Bank']
  ),
  (
    '99-1230007',
    'Summer Leadership Academy',
    'A six-week paid summer academy for 300 Denver teens combining leadership training, financial literacy, and a stipended internship with a local employer — so a summer of growth does not cost a family its income.',
    165000.00, 74300.00, 'Youth Development',
    ARRAY['300 teens complete the academy','Every participant earns a paid stipend','Internship placement with 45 local employers'],
    'June 2027 – August 2027', 'Denver, CO',
    ARRAY['Denver Public Schools','Mile High United Way']
  ),
  (
    '99-1230008',
    'Spay, Neuter & Rehome 3,000 Animals',
    'Fund a high-volume spay/neuter clinic and foster network in Austin, cutting shelter intake at the source while covering vaccination, microchipping, and adoption placement for 3,000 dogs and cats.',
    140000.00, 102450.00, 'Animal Welfare',
    ARRAY['3,000 animals spayed or neutered','Zero-cost service for low-income owners','Foster network expanded to 200 homes'],
    'January 2027 – December 2027', 'Austin, TX',
    ARRAY['Austin Pets Alive!','Emancipet']
  ),
  (
    '99-1230009',
    'Clean Water Wells in Rural Communities',
    'Drill and maintain 60 borehole wells serving rural villages with no safe water source, training a local water committee at each site so repairs happen locally instead of waiting on an outside crew.',
    360000.00, 219700.00, 'International',
    ARRAY['60 wells serving 45,000 people','Local water committee trained at every site','Five-year maintenance fund included'],
    'February 2026 – December 2027', 'Miami, FL',
    ARRAY['Water Mission','Rotary International']
  ),
  (
    '99-1230010',
    'Transitional Housing for 120 Families',
    'Convert a vacant Seattle building into 120 transitional apartments with on-site case management, moving families out of shelters and vehicles into stable housing with a path to a permanent lease.',
    750000.00, 402150.00, 'Housing',
    ARRAY['120 transitional apartments opened','On-site case management for every family','Average stay ends in a permanent lease'],
    'May 2026 – October 2027', 'Seattle, WA',
    ARRAY['King County Regional Homelessness Authority','Enterprise Community Partners']
  ),
  (
    '99-1230011',
    'Small Business Microloans in Phoenix',
    'Provide 200 microloans averaging $7,500 to first-time entrepreneurs in Phoenix neighborhoods that banks have written off, bundled with bookkeeping and licensing support through the first year of trading.',
    220000.00, 118900.00, 'Community Development',
    ARRAY['200 microloans issued','Business coaching through year one','Focus on women- and minority-owned startups'],
    'Rolling — year-round', 'Phoenix, AZ',
    ARRAY['Local First Arizona','Accion Opportunity Fund']
  ),
  (
    '99-1230012',
    'Free Teen Counseling Hotline',
    'Staff a 24/7 counseling line for Boston teens with licensed clinicians instead of volunteers, plus warm handoffs into ongoing therapy for callers who need more than a single conversation.',
    210000.00, 155600.00, 'Mental Health',
    ARRAY['24/7 coverage by licensed clinicians','30,000 calls answered per year','Warm handoff into ongoing care'],
    'Rolling — year-round', 'Boston, MA',
    ARRAY['Boston Children''s Hospital','NAMI Massachusetts']
  )
) AS v(
  ein, name, description, target_amount, raised_amount,
  category, impact, timeline, location, partners
)
JOIN charity_profiles cp ON cp.ein = v.ein;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Portfolio funds — themed groupings of the seeded charities
--
-- Matched by name so re-running replaces rather than duplicates, without
-- assuming any particular fund id.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM portfolio_funds
WHERE name IN (
  'Environmental Impact Fund',
  'Education Impact Fund',
  'Poverty Relief Fund',
  'Health & Wellness Fund'
);

INSERT INTO portfolio_funds (name, description, category, image_url, charity_ids, status)
VALUES
(
  'Environmental Impact Fund',
  'Supporting climate action and conservation across organizations working on habitat restoration, wildlife protection, and sustainable land use. One donation is split evenly across every charity in the portfolio.',
  'Environment',
  '/images/charities/99-1230003.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230003','99-1230008')),
  'active'
),
(
  'Education Impact Fund',
  'Advancing access to quality learning worldwide — scholarships, arts education, and youth leadership programs bundled into a single portfolio so donors can back the whole pipeline rather than one school.',
  'Education',
  '/images/charities/99-1230001.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230001','99-1230005','99-1230007')),
  'active'
),
(
  'Poverty Relief Fund',
  'Meeting immediate need and building a way out of it: emergency assistance, food security, transitional housing, and neighborhood economic development working together across four verified organizations.',
  'Human Services',
  '/images/charities/99-1230004.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230004','99-1230006','99-1230010','99-1230011')),
  'active'
),
(
  'Health & Wellness Fund',
  'Preventive care, mental health support, and clean water access for communities that have been priced out of all three. Covers screening clinics, crisis counseling, and international water infrastructure.',
  'Health',
  '/images/charities/99-1230002.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230002','99-1230009','99-1230012')),
  'active'
);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify — should report 12 active causes and 4 active funds.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM causes          WHERE status = 'active') AS active_causes,
  (SELECT count(*) FROM portfolio_funds WHERE status = 'active') AS active_funds;
