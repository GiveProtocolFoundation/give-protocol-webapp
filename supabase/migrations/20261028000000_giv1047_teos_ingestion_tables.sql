-- GIV-1047: TEOS registry ingestion + refresh job (MVP-CHR-01)
--
-- Creates the schema for the IRS Tax Exempt Organization Search (TEOS) data
-- ingestion pipeline. TEOS provides two key datasets:
--
--   1. Publication 78 — orgs eligible to receive tax-deductible contributions
--   2. Auto-Revocation List — orgs whose 501(c)(3) status was revoked
--
-- This migration creates:
--   - teos_pub78_data: raw Pub 78 records (deductibility/eligibility status)
--   - teos_revocations: auto-revocation records
--   - teos_refresh_log: audit trail of each ingestion run
--   - charity_authorized_reps: PPA v1.1 officer re-verification tracking
--
-- The refresh job (teos-refresh edge function) updates these tables and
-- cross-references with charity_organizations to flag status changes.

-- ============================================================================
-- 1. teos_pub78_data — Publication 78 deductibility records
-- ============================================================================

CREATE TABLE IF NOT EXISTS teos_pub78_data (
  ein             TEXT NOT NULL,
  name            TEXT NOT NULL,
  city            TEXT,
  state           TEXT,
  country         TEXT,
  deductibility   TEXT,
  -- Provenance
  snapshot_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teos_pub78_data_pkey PRIMARY KEY (ein)
);

ALTER TABLE teos_pub78_data ENABLE ROW LEVEL SECURITY;

-- Public read for verification lookups; writes restricted to service_role
CREATE POLICY "teos_pub78_data_read"
  ON teos_pub78_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "teos_pub78_data_service_write"
  ON teos_pub78_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_teos_pub78_ein ON teos_pub78_data (ein);
CREATE INDEX IF NOT EXISTS idx_teos_pub78_state ON teos_pub78_data (state);
CREATE INDEX IF NOT EXISTS idx_teos_pub78_updated ON teos_pub78_data (updated_at);

COMMENT ON TABLE teos_pub78_data IS 'IRS TEOS Publication 78 records — organizations eligible for tax-deductible contributions';
COMMENT ON COLUMN teos_pub78_data.deductibility IS 'Deductibility code from IRS: PC (public charity 50%), POF (private operating foundation 50%), PF (private foundation 30%), etc.';
COMMENT ON COLUMN teos_pub78_data.snapshot_id IS 'FK to teos_refresh_log.id for the ingestion run that last touched this record';


-- ============================================================================
-- 2. teos_revocations — Auto-revocation list
-- ============================================================================

CREATE TABLE IF NOT EXISTS teos_revocations (
  ein                   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  country               TEXT,
  exemption_type        TEXT,
  revocation_date       DATE,
  revocation_posting_date DATE,
  reinstatement_date    DATE,
  -- Provenance
  snapshot_id           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teos_revocations_pkey PRIMARY KEY (ein)
);

ALTER TABLE teos_revocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teos_revocations_read"
  ON teos_revocations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "teos_revocations_service_write"
  ON teos_revocations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_teos_revocations_ein ON teos_revocations (ein);
CREATE INDEX IF NOT EXISTS idx_teos_revocations_date ON teos_revocations (revocation_date);
CREATE INDEX IF NOT EXISTS idx_teos_revocations_reinstatement ON teos_revocations (reinstatement_date);
CREATE INDEX IF NOT EXISTS idx_teos_revocations_updated ON teos_revocations (updated_at);

COMMENT ON TABLE teos_revocations IS 'IRS TEOS auto-revocation list — orgs whose 501(c)(3) status was revoked for failure to file';
COMMENT ON COLUMN teos_revocations.revocation_date IS 'Effective date the exemption was revoked';
COMMENT ON COLUMN teos_revocations.reinstatement_date IS 'Date exemption was reinstated (NULL if still revoked)';


-- ============================================================================
-- 3. teos_refresh_log — Audit trail of each ingestion run
-- ============================================================================

CREATE TABLE IF NOT EXISTS teos_refresh_log (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  -- Pub 78 stats
  pub78_total     INTEGER DEFAULT 0,
  pub78_inserted  INTEGER DEFAULT 0,
  pub78_updated   INTEGER DEFAULT 0,
  -- Revocation stats
  revoc_total     INTEGER DEFAULT 0,
  revoc_inserted  INTEGER DEFAULT 0,
  revoc_updated   INTEGER DEFAULT 0,
  -- Status change stats
  status_flags_added    INTEGER DEFAULT 0,
  status_flags_removed  INTEGER DEFAULT 0,
  -- Officer re-verification (PPA v1.1)
  officer_checks_run    INTEGER DEFAULT 0,
  officer_checks_failed INTEGER DEFAULT 0,
  -- Error details
  error_message   TEXT,
  error_details   JSONB,
  CONSTRAINT teos_refresh_log_pkey PRIMARY KEY (id)
);

ALTER TABLE teos_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teos_refresh_log_read"
  ON teos_refresh_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "teos_refresh_log_service_write"
  ON teos_refresh_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_teos_refresh_log_status ON teos_refresh_log (status);
CREATE INDEX IF NOT EXISTS idx_teos_refresh_log_started ON teos_refresh_log (started_at DESC);

COMMENT ON TABLE teos_refresh_log IS 'Audit trail of TEOS ingestion runs — tracks stats and errors for each refresh cycle';


-- ============================================================================
-- 4. charity_authorized_reps — PPA v1.1 officer re-verification
-- ============================================================================
-- Tracks the mapping between a charity profile's Authorized Representative
-- (the person who claimed/accepted the platform agreement) and Form 990-listed
-- officers/directors. On each TEOS refresh, we re-verify that the AR still
-- appears in the org's officer list.

CREATE TABLE IF NOT EXISTS charity_authorized_reps (
  id                  UUID NOT NULL DEFAULT gen_random_uuid(),
  charity_profile_id  UUID NOT NULL,
  ein                 TEXT NOT NULL,
  -- The person who accepted the PPA
  rep_user_id         UUID NOT NULL,
  rep_name            TEXT NOT NULL,
  rep_title           TEXT,
  -- Verification state
  verified_at         TIMESTAMPTZ,
  last_checked_at     TIMESTAMPTZ,
  check_result        TEXT DEFAULT 'pending'
                        CHECK (check_result IN ('pending', 'verified', 'not_found', 'mismatch', 'error')),
  check_details       JSONB,
  -- Lifecycle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT charity_authorized_reps_pkey PRIMARY KEY (id),
  CONSTRAINT charity_authorized_reps_profile_fk
    FOREIGN KEY (charity_profile_id)
    REFERENCES charity_profiles (id)
    ON DELETE CASCADE
);

ALTER TABLE charity_authorized_reps ENABLE ROW LEVEL SECURITY;

-- Service role full access for the refresh job
CREATE POLICY "charity_authorized_reps_service_write"
  ON charity_authorized_reps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can see their own verification records
CREATE POLICY "charity_authorized_reps_own_read"
  ON charity_authorized_reps FOR SELECT
  TO authenticated
  USING (rep_user_id = auth.uid());

-- Admins can see all
CREATE POLICY "charity_authorized_reps_admin_read"
  ON charity_authorized_reps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.type = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_charity_auth_reps_ein ON charity_authorized_reps (ein);
CREATE INDEX IF NOT EXISTS idx_charity_auth_reps_profile ON charity_authorized_reps (charity_profile_id);
CREATE INDEX IF NOT EXISTS idx_charity_auth_reps_user ON charity_authorized_reps (rep_user_id);
CREATE INDEX IF NOT EXISTS idx_charity_auth_reps_result ON charity_authorized_reps (check_result) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_charity_auth_reps_last_check ON charity_authorized_reps (last_checked_at) WHERE is_active = TRUE;

COMMENT ON TABLE charity_authorized_reps IS 'PPA v1.1 — tracks Authorized Representatives and their Form 990 officer re-verification status';
COMMENT ON COLUMN charity_authorized_reps.check_result IS 'Latest verification: pending (never checked), verified (matches 990 officer), not_found (not in 990 data), mismatch (name/title changed), error (lookup failed)';


-- ============================================================================
-- 5. Add teos_exempt_status columns to charity_organizations
-- ============================================================================
-- Rather than duplicating all data, we add status flags from TEOS to the
-- existing charity_organizations table.

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS teos_pub78_status TEXT;

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS teos_revocation_date DATE;

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS teos_reinstatement_date DATE;

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS teos_deductibility TEXT;

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS teos_last_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_charity_org_teos_status
  ON charity_organizations (teos_pub78_status) WHERE teos_pub78_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_charity_org_teos_revoked
  ON charity_organizations (teos_revocation_date) WHERE teos_revocation_date IS NOT NULL;

COMMENT ON COLUMN charity_organizations.teos_pub78_status IS 'TEOS Pub 78 status: eligible (in Pub 78), revoked (auto-revoked), reinstated, not_found';
COMMENT ON COLUMN charity_organizations.teos_deductibility IS 'TEOS Pub 78 deductibility code: PC, POF, PF, etc.';
COMMENT ON COLUMN charity_organizations.teos_revocation_date IS 'Date exempt status was revoked (from TEOS auto-revocation list)';
COMMENT ON COLUMN charity_organizations.teos_reinstatement_date IS 'Date exempt status was reinstated after revocation';
COMMENT ON COLUMN charity_organizations.teos_last_checked_at IS 'Timestamp of the last TEOS refresh that checked this org';


-- ============================================================================
-- 6. RPC: get_teos_status — quick lookup for verification workflows
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_teos_status(p_ein TEXT)
RETURNS TABLE (
  ein                   TEXT,
  name                  TEXT,
  pub78_status          TEXT,
  deductibility         TEXT,
  revocation_date       DATE,
  reinstatement_date    DATE,
  last_checked_at       TIMESTAMPTZ,
  is_in_pub78           BOOLEAN,
  is_revoked            BOOLEAN,
  is_reinstated         BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    co.ein,
    co.name,
    co.teos_pub78_status,
    co.teos_deductibility,
    co.teos_revocation_date,
    co.teos_reinstatement_date,
    co.teos_last_checked_at,
    (co.teos_pub78_status = 'eligible') AS is_in_pub78,
    (co.teos_revocation_date IS NOT NULL AND co.teos_reinstatement_date IS NULL) AS is_revoked,
    (co.teos_reinstatement_date IS NOT NULL) AS is_reinstated
  FROM charity_organizations co
  WHERE co.ein = p_ein
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_teos_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teos_status(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_teos_status IS 'Returns TEOS exempt status for a given EIN — used by verification workflows';


-- ============================================================================
-- 7. RPC: get_charity_officer_verification — PPA v1.1 lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_charity_officer_verification(p_ein TEXT)
RETURNS TABLE (
  rep_id          UUID,
  rep_name        TEXT,
  rep_title       TEXT,
  check_result    TEXT,
  last_checked_at TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  is_active       BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    car.id,
    car.rep_name,
    car.rep_title,
    car.check_result,
    car.last_checked_at,
    car.verified_at,
    car.is_active
  FROM charity_authorized_reps car
  WHERE car.ein = p_ein
    AND car.is_active = TRUE
  ORDER BY car.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_charity_officer_verification(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_charity_officer_verification(TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_charity_officer_verification IS 'PPA v1.1 — returns active Authorized Representative verification status for a given EIN';
