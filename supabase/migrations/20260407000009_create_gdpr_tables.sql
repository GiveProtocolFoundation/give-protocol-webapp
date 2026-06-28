-- Migration: Create GDPR erasure/export support tables
-- Part of GIV-61: GDPR right-to-erasure and data export implementation
-- Creates: deletion_audit_log, export_requests
-- Adds: profiles.scheduled_for_deletion_at (cooling-off enforcement)

-- ─── 1. deletion_audit_log ────────────────────────────────────────────────────
-- Regulatory audit trail for account erasure. Contains no PII; only hashed
-- email and metadata to prove compliance in a regulatory audit.

CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL,        -- the auth.users.id that was deleted
  email_hash        TEXT        NOT NULL,         -- SHA-256 of email (not plaintext)
  requested_at      TIMESTAMPTZ NOT NULL,         -- when user submitted the erasure request
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  steps_completed   TEXT[]      NOT NULL DEFAULT '{}',  -- array of completed step names
  blockchain_refs   JSONB,                        -- on-chain refs that could not be erased
  request_source    TEXT        NOT NULL DEFAULT 'user_self_service'
);

COMMENT ON TABLE deletion_audit_log IS
  'Regulatory audit trail for GDPR Art. 17 erasure requests. No PII stored; service_role only.';
COMMENT ON COLUMN deletion_audit_log.user_id IS
  'auth.users.id of the deleted user. No FK — user record has been deleted.';
COMMENT ON COLUMN deletion_audit_log.email_hash IS
  'SHA-256 hash of the user email — proves erasure without storing PII.';
COMMENT ON COLUMN deletion_audit_log.steps_completed IS
  'Ordered list of erasure steps completed (e.g. anonymize_applications, delete_wallet_aliases).';
COMMENT ON COLUMN deletion_audit_log.blockchain_refs IS
  'JSON summary of any on-chain references that could not be erased per GDPR Art. 17(3)(b).';

CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_user_id
  ON deletion_audit_log (user_id);

ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON deletion_audit_log;
CREATE POLICY "service_role_only" ON deletion_audit_log
  USING (auth.role() = 'service_role');


-- ─── 2. export_requests ───────────────────────────────────────────────────────
-- Tracks user-initiated GDPR Art. 20 data portability export requests.
-- Export is generated async by the Edge Function; status tracks progress.

CREATE TABLE IF NOT EXISTS export_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')),
  storage_path     TEXT,                     -- Supabase Storage object path (set when ready)
  expires_at       TIMESTAMPTZ,              -- signed URL expiry (24h TTL)
  error_message    TEXT,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

COMMENT ON TABLE export_requests IS
  'GDPR Art. 20 data portability export requests. Users may request once per 30 days.';
COMMENT ON COLUMN export_requests.storage_path IS
  'Supabase Storage object path for the generated export file.';
COMMENT ON COLUMN export_requests.expires_at IS
  'When the signed download URL expires (24h from generation).';

CREATE INDEX IF NOT EXISTS idx_export_requests_user_id
  ON export_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_export_requests_status
  ON export_requests (status)
  WHERE status IN ('pending', 'processing');

-- RLS: Users can only see and manage their own export requests.
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own export requests" ON export_requests;
CREATE POLICY "Users can view own export requests" ON export_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own export requests" ON export_requests;
CREATE POLICY "Users can insert own export requests" ON export_requests
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role can update status/path during async processing
DROP POLICY IF EXISTS "Service role full access" ON export_requests;
CREATE POLICY "Service role full access" ON export_requests
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── 3. erasure_requests ──────────────────────────────────────────────────────
-- Tracks user-initiated GDPR Art. 17 erasure requests with 30-day cooling-off.

CREATE TABLE IF NOT EXISTS erasure_requests (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                    TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'cancelled', 'processing', 'completed', 'failed')),
  reason                    TEXT,
  scheduled_deletion_date   TIMESTAMPTZ NOT NULL,     -- requested_at + 30 days
  requested_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at              TIMESTAMPTZ,
  processed_at              TIMESTAMPTZ,
  error_message             TEXT
);

COMMENT ON TABLE erasure_requests IS
  'GDPR Art. 17 erasure requests with 30-day cooling-off period.';
COMMENT ON COLUMN erasure_requests.scheduled_deletion_date IS
  'Date after which erasure may be executed (requested_at + 30 days).';

CREATE INDEX IF NOT EXISTS idx_erasure_requests_user_id
  ON erasure_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_erasure_requests_pending_deletion
  ON erasure_requests (scheduled_deletion_date)
  WHERE status = 'pending';

ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own erasure requests" ON erasure_requests;
CREATE POLICY "Users can view own erasure requests" ON erasure_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own erasure requests" ON erasure_requests;
CREATE POLICY "Users can insert own erasure requests" ON erasure_requests
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can cancel own erasure requests" ON erasure_requests;
CREATE POLICY "Users can cancel own erasure requests" ON erasure_requests
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (status = 'cancelled');

DROP POLICY IF EXISTS "Service role full access on erasure_requests" ON erasure_requests;
CREATE POLICY "Service role full access on erasure_requests" ON erasure_requests
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── 4. profiles.scheduled_for_deletion_at ────────────────────────────────────
-- Lightweight flag so the nightly cron can find accounts ready for deletion
-- without querying erasure_requests. Cleared on cancellation.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scheduled_for_deletion_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.scheduled_for_deletion_at IS
  'Set when a GDPR erasure request is confirmed. Nightly cron executes erasure '
  'after this timestamp passes. NULL = no pending erasure.';

CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_for_deletion
  ON profiles (scheduled_for_deletion_at)
  WHERE scheduled_for_deletion_at IS NOT NULL;
