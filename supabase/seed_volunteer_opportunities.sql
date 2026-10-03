-- =============================================================================
-- Give Protocol - Volunteer opportunities seed (test data)
--
-- Populates volunteer_opportunities so /opportunities and /opportunities/:id
-- exercise the real data path (table -> charity_profiles join -> charity link)
-- before real charities post opportunities. Each row is tied to one of the
-- seeded test charities (EIN 99-123xxxx) from supabase/seed.sql, which must be
-- run first.
--
-- Safe to re-run: rows use fixed ids (b0b00000-...) and are deleted + reinserted.
-- Run WITHOUT RLS (see the note in seed_causes_and_funds.sql). Requires the
-- image_url / moderation_status columns and the detail-fields migration
-- (20261003020000_volunteer_opportunity_details.sql).
--
-- description is rich-text HTML, as produced by the charity portal editor.
-- requirements and benefits are one item per line.
--
-- To remove: DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';
-- =============================================================================

BEGIN;

DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';

INSERT INTO volunteer_opportunities (
  id, charity_id, title, description, skills, commitment, location, type,
  work_language, status, image_url,
  requirements, benefits, schedule, start_date, end_date, application_deadline,
  volunteers_needed, minimum_age, background_check_required, training_provided
) VALUES
  ('b0b00000-0000-4000-8000-000000000001', '5eed0001-0000-0000-0000-000000000001', 'Web Development for Tutoring Platform',
   '<p>Help build the online platform our tutors and students use every week.</p><p>You will work with our small product team to ship features such as session scheduling, progress tracking and a parent dashboard. We use React, Node.js and TypeScript, and we review every change together so you will get real feedback on your code.</p><h3>What you will do</h3><ul><li>Build and test new features in our React front end</li><li>Fix bugs reported by tutors and families</li><li>Document what you build for the next volunteer</li></ul>',
   ARRAY['React','Node.js','TypeScript'], '5-10 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230001.jpg',
   'Experience with React and TypeScript
Comfortable working asynchronously with a small team
Able to commit for at least 3 months',
   'Mentorship from a senior engineer
A reference letter on request
Public credit on our contributors page',
   'Flexible, with a weekly 30-minute team check-in on Wednesdays', '2026-11-01', NULL, '2026-10-25', 3, 18, false, true),
  ('b0b00000-0000-4000-8000-000000000002', '5eed0002-0000-0000-0000-000000000002', 'Community Health Screening Assistant',
   '<p>Support check-in and patient navigation at our free monthly screening clinics in Baltimore.</p><p>You will greet patients, help them complete intake forms, and guide them between stations so that screenings run smoothly and everyone feels welcome. No medical experience is needed.</p>',
   ARRAY['Patient Navigation','Customer Service'], '4 hours/week', 'Onsite - Baltimore, MD', 'onsite', 'english', 'active', '/images/charities/99-1230002.jpg',
   'Friendly, patient and respectful with people from all backgrounds
Able to stand for up to 4 hours
Complete a brief confidentiality training before your first shift',
   'Hands-on experience in community health
Lunch provided on clinic days
Volunteer hours verified for school or work',
   'First Saturday of each month, 8am-1pm', '2026-11-07', '2027-06-05', '2026-10-30', 12, 16, true, true),
  ('b0b00000-0000-4000-8000-000000000003', '5eed0002-0000-0000-0000-000000000002', 'Spanish-English Medical Interpreter',
   '<p>Interpret for Spanish-speaking patients during screenings and translate patient information materials.</p><p>Accurate interpretation is essential to the quality of care our patients receive. You will pair with clinic staff during appointments and help us translate handouts and consent forms.</p>',
   ARRAY['Translation','Medical Terminology','Spanish'], '10 hours/week', 'Hybrid - Baltimore, MD', 'hybrid', 'spanish', 'active', '/images/charities/99-1230002.jpg',
   'Fluency in both English and Spanish
Familiarity with basic medical terminology, or willingness to learn
Completion of our interpreter orientation',
   'Free medical interpreter training
Flexible hybrid schedule
Volunteer hours verified for certification programs',
   'Two clinic shifts per month plus remote translation work', '2026-11-01', NULL, NULL, 5, 18, true, true),
  ('b0b00000-0000-4000-8000-000000000004', '5eed0003-0000-0000-0000-000000000003', 'Habitat Data Analysis',
   '<p>Analyze field survey data to track habitat restoration progress across the Pacific Northwest.</p><p>Our field teams collect plant, soil and water measurements each season. You will clean and analyze the data and build charts that help us show funders and partners what is working.</p>',
   ARRAY['Python','Data Analysis','Visualization'], '8 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230003.jpg',
   'Experience with Python (pandas) or R
Able to explain findings to a non-technical audience',
   'Real-world portfolio project
Opportunity to join field days in Oregon
A reference letter on request',
   'Self-scheduled; monthly video call with the science team', '2026-11-15', '2027-03-31', '2026-11-08', 2, 18, false, false),
  ('b0b00000-0000-4000-8000-000000000005', '5eed0006-0000-0000-0000-000000000006', 'Food Distribution Logistics Coordinator',
   '<p>Coordinate volunteer shifts and pickup routes for weekly food distribution across Dallas-Fort Worth.</p><p>You will keep our distribution days running on time: building shift schedules, confirming volunteers and matching drivers to pickup routes.</p>',
   ARRAY['Project Management','Coordination'], '12 hours/week', 'Onsite - Dallas, TX', 'onsite', 'english', 'active', '/images/charities/99-1230006.jpg',
   'Strong organization and communication skills
Able to lift 25 pounds
Reliable transportation',
   'Leadership experience in a high-impact operation
Meals on distribution days
Reference letter on request',
   'Thursday and Friday mornings plus 4 hours of planning during the week', '2026-10-20', NULL, NULL, 4, 18, true, true),
  ('b0b00000-0000-4000-8000-000000000006', '5eed0005-0000-0000-0000-000000000005', 'Arts Education Content Creator',
   '<p>Create short video lessons introducing children to local artists and art forms.</p><p>Working with our program staff and artists, you will plan, film and edit lessons for use in schools and at home.</p>',
   ARRAY['Content Creation','Education','Video Editing'], '6 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230005.jpg',
   'Video editing experience
Comfortable working with children''s content guidelines',
   'Credits on every lesson you produce
Access to partner artists
Portfolio-ready work',
   'Flexible; one new lesson every two weeks', '2026-11-01', '2027-04-30', '2026-10-28', 3, 18, true, false),
  ('b0b00000-0000-4000-8000-000000000007', '5eed0007-0000-0000-0000-000000000007', 'Youth Mentor (German-English)',
   '<p>Mentor exchange-program students in German and English, with a focus on leadership skills.</p><p>You will meet with a small group of students each week to practice conversation, discuss goals and build confidence.</p>',
   ARRAY['Mentoring','Education','German'], '5 hours/week', 'Hybrid - Denver, CO', 'hybrid', 'german', 'active', '/images/charities/99-1230007.jpg',
   'Conversational fluency in German and English
Patience and enthusiasm for working with teens
Complete our mentor training',
   'Mentor training and certificate
A community of fellow mentors
Reference letter on request',
   'Wednesday evenings, 6-8pm, in person or by video', '2026-11-04', '2027-05-26', '2026-10-28', 6, 21, true, true),
  ('b0b00000-0000-4000-8000-000000000008', '5eed0008-0000-0000-0000-000000000008', 'Animal Rescue Social Media Volunteer',
   '<p>Share adoptable-animal stories and run our fundraising campaigns on social media.</p><p>Photos and stories help animals find homes faster. You will write posts, schedule campaigns and share updates with our community.</p>',
   ARRAY['Content Creation','Social Media','Photography'], '5 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230008.jpg',
   'Good writing and photo skills
Comfortable representing a nonprofit online',
   'Meet adoptable animals at our shelter
Public credit for your photography',
   'Flexible; two posts per week', '2026-10-15', NULL, NULL, NULL, 16, false, false);

COMMIT;
