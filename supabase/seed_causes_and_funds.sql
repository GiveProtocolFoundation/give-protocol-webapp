-- =============================================================================
-- Give Protocol - Causes + Portfolio Funds seed (ADDITIVE, production-safe)
-- GIV-937 / GIV-947 (Supabase review follow-up)
--
-- HOW TO RUN IN THE SUPABASE SQL EDITOR
--   Paste the whole file, then Run it WITHOUT RLS.
--
--   The editor asks whether to run with or without RLS. "With RLS" executes as
--   the anon / authenticated role, which fails twice over:
--     1. The editor wraps the statements to impose the role, and that wrapping
--        breaks quoting partway through the file. The symptom is a baffling
--        error naming a word from inside a string literal, e.g.
--        ERROR: 42P01: relation "follow" does not exist
--        which comes from the text "referral into follow-up care".
--     2. Even parsed correctly, the inserts would be denied: causes requires a
--        matching auth.uid() and portfolio_funds requires an admin profile.
--   A seed script is privileged work, so run it without RLS.
--
--   Applying it through .github/workflows/database-deploy.yml is unaffected -
--   that runs psql directly against SUPABASE_DB_URL, with no RLS wrapper.
--
-- PREREQUISITE MIGRATION
--   Requires supabase/migrations/<timestamp>_add_seed_key_to_causes_and_funds.sql
--   (adds causes.seed_key and portfolio_funds.seed_key with a partial unique
--   index on each). Apply that migration before running this file.
--
-- WHAT CHANGED FROM THE PRIOR VERSION (Supabase review, GIV-947)
--   The prior version deleted and reinserted every row on each run. That is
--   fixed here:
--     1. No more DELETE. Every cause and fund carries a stable seed_key and
--        the insert is `ON CONFLICT (seed_key) DO UPDATE`, so ids never
--        change across reruns and rows this script does not own are never
--        touched (previously: DELETE ... WHERE charity_id IN (subquery on
--        ein LIKE) removed every cause for those charities, not just the
--        seeded ones; and funds were matched, and deleted, by name alone).
--     2. raised_amount is written on first INSERT only and deliberately
--        left out of the DO UPDATE SET list, so real donations accumulated
--        against a seeded cause survive a reseed.
--     3. status is likewise excluded from DO UPDATE, so an admin who pauses
--        or archives a seeded cause/fund is not silently reverted to
--        active on the next reseed.
--     4. A precheck aborts the whole script (via a CHECK-constraint
--        violation, not a DO block, to avoid dollar-quoting) if fewer than
--        12 of the seeded EINs are present, instead of silently inserting
--        fewer rows.
--     5. The verification query at the bottom is scoped to seed_key LIKE
--        'give-protocol-%' rather than counting every active cause/fund in
--        the database.
--
-- WHAT IT WRITES
--   ONLY the causes and portfolio_funds tables. It never touches
--   charity_profiles or charity_organizations - charities are matched by EIN,
--   so their existing ids, claimed_by and verified_at are left alone.
--
-- STYLE CONSTRAINT
--   Keep comments free of apostrophes and avoid dollar-quoted blocks. A client
--   that tracks quotes without skipping comments desyncs on a lone apostrophe
--   and corrupts every string literal after it.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0: Precheck - abort if the seeded charities are not all present.
-- Uses a CHECK-constraint violation instead of RAISE EXCEPTION so the guard
-- needs no dollar-quoted function body and no string literal to break.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TEMP TABLE seed_precheck_causes (n int NOT NULL CHECK (n = 12)) ON COMMIT DROP;
INSERT INTO seed_precheck_causes (n)
SELECT count(DISTINCT ein) FROM charity_profiles
WHERE ein IN (
  '99-1230001','99-1230002','99-1230003','99-1230004','99-1230005','99-1230006',
  '99-1230007','99-1230008','99-1230009','99-1230010','99-1230011','99-1230012'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Causes — one active cause per seeded charity
-- Idempotent via seed_key: reruns update in place, ids never change, and
-- raised_amount / status are left alone once a row exists.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO causes (
  charity_id, seed_key, name, description, target_amount, raised_amount,
  category, image_url, impact, timeline, location, partners, status
)
SELECT
  cp.id, v.seed_key, v.name, v.description,
  v.target_amount, v.raised_amount,
  v.category, '/images/charities/' || v.ein || '.jpg',
  v.impact, v.timeline, v.location, v.partners,
  'active'
FROM (VALUES
  (
    'give-protocol-cause-99-1230001', '99-1230001',
    'Scholarships for 500 NYC Students',
    'Fund a full year of tuition support, books, and one-on-one mentorship for 500 high-school students in underserved New York City neighborhoods. Every scholarship is paired with a volunteer mentor who stays with the student through graduation.',
    250000.00, 187400.00, 'Education',
    ARRAY['500 students receive full-year scholarships','Each student is paired with a trained mentor','Books and lab fees covered in full'],
    'September 2026 – June 2027', 'New York, NY',
    ARRAY['NYC Department of Education','Reading Partners']
  ),
  (
    'give-protocol-cause-99-1230002', '99-1230002',
    'Free Mobile Health Screenings',
    'Put two fully equipped mobile clinics on the road across Baltimore, delivering free blood pressure, diabetes, and cancer screenings to uninsured residents in neighborhoods with no primary care provider within three miles.',
    180000.00, 96250.00, 'Health',
    ARRAY['12,000 free screenings per year','Two mobile clinics staffed five days a week','Same-day referral into follow-up care'],
    'Rolling — year-round', 'Baltimore, MD',
    ARRAY['Johns Hopkins Community Physicians','Maryland Dept. of Health']
  ),
  (
    'give-protocol-cause-99-1230003', '99-1230003',
    'Restore 1,000 Acres of Salmon Habitat',
    'Replant native riparian forest and remove five obsolete culverts along Oregon tributaries to reopen spawning grounds that have been blocked for decades. Restored streambanks cool the water and bring salmon runs back.',
    420000.00, 312900.00, 'Environment',
    ARRAY['1,000 acres of riparian habitat restored','Five fish-passage barriers removed','40 miles of spawning stream reopened'],
    'March 2026 – November 2027', 'Portland, OR',
    ARRAY['Oregon Watershed Enhancement Board','Native Fish Society']
  ),
  (
    'give-protocol-cause-99-1230004', '99-1230004',
    'Emergency Rent Assistance Fund',
    'Keep central Ohio families in their homes with one-time emergency grants that cover back rent and utility arrears, paired with job placement and childcare navigation so the crisis does not repeat next month.',
    300000.00, 141800.00, 'Human Services',
    ARRAY['600 families kept out of eviction','Average grant clears three months of arrears','Job placement offered to every household served'],
    'Rolling — year-round', 'Columbus, OH',
    ARRAY['Franklin County Job & Family Services','United Way of Central Ohio']
  ),
  (
    'give-protocol-cause-99-1230005', '99-1230005',
    'Arts Education in 40 Chicago Schools',
    'Place teaching artists in forty under-resourced Chicago public schools that currently have no arts programming, covering instruments, studio materials, and a weekly residency for the full academic year.',
    195000.00, 88600.00, 'Arts & Culture',
    ARRAY['40 schools gain weekly arts instruction','9,000 students reached','Instruments and materials provided at no cost'],
    'August 2026 – May 2027', 'Chicago, IL',
    ARRAY['Chicago Public Schools','Ingenuity Inc.']
  ),
  (
    'give-protocol-cause-99-1230006', '99-1230006',
    'Two Million Meals for North Texas',
    'Scale mobile pantry routes across Dallas–Fort Worth so that families in food deserts get fresh produce and protein weekly, not just shelf-stable staples. Covers refrigerated transport, warehouse capacity, and driver hours.',
    500000.00, 388200.00, 'Food & Nutrition',
    ARRAY['2,000,000 meals distributed annually','30 mobile pantry stops each week','Fresh produce in every distribution'],
    'Rolling — year-round', 'Dallas, TX',
    ARRAY['Feeding America','Tarrant Area Food Bank']
  ),
  (
    'give-protocol-cause-99-1230007', '99-1230007',
    'Summer Leadership Academy',
    'A six-week paid summer academy for 300 Denver teens combining leadership training, financial literacy, and a stipended internship with a local employer — so a summer of growth does not cost a family its income.',
    165000.00, 74300.00, 'Youth Development',
    ARRAY['300 teens complete the academy','Every participant earns a paid stipend','Internship placement with 45 local employers'],
    'June 2027 – August 2027', 'Denver, CO',
    ARRAY['Denver Public Schools','Mile High United Way']
  ),
  (
    'give-protocol-cause-99-1230008', '99-1230008',
    'Spay, Neuter & Rehome 3,000 Animals',
    'Fund a high-volume spay/neuter clinic and foster network in Austin, cutting shelter intake at the source while covering vaccination, microchipping, and adoption placement for 3,000 dogs and cats.',
    140000.00, 102450.00, 'Animal Welfare',
    ARRAY['3,000 animals spayed or neutered','Zero-cost service for low-income owners','Foster network expanded to 200 homes'],
    'January 2027 – December 2027', 'Austin, TX',
    ARRAY['Austin Pets Alive!','Emancipet']
  ),
  (
    'give-protocol-cause-99-1230009', '99-1230009',
    'Clean Water Wells in Rural Communities',
    'Drill and maintain 60 borehole wells serving rural villages with no safe water source, training a local water committee at each site so repairs happen locally instead of waiting on an outside crew.',
    360000.00, 219700.00, 'International',
    ARRAY['60 wells serving 45,000 people','Local water committee trained at every site','Five-year maintenance fund included'],
    'February 2026 – December 2027', 'Miami, FL',
    ARRAY['Water Mission','Rotary International']
  ),
  (
    'give-protocol-cause-99-1230010', '99-1230010',
    'Transitional Housing for 120 Families',
    'Convert a vacant Seattle building into 120 transitional apartments with on-site case management, moving families out of shelters and vehicles into stable housing with a path to a permanent lease.',
    750000.00, 402150.00, 'Housing',
    ARRAY['120 transitional apartments opened','On-site case management for every family','Average stay ends in a permanent lease'],
    'May 2026 – October 2027', 'Seattle, WA',
    ARRAY['King County Regional Homelessness Authority','Enterprise Community Partners']
  ),
  (
    'give-protocol-cause-99-1230011', '99-1230011',
    'Small Business Microloans in Phoenix',
    'Provide 200 microloans averaging $7,500 to first-time entrepreneurs in Phoenix neighborhoods that banks have written off, bundled with bookkeeping and licensing support through the first year of trading.',
    220000.00, 118900.00, 'Community Development',
    ARRAY['200 microloans issued','Business coaching through year one','Focus on women- and minority-owned startups'],
    'Rolling — year-round', 'Phoenix, AZ',
    ARRAY['Local First Arizona','Accion Opportunity Fund']
  ),
  (
    'give-protocol-cause-99-1230012', '99-1230012',
    'Free Teen Counseling Hotline',
    'Staff a 24/7 counseling line for Boston teens with licensed clinicians instead of volunteers, plus warm handoffs into ongoing therapy for callers who need more than a single conversation.',
    210000.00, 155600.00, 'Mental Health',
    ARRAY['24/7 coverage by licensed clinicians','30,000 calls answered per year','Warm handoff into ongoing care'],
    'Rolling — year-round', 'Boston, MA',
    ARRAY['Boston Childrens Hospital','NAMI Massachusetts']
  )
) AS v(
  seed_key, ein, name, description, target_amount, raised_amount,
  category, impact, timeline, location, partners
)
JOIN charity_profiles cp ON cp.ein = v.ein
ON CONFLICT (seed_key) WHERE seed_key IS NOT NULL DO UPDATE SET
  charity_id    = EXCLUDED.charity_id,
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  target_amount = EXCLUDED.target_amount,
  category      = EXCLUDED.category,
  image_url     = EXCLUDED.image_url,
  impact        = EXCLUDED.impact,
  timeline      = EXCLUDED.timeline,
  location      = EXCLUDED.location,
  partners      = EXCLUDED.partners,
  updated_at    = NOW();
  -- raised_amount and status are intentionally NOT in this list: leaving
  -- them out of DO UPDATE SET means a reseed never touches live donation
  -- totals or an admin-set paused/completed status.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Portfolio funds — themed groupings of the seeded charities
-- Idempotent via seed_key rather than name, so a same-named fund created by
-- someone else is never at risk, and reruns update in place.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO portfolio_funds (seed_key, name, description, category, image_url, charity_ids, status)
VALUES
(
  'give-protocol-fund-environmental',
  'Environmental Impact Fund',
  'Supporting climate action and conservation across organizations working on habitat restoration, wildlife protection, and sustainable land use. One donation is split evenly across every charity in the portfolio.',
  'Environment',
  '/images/charities/99-1230003.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230003','99-1230008')),
  'active'
),
(
  'give-protocol-fund-education',
  'Education Impact Fund',
  'Advancing access to quality learning worldwide — scholarships, arts education, and youth leadership programs bundled into a single portfolio so donors can back the whole pipeline rather than one school.',
  'Education',
  '/images/charities/99-1230001.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230001','99-1230005','99-1230007')),
  'active'
),
(
  'give-protocol-fund-poverty-relief',
  'Poverty Relief Fund',
  'Meeting immediate need and building a way out of it: emergency assistance, food security, transitional housing, and neighborhood economic development working together across four verified organizations.',
  'Human Services',
  '/images/charities/99-1230004.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230004','99-1230006','99-1230010','99-1230011')),
  'active'
),
(
  'give-protocol-fund-health-wellness',
  'Health & Wellness Fund',
  'Preventive care, mental health support, and clean water access for communities that have been priced out of all three. Covers screening clinics, crisis counseling, and international water infrastructure.',
  'Health',
  '/images/charities/99-1230002.jpg',
  ARRAY(SELECT id FROM charity_profiles WHERE ein IN ('99-1230002','99-1230009','99-1230012')),
  'active'
)
ON CONFLICT (seed_key) WHERE seed_key IS NOT NULL DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  image_url   = EXCLUDED.image_url,
  charity_ids = EXCLUDED.charity_ids;
  -- status excluded: an admin who pauses/archives a seeded fund is not
  -- reverted to active on the next reseed. updated_at is handled by the
  -- existing trg_portfolio_funds_updated_at trigger on UPDATE, so it is
  -- not set explicitly here.

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify — scoped to this seed's rows only, so it stays meaningful once
-- other active causes/funds exist in the database.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM causes
     WHERE seed_key LIKE 'give-protocol-cause-%' AND status = 'active') AS seeded_active_causes,
  (SELECT count(*) FROM portfolio_funds
     WHERE seed_key LIKE 'give-protocol-fund-%' AND status = 'active') AS seeded_active_funds;
