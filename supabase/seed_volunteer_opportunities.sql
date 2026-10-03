-- =============================================================================
-- Give Protocol - Volunteer opportunities seed (test data)
--
-- Populates volunteer_opportunities so /opportunities exercises the real data
-- path (table -> charity_profiles join -> charity link) before real charities
-- post opportunities. Each row is tied to one of the seeded test charities
-- (EIN 99-123xxxx) from supabase/seed.sql, which must be run first.
--
-- Safe to re-run: rows use fixed ids (b0b00000-...) and are deleted + reinserted.
-- Run WITHOUT RLS (see the note in seed_causes_and_funds.sql). Requires the
-- image_url and moderation_status columns from the migrations.
--
-- To remove: DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';
-- =============================================================================

BEGIN;

DELETE FROM volunteer_opportunities WHERE id::text LIKE 'b0b00000-%';

INSERT INTO volunteer_opportunities (
  id, charity_id, title, description, skills, commitment, location, type,
  work_language, status, image_url
) VALUES
  ('b0b00000-0000-4000-8000-000000000001', '5eed0001-0000-0000-0000-000000000001', 'Web Development for Tutoring Platform',
   'Help build the online platform our tutors and students use every week. Looking for React and Node.js developers.',
   ARRAY['React','Node.js','TypeScript'], '5-10 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230001.jpg'),
  ('b0b00000-0000-4000-8000-000000000002', '5eed0002-0000-0000-0000-000000000002', 'Community Health Screening Assistant',
   'Support check-in and patient navigation at our free monthly screening clinics in Baltimore.',
   ARRAY['Patient Navigation','Customer Service'], '4 hours/week', 'Onsite - Baltimore, MD', 'onsite', 'english', 'active', '/images/charities/99-1230002.jpg'),
  ('b0b00000-0000-4000-8000-000000000003', '5eed0002-0000-0000-0000-000000000002', 'Spanish-English Medical Interpreter',
   'Interpret for Spanish-speaking patients during screenings and translate patient information materials.',
   ARRAY['Translation','Medical Terminology','Spanish'], '10 hours/week', 'Hybrid - Baltimore, MD', 'hybrid', 'spanish', 'active', '/images/charities/99-1230002.jpg'),
  ('b0b00000-0000-4000-8000-000000000004', '5eed0003-0000-0000-0000-000000000003', 'Habitat Data Analysis',
   'Analyze field survey data to track habitat restoration progress across the Pacific Northwest.',
   ARRAY['Python','Data Analysis','Visualization'], '8 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230003.jpg'),
  ('b0b00000-0000-4000-8000-000000000005', '5eed0006-0000-0000-0000-000000000006', 'Food Distribution Logistics Coordinator',
   'Coordinate volunteer shifts and pickup routes for weekly food distribution across Dallas-Fort Worth.',
   ARRAY['Project Management','Coordination'], '12 hours/week', 'Onsite - Dallas, TX', 'onsite', 'english', 'active', '/images/charities/99-1230006.jpg'),
  ('b0b00000-0000-4000-8000-000000000006', '5eed0005-0000-0000-0000-000000000005', 'Arts Education Content Creator',
   'Create short video lessons introducing children to local artists and art forms.',
   ARRAY['Content Creation','Education','Video Editing'], '6 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230005.jpg'),
  ('b0b00000-0000-4000-8000-000000000007', '5eed0007-0000-0000-0000-000000000007', 'Youth Mentor (German-English)',
   'Mentor exchange-program students in German and English, with a focus on leadership skills.',
   ARRAY['Mentoring','Education','German'], '5 hours/week', 'Hybrid - Denver, CO', 'hybrid', 'german', 'active', '/images/charities/99-1230007.jpg'),
  ('b0b00000-0000-4000-8000-000000000008', '5eed0008-0000-0000-0000-000000000008', 'Animal Rescue Social Media Volunteer',
   'Share adoptable-animal stories and run our fundraising campaigns on social media.',
   ARRAY['Content Creation','Social Media','Photography'], '5 hours/week', 'Remote', 'remote', 'english', 'active', '/images/charities/99-1230008.jpg');

COMMIT;
