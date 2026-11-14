-- =============================================================================
-- Give Protocol - Volunteer opportunities seed (test data)
--
-- Populates volunteer_opportunities so /opportunities and /opportunities/:id
-- exercise the real data path before real charities post opportunities.
--
-- volunteer_opportunities.charity_id references profiles(id), so rows must
-- belong to real charity accounts. This script attaches the 8 opportunities,
-- round-robin, to existing profiles of type 'charity' whose user has claimed a
-- charity_profiles record (that is what gives the opportunity a charity name
-- and a link to the charity page). If there are no such accounts it inserts
-- nothing. The wording is deliberately charity-neutral for that reason.
--
-- Safe to re-run: rows use fixed ids (b0b00000-...) and are deleted + reinserted.
-- Run WITHOUT RLS (see the note in seed_causes_and_funds.sql). Requires the
-- detail-fields migration (20261003020000_volunteer_opportunity_details.sql).
--
-- commitment must be one of: one-time, short-term, long-term (table check).
-- Weekly hours therefore live in the free-text schedule column.
-- description is rich-text HTML, as produced by the charity portal editor.
-- requirements and benefits are one item per line.
--
-- To remove: DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';
-- =============================================================================

BEGIN;

DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';

WITH eligible AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS rn,
    count(*) OVER () AS total
  FROM (
    SELECT DISTINCT ON (p.id) p.id, p.created_at
    FROM profiles p
    JOIN charity_profiles cp ON cp.claimed_by = p.user_id
    WHERE p.type = 'charity'
    ORDER BY p.id
  ) charities
),
seed (
  n, title, description, skills, commitment, location, type, work_language,
  image_url, requirements, benefits, schedule, start_date, end_date,
  application_deadline, volunteers_needed, minimum_age,
  background_check_required, training_provided
) AS (
  VALUES
  (1, 'Web Development Volunteer',
   '<p>Help build and improve the online tools our team and community use every week.</p><p>You will work with a small team to ship features, fix bugs and document your work for the next volunteer. We review every change together, so you will get real feedback on your code.</p><h3>What you will do</h3><ul><li>Build and test new features in our React front end</li><li>Fix bugs reported by staff and supporters</li><li>Document what you build</li></ul>',
   ARRAY['React','Node.js','TypeScript']::text[], 'long-term', 'Remote', 'remote', 'english', '/images/charities/99-1230001.jpg',
   'Experience with React and TypeScript
Comfortable working asynchronously with a small team
Able to commit for at least 3 months',
   'Mentorship from a senior engineer
A reference letter on request
Public credit on our contributors page',
   'About 5-10 hours per week, flexible, with a weekly 30-minute team check-in on Wednesdays', '2026-11-01'::date, NULL::date, '2026-10-25'::date, 3, 18, false, true),
  (2, 'Community Event Assistant',
   '<p>Support check-in and guest services at our monthly community events.</p><p>You will greet attendees, help them complete forms, and guide them between stations so that events run smoothly and everyone feels welcome. No prior experience is needed.</p>',
   ARRAY['Customer Service','Event Support']::text[], 'long-term', 'Onsite - Baltimore, MD', 'onsite', 'english', '/images/charities/99-1230002.jpg',
   'Friendly, patient and respectful with people from all backgrounds
Able to stand for up to 4 hours
Complete a brief orientation before your first shift',
   'Hands-on community experience
Lunch provided on event days
Volunteer hours verified for school or work',
   'About 4 hours per shift, first Saturday of each month, 8am-1pm', '2026-11-07'::date, '2027-06-05'::date, '2026-10-30'::date, 12, 16, true, true),
  (3, 'Spanish-English Interpreter',
   '<p>Interpret for Spanish-speaking participants and translate printed materials.</p><p>Accurate interpretation is essential to the quality of service people receive. You will pair with staff during appointments and help translate handouts and forms.</p>',
   ARRAY['Translation','Interpretation','Spanish']::text[], 'long-term', 'Hybrid - Baltimore, MD', 'hybrid', 'spanish', '/images/charities/99-1230002.jpg',
   'Fluency in both English and Spanish
Willingness to learn program-specific terminology
Completion of our interpreter orientation',
   'Free interpreter training
Flexible hybrid schedule
Volunteer hours verified for certification programs',
   'About 10 hours per week: two in-person shifts per month plus remote translation work', '2026-11-01'::date, NULL::date, NULL::date, 5, 18, true, true),
  (4, 'Data Analysis Volunteer',
   '<p>Analyze program data to track progress and tell our story to funders and partners.</p><p>You will clean and analyze data collected by our teams and build clear charts and summaries that help us show what is working.</p>',
   ARRAY['Python','Data Analysis','Visualization']::text[], 'short-term', 'Remote', 'remote', 'english', '/images/charities/99-1230003.jpg',
   'Experience with Python (pandas) or R
Able to explain findings to a non-technical audience',
   'Real-world portfolio project
A reference letter on request',
   'About 8 hours per week, self-scheduled, with a monthly video call with the program team', '2026-11-15'::date, '2027-03-31'::date, '2026-11-08'::date, 2, 18, false, false),
  (5, 'Logistics Coordinator',
   '<p>Coordinate volunteer shifts and routes for our weekly distribution days.</p><p>You will keep distribution days running on time: building shift schedules, confirming volunteers and matching drivers to routes.</p>',
   ARRAY['Project Management','Coordination']::text[], 'long-term', 'Onsite - Dallas, TX', 'onsite', 'english', '/images/charities/99-1230006.jpg',
   'Strong organization and communication skills
Able to lift 25 pounds
Reliable transportation',
   'Leadership experience in a high-impact operation
Meals on distribution days
Reference letter on request',
   'About 12 hours per week: Thursday and Friday mornings plus 4 hours of planning', '2026-10-20'::date, NULL::date, NULL::date, 4, 18, true, true),
  (6, 'Educational Content Creator',
   '<p>Create short video lessons that introduce children to new topics.</p><p>Working with our program staff, you will plan, film and edit lessons for use in classrooms and at home.</p>',
   ARRAY['Content Creation','Education','Video Editing']::text[], 'short-term', 'Remote', 'remote', 'english', '/images/charities/99-1230005.jpg',
   'Video editing experience
Comfortable following children''s content guidelines',
   'Credits on every lesson you produce
Portfolio-ready work',
   'About 6 hours per week, flexible, producing one new lesson every two weeks', '2026-11-01'::date, '2027-04-30'::date, '2026-10-28'::date, 3, 18, true, false),
  (7, 'Youth Mentor (German-English)',
   '<p>Mentor students in German and English, with a focus on leadership skills.</p><p>You will meet with a small group of students each week to practice conversation, discuss goals and build confidence.</p>',
   ARRAY['Mentoring','Education','German']::text[], 'long-term', 'Hybrid - Denver, CO', 'hybrid', 'german', '/images/charities/99-1230007.jpg',
   'Conversational fluency in German and English
Patience and enthusiasm for working with teens
Complete our mentor training',
   'Mentor training and certificate
A community of fellow mentors
Reference letter on request',
   'About 5 hours per week: Wednesday evenings 6-8pm, in person or by video, plus prep', '2026-11-04'::date, '2027-05-26'::date, '2026-10-28'::date, 6, 21, true, true),
  (8, 'Social Media Volunteer',
   '<p>Share stories and run fundraising campaigns on social media.</p><p>Photos and stories help people connect with our mission. You will write posts, schedule campaigns and share updates with our community.</p>',
   ARRAY['Content Creation','Social Media','Photography']::text[], 'long-term', 'Remote', 'remote', 'english', '/images/charities/99-1230008.jpg',
   'Good writing and photo skills
Comfortable representing a nonprofit online',
   'Public credit for your photography
Flexible, remote work',
   'About 5 hours per week, flexible, with two posts per week', '2026-10-15'::date, NULL::date, NULL::date, NULL::int, 16, false, false)
)
INSERT INTO volunteer_opportunities (
  id, charity_id, title, description, skills, commitment, location, type,
  work_language, status, image_url,
  requirements, benefits, schedule, start_date, end_date, application_deadline,
  volunteers_needed, minimum_age, background_check_required, training_provided
)
SELECT
  ('b0b00000-0000-4000-8000-' || lpad(seed.n::text, 12, '0'))::uuid,
  eligible.id, seed.title, seed.description, seed.skills, seed.commitment,
  seed.location, seed.type, seed.work_language, 'active', seed.image_url,
  seed.requirements, seed.benefits, seed.schedule, seed.start_date,
  seed.end_date, seed.application_deadline, seed.volunteers_needed,
  seed.minimum_age, seed.background_check_required, seed.training_provided
FROM seed
JOIN eligible ON eligible.rn = ((seed.n - 1) % eligible.total) + 1;

COMMIT;

-- Verify (run separately):
-- SELECT vo.title, vo.commitment, COALESCE(cp.name, p.name) AS charity
-- FROM volunteer_opportunities vo
-- JOIN profiles p ON p.id = vo.charity_id
-- LEFT JOIN charity_profiles cp ON cp.claimed_by = p.user_id
-- WHERE vo.id::text LIKE 'b0b00000-%'
-- ORDER BY vo.id;
