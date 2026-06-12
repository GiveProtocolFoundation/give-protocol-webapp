-- GIV-407: volunteer_applications RLS — remove permissive USING(true) holdover
--
-- The earlier migration 202501200003_drop_all_volunteer_policies.sql created
-- three "allow_authenticated_*" policies USING (true) / WITH CHECK (true) to
-- delegate all access control to the application layer. A follow-up migration
-- (20250807144624_fix_rls_performance_batch.sql) added scoped policies but
-- did not drop the permissive holdovers. Because permissive RLS policies
-- combine with OR, the effective predicate stayed `true` and any authenticated
-- caller could read every row of volunteer_applications via the Supabase
-- REST/PostgREST surface — exposing applicant full_name, email, phone, and
-- message PII. GDPR Art. 5(1)(c) data minimisation and Art. 32 security of
-- processing both require row-level scoping at the database layer.
--
-- This migration drops the permissive holdovers and rewrites the scoped
-- policies with explicit FOR / TO / USING / WITH CHECK clauses so the
-- guarantees do not depend on policy-default semantics.

-- 1. Drop the maximally permissive holdovers from 202501200003.
DROP POLICY IF EXISTS "allow_authenticated_select" ON volunteer_applications;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON volunteer_applications;
DROP POLICY IF EXISTS "allow_authenticated_update" ON volunteer_applications;

-- 2. Replace the scoped policies idempotently with explicit FOR clauses.
--    Each policy was previously created without a FOR clause (defaulting to
--    FOR ALL with USING-only), which is incorrect for INSERT/UPDATE and
--    overbroad for SELECT-only intents. Recreate them with the right shapes.

-- SELECT: applicants see their own applications.
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
CREATE POLICY "Users can view own applications" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = applicant_id);

-- SELECT: charities see applications for opportunities they own.
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Charities can view applications for their opportunities" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles
    WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- UPDATE: charities can update applications for opportunities they own.
DROP POLICY IF EXISTS "Charities can update applications" ON volunteer_applications;
CREATE POLICY "Charities can update applications" ON volunteer_applications
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles
    WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ))
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles
    WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- INSERT: authenticated users can only insert applications for themselves.
DROP POLICY IF EXISTS "Users can create applications" ON volunteer_applications;
CREATE POLICY "Users can create applications" ON volunteer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = applicant_id);

-- Reset the table comment from the "filtering happens in application layer"
-- posture that justified the permissive holdovers.
COMMENT ON TABLE volunteer_applications IS
  'Volunteer application submissions. Row-level access is enforced by RLS: applicants see their own rows; charities see/update rows for opportunities they own; inserts must set applicant_id to auth.uid().';
