-- Migration: Create sbt_audit_log table
-- Part of GIV-61: GDPR right-to-erasure implementation
-- Preserves blockchain linkage metadata before user deletion for regulatory
-- and dispute resolution purposes. Blockchain tx hashes cannot be erased
-- (GDPR Recital 65, Art. 17(3)(b)); this table documents the linkage so
-- compliance can be demonstrated without re-exposing PII.

CREATE TABLE IF NOT EXISTS sbt_audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id     UUID        NOT NULL,     -- original auth.users.id (no FK — user will be deleted)
  table_name          TEXT        NOT NULL
                                  CHECK (table_name IN ('self_reported_hours', 'volunteer_verifications')),
  source_row_id       UUID        NOT NULL,     -- original row id in source table
  blockchain_tx_hash  TEXT,                     -- on-chain tx hash (cannot be deleted)
  token_id            BIGINT,                   -- SBT or NFT token id
  token_type          TEXT        NOT NULL
                                  CHECK (token_type IN ('SBT', 'NFT')),
  deleted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audit_note          TEXT        NOT NULL DEFAULT 'User exercised GDPR right to erasure'
);

COMMENT ON TABLE sbt_audit_log IS
  'Preserves blockchain linkage metadata before user erasure. '
  'Required for regulatory compliance; service_role access only.';
COMMENT ON COLUMN sbt_audit_log.deleted_user_id IS
  'The auth.users.id of the deleted user. Stored without FK since the user record is deleted.';
COMMENT ON COLUMN sbt_audit_log.table_name IS
  'Source table where the blockchain reference originated.';
COMMENT ON COLUMN sbt_audit_log.source_row_id IS
  'Primary key of the source row in table_name (row may be deleted or anonymized).';
COMMENT ON COLUMN sbt_audit_log.blockchain_tx_hash IS
  'Immutable on-chain transaction hash — cannot be erased per GDPR Art. 17(3)(b).';

-- Performance index for compliance queries by deleted user
CREATE INDEX IF NOT EXISTS idx_sbt_audit_log_deleted_user_id
  ON sbt_audit_log (deleted_user_id);

-- RLS: Only service_role can read/write this table.
-- Users must NOT be able to view their own entry (would expose other users' audit data).
ALTER TABLE sbt_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON sbt_audit_log;
CREATE POLICY "service_role_only" ON sbt_audit_log
  USING (auth.role() = 'service_role');
