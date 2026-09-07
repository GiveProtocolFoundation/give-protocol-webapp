-- GIV-964: Reconcile RLS on self_reported_hours / validation_requests.
--
-- Anonymous (unauthenticated) requests could read every row of
-- self_reported_hours through PostgREST, including PII: volunteer_id
-- (auth.users UUID), organization_contact_email, description, location.
--
-- Production audit (2026-09-07, read-only query of pg_class / pg_policies):
--
--   * RLS was ENABLED on both tables (relrowsecurity = true).
--   * self_reported_hours carried hand-applied policies that exist nowhere in
--     the repo, including the leak:
--
--       "Users can select own hours"
--         FOR SELECT TO {anon,authenticated} USING (true)
--
--     A blanket USING (true) for anon makes every column of every row public.
--   * The canonical policy set from 20251209000000 was missing in production:
--     the organization validation policies ("Organizations can read records
--     for validation", "Organizations can update validation status") and every
--     validation_requests policy except one org-read policy, so the org
--     validation flow was broken at the same time.
--
-- The hand-applied policies look like an attempt to make the public
-- /contributions leaderboard include self-reported hours (the page is public
-- and contributionAggregationService reads this table; the repo-intended
-- design lets that query return an empty set for anon and the service falls
-- back to formal hours only). Restoring the repo policy set closes the leak;
-- if the product later wants self-reported hours on the public leaderboard,
-- that needs its own privacy-scoped policy (see volunteer_hours'
-- "Public can view volunteer hours from public users" in
-- 20260407000000_enforce_privacy_in_leaderboard_views.sql), not a blanket
-- USING (true).
--
-- This migration is idempotent and safe to run against drifted and
-- already-correct databases:
--   * RLS is (re-)enabled on both tables
--   * ALL existing policies on both tables are dropped — any live policy was
--     either hand-applied drift or a duplicate of the canonical set — and the
--     exact policy set from 20251209000000 is recreated
--   * a final DO block asserts the end state (RLS enabled, canonical policies
--     present, no policy grants anon/public any access) and fails the
--     migration otherwise, rolling everything back
--
-- Deploy note: run via the manual Database Deploy workflow. Policy DDL takes
-- only brief locks and the tables are tiny (2 rows / 0 rows at audit time);
-- reads are not blocked. This migration rides along the same pending
-- production deploy as 20260907000000 (GIV-959).

-- =============================================================================
-- 1. Ensure RLS is enabled (idempotent)
-- =============================================================================

ALTER TABLE public.self_reported_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Drop every existing policy on both tables (hand-applied drift + any
--    earlier version of the canonical set)
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('self_reported_hours', 'validation_requests')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- 3. Recreate the canonical policy set from 20251209000000
--    (volunteer owns their rows; organizations read/update rows addressed to
--    them for validation; nothing is readable by anon)
-- =============================================================================

-- ── self_reported_hours ──────────────────────────────────────────────────────

-- Volunteers can insert their own records
DROP POLICY IF EXISTS "Volunteers can insert own self-reported hours" ON self_reported_hours;
CREATE POLICY "Volunteers can insert own self-reported hours" ON self_reported_hours
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can read their own records
DROP POLICY IF EXISTS "Volunteers can read own self-reported hours" ON self_reported_hours;
CREATE POLICY "Volunteers can read own self-reported hours" ON self_reported_hours
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can update their own unvalidated records
DROP POLICY IF EXISTS "Volunteers can update own unvalidated records" ON self_reported_hours;
CREATE POLICY "Volunteers can update own unvalidated records" ON self_reported_hours
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND validation_status != 'validated'
  );

-- Volunteers can delete their own non-validated records
DROP POLICY IF EXISTS "Volunteers can delete own non-validated records" ON self_reported_hours;
CREATE POLICY "Volunteers can delete own non-validated records" ON self_reported_hours
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND validation_status != 'validated'
  );

-- Organizations can read records requesting their validation
DROP POLICY IF EXISTS "Organizations can read records for validation" ON self_reported_hours;
CREATE POLICY "Organizations can read records for validation" ON self_reported_hours
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- Organizations can update validation status of their records
DROP POLICY IF EXISTS "Organizations can update validation status" ON self_reported_hours;
CREATE POLICY "Organizations can update validation status" ON self_reported_hours
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- ── validation_requests ──────────────────────────────────────────────────────

-- Volunteers can read their own validation requests
DROP POLICY IF EXISTS "Volunteers can read own validation requests" ON validation_requests;
CREATE POLICY "Volunteers can read own validation requests" ON validation_requests
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can cancel their own pending requests
DROP POLICY IF EXISTS "Volunteers can update own pending requests" ON validation_requests;
CREATE POLICY "Volunteers can update own pending requests" ON validation_requests
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND status = 'pending'
  );

-- Organizations can read validation requests for their org
DROP POLICY IF EXISTS "Organizations can read validation requests" ON validation_requests;
CREATE POLICY "Organizations can read validation requests" ON validation_requests
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- Organizations can update validation requests for their org
DROP POLICY IF EXISTS "Organizations can respond to validation requests" ON validation_requests;
CREATE POLICY "Organizations can respond to validation requests" ON validation_requests
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- Authenticated users can insert validation requests for their own hours
DROP POLICY IF EXISTS "Authenticated users can insert validation requests" ON validation_requests;
CREATE POLICY "Authenticated users can insert validation requests" ON validation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = volunteer_id);

-- =============================================================================
-- 4. Assert the reconciled state — fail (and roll back) otherwise
-- =============================================================================

DO $$
DECLARE
  expected_self_reported_hours name[] := ARRAY[
    'Organizations can read records for validation',
    'Organizations can update validation status',
    'Volunteers can delete own non-validated records',
    'Volunteers can insert own self-reported hours',
    'Volunteers can read own self-reported hours',
    'Volunteers can update own unvalidated records'
  ];
  expected_validation_requests name[] := ARRAY[
    'Authenticated users can insert validation requests',
    'Organizations can read validation requests',
    'Organizations can respond to validation requests',
    'Volunteers can read own validation requests',
    'Volunteers can update own pending requests'
  ];
  actual name[];
  anon_policies text;
BEGIN
  -- RLS must be enabled on both tables.
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.self_reported_hours'::regclass) THEN
    RAISE EXCEPTION 'GIV-964 assert failed: RLS is not enabled on self_reported_hours';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.validation_requests'::regclass) THEN
    RAISE EXCEPTION 'GIV-964 assert failed: RLS is not enabled on validation_requests';
  END IF;

  -- No policy on either table may grant anon/public any access.
  SELECT string_agg(tablename || '.' || policyname, ', ')
    INTO anon_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('self_reported_hours', 'validation_requests')
    AND ('anon' = ANY (roles) OR 'public' = ANY (roles));
  IF anon_policies IS NOT NULL THEN
    RAISE EXCEPTION 'GIV-964 assert failed: policies still grant anon/public access: %', anon_policies;
  END IF;

  -- The exact canonical policy set must exist on each table.
  SELECT array_agg(policyname ORDER BY policyname)
    INTO actual
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'self_reported_hours';
  IF actual IS DISTINCT FROM expected_self_reported_hours THEN
    RAISE EXCEPTION 'GIV-964 assert failed: self_reported_hours policies are %, expected %', actual, expected_self_reported_hours;
  END IF;

  SELECT array_agg(policyname ORDER BY policyname)
    INTO actual
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'validation_requests';
  IF actual IS DISTINCT FROM expected_validation_requests THEN
    RAISE EXCEPTION 'GIV-964 assert failed: validation_requests policies are %, expected %', actual, expected_validation_requests;
  END IF;
END $$;
