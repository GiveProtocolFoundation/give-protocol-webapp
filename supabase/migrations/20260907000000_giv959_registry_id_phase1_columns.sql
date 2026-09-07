-- GIV-959 phase 1/3: registry columns and constraints (fast DDL only).
--
-- Production never received the GIV-119 schema (charity_organizations.id,
-- self_reported_hours.charity_org_id, `id` in the search RPC) because
-- 20260517000000 recreated the RPC without `id`, which aborts db push before
-- GIV-119 can apply (see PR #599 for the full analysis).
--
-- The original single-file reconciliation timed out when run in the Supabase
-- SQL editor: the 1.69M-row backfill UPDATE exceeds the editor's statement
-- timeout. This migration is now split into three phases so every statement
-- here is catalog-only or a short index build:
--
--   phase 1 (this file): add columns, default, unique constraint, FK
--   phase 2 (20260907000001): batched backfill of charity_organizations.id
--   phase 3 (20260907000002): NOT NULL + search RPC with `id`
--
-- Everything is idempotent and safe to re-run after a partial failure.

-- =============================================================================
-- 1. charity_organizations.id UUID (nullable until phase 2 completes)
-- =============================================================================

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE charity_organizations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- =============================================================================
-- 2. Unique constraint on id (FK target). NULLs are distinct, so this is
--    valid before the backfill; the index build over ~1.69M rows takes a few
--    seconds and holds only a brief lock.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'charity_organizations_id_key'
      AND conrelid = 'charity_organizations'::regclass
  ) THEN
    ALTER TABLE charity_organizations
      ADD CONSTRAINT charity_organizations_id_key UNIQUE (id);
  END IF;
END $$;

-- =============================================================================
-- 3. self_reported_hours.charity_org_id FK (instant: the column is new and
--    empty, so FK validation scans nothing)
-- =============================================================================

ALTER TABLE self_reported_hours
  ADD COLUMN IF NOT EXISTS charity_org_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'self_reported_hours_charity_org_id_fkey'
      AND conrelid = 'self_reported_hours'::regclass
  ) THEN
    ALTER TABLE self_reported_hours
      ADD CONSTRAINT self_reported_hours_charity_org_id_fkey
      FOREIGN KEY (charity_org_id)
      REFERENCES charity_organizations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN self_reported_hours.charity_org_id IS
  'FK to charity_organizations.id. Set when volunteer selects a registry org '
  'from the autocomplete. Enables deduplication across free-text org_name aliases. '
  'Added by GIV-119; reconciled for drifted databases by GIV-959.';
