-- Migration: Create key_rotation_jobs table
-- Part of GIV-59: Implement encryption-at-rest for PII fields
-- Tracks re-encryption batch job progress for DEK rotation

CREATE TABLE IF NOT EXISTS key_rotation_jobs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dek_version_from INTEGER     NOT NULL,
  dek_version_to   INTEGER     NOT NULL,
  target_table     TEXT        NOT NULL,
  rows_total       INTEGER     NOT NULL DEFAULT 0,
  rows_done        INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'running', 'done', 'failed')),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE key_rotation_jobs IS
  'Tracks progress of DEK re-encryption batch jobs for PII key rotation.';
COMMENT ON COLUMN key_rotation_jobs.dek_version_from IS
  'Source DEK version being rotated away from.';
COMMENT ON COLUMN key_rotation_jobs.dek_version_to IS
  'Target DEK version being rotated to.';
COMMENT ON COLUMN key_rotation_jobs.target_table IS
  'Table being re-encrypted (e.g. volunteer_applications, profiles).';
COMMENT ON COLUMN key_rotation_jobs.rows_total IS
  'Total rows requiring re-encryption in this job.';
COMMENT ON COLUMN key_rotation_jobs.rows_done IS
  'Rows successfully re-encrypted so far.';

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_key_rotation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_key_rotation_jobs_updated_at
  BEFORE UPDATE ON key_rotation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_key_rotation_jobs_updated_at();

-- RLS: Only service-role can read/write key rotation jobs
ALTER TABLE key_rotation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON key_rotation_jobs;
CREATE POLICY "service_role_only" ON key_rotation_jobs
  USING (auth.role() = 'service_role');
