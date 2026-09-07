-- GIV-959: Restore the GIV-119 registry schema (charity_organizations.id,
-- self_reported_hours.charity_org_id, and `id` in the search RPC) that never
-- reached production.
--
-- Background: 20260414000000 (GIV-119) added the `id UUID` column to
-- charity_organizations, exposed it through search_charity_organizations, and
-- added the self_reported_hours.charity_org_id FK. 20260517000000 (GIV-233)
-- then recreated the RPC WITHOUT `id` using CREATE OR REPLACE, which cannot
-- change a function's return type — so on any database that had applied
-- GIV-119 first, that migration fails and `supabase db push` aborts before it
-- ever reaches the GIV-119 changes. Production shows exactly that drift:
--
--   * charity_organizations has NO `id` column (1.69M rows)
--   * self_reported_hours has NO `charity_org_id` column
--   * search_charity_organizations returns NO `id` field
--
-- Consequences in production: the Log Hours autocomplete cannot record the
-- selected registry row (org.id is undefined), and any insert that includes
-- charity_org_id in the payload is rejected by PostgREST (PGRST204).
--
-- This migration is idempotent and safe to run against both drifted and
-- already-migrated databases. It is written to avoid a full-table rewrite of
-- the 1.69M-row charity_organizations table:
--   * the `id` column is added as NULLable (instant, metadata-only), the
--     DEFAULT is set afterwards (no rewrite), and existing rows are
--     backfilled with a single UPDATE (readers are never blocked by MVCC)
--   * NOT NULL and the UNIQUE constraint are enforced only after backfill
--   * the RPC is DROPped then CREATEd with `id` first in the result shape and
--     the GIV-233 query plan (EIN fast path, search_vector, 30s timeout)
--
-- Deploy note: run via the manual Database Deploy workflow. The backfill
-- UPDATE over 1.69M rows plus the UNIQUE index build can take a few minutes;
-- reads stay available throughout.

-- =============================================================================
-- 1. charity_organizations.id UUID
-- =============================================================================

ALTER TABLE charity_organizations
  ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE charity_organizations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Backfill rows that predate the column (idempotent).
UPDATE charity_organizations
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE charity_organizations
  ALTER COLUMN id SET NOT NULL;

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
-- 2. self_reported_hours.charity_org_id FK
-- =============================================================================

ALTER TABLE self_reported_hours
  ADD COLUMN IF NOT EXISTS charity_org_id UUID
    REFERENCES charity_organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN self_reported_hours.charity_org_id IS
  'FK to charity_organizations.id. Set when volunteer selects a registry org '
  'from the autocomplete. Enables deduplication across free-text org_name aliases. '
  'Added by GIV-119; reconciled for drifted databases by GIV-959.';

-- =============================================================================
-- 3. search_charity_organizations RPC with `id`
--    DROP first: the return type changes (id added), and CREATE OR REPLACE
--    cannot change a function's return type.
-- =============================================================================

DROP FUNCTION IF EXISTS search_charity_organizations(TEXT, TEXT, TEXT, VARCHAR, INT, INT);

CREATE FUNCTION search_charity_organizations(
  search_query    TEXT        DEFAULT NULL,
  filter_state    TEXT        DEFAULT NULL,
  filter_ntee     TEXT        DEFAULT NULL,
  filter_country  VARCHAR(2)  DEFAULT NULL,
  result_limit    INT         DEFAULT 20,
  result_offset   INT         DEFAULT 0
)
RETURNS TABLE (
  id                UUID,
  ein               TEXT,
  name              TEXT,
  city              TEXT,
  state             TEXT,
  zip               TEXT,
  ntee_cd           TEXT,
  deductibility     TEXT,
  is_on_platform    BOOLEAN,
  platform_charity_id TEXT,
  rank              REAL,
  country           VARCHAR(2),
  registry_source   VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout TO '30s'
AS $$
DECLARE
  clean_query  TEXT;
  is_ein_query BOOLEAN := FALSE;
  tsq          tsquery;
BEGIN
  clean_query := trim(coalesce(search_query, ''));

  IF length(clean_query) >= 2 THEN
    -- Detect EIN-style queries (digits and hyphens only)
    is_ein_query := clean_query ~ '^[0-9\-]+$';
    IF NOT is_ein_query THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  END IF;

  IF is_ein_query THEN
    -- ── EIN lookup: uses btree index on ein ──────────────────────────────
    RETURN QUERY
    SELECT
      co.id,
      co.ein, co.name, co.city, co.state, co.zip, co.ntee_cd,
      co.deductibility, co.is_on_platform,
      co.platform_charity_id::TEXT,
      0.0::REAL AS rank,
      co.country, co.registry_source
    FROM charity_organizations co
    WHERE
      co.ein ILIKE clean_query || '%'
      AND (filter_state   IS NULL OR co.state    = filter_state)
      AND (filter_ntee    IS NULL OR co.ntee_cd  LIKE filter_ntee || '%')
      AND (filter_country IS NULL OR co.country  = filter_country)
    ORDER BY co.is_on_platform DESC, co.name ASC
    LIMIT  result_limit
    OFFSET result_offset;

  ELSIF tsq IS NOT NULL THEN
    -- ── Full-text search via GIN index on search_vector ──────────────────
    RETURN QUERY
    SELECT
      co.id,
      co.ein, co.name, co.city, co.state, co.zip, co.ntee_cd,
      co.deductibility, co.is_on_platform,
      co.platform_charity_id::TEXT,
      ts_rank_cd(co.search_vector, tsq)::REAL AS rank,
      co.country, co.registry_source
    FROM charity_organizations co
    WHERE
      co.search_vector @@ tsq
      AND (filter_state   IS NULL OR co.state    = filter_state)
      AND (filter_ntee    IS NULL OR co.ntee_cd  LIKE filter_ntee || '%')
      AND (filter_country IS NULL OR co.country  = filter_country)
    ORDER BY co.is_on_platform DESC, rank DESC, co.name ASC
    LIMIT  result_limit
    OFFSET result_offset;

  ELSE
    -- ── Filter-only (no search term) ─────────────────────────────────────
    RETURN QUERY
    SELECT
      co.id,
      co.ein, co.name, co.city, co.state, co.zip, co.ntee_cd,
      co.deductibility, co.is_on_platform,
      co.platform_charity_id::TEXT,
      0.0::REAL AS rank,
      co.country, co.registry_source
    FROM charity_organizations co
    WHERE
      (filter_state   IS NULL OR co.state    = filter_state)
      AND (filter_ntee    IS NULL OR co.ntee_cd  LIKE filter_ntee || '%')
      AND (filter_country IS NULL OR co.country  = filter_country)
    ORDER BY co.is_on_platform DESC, co.name ASC
    LIMIT  result_limit
    OFFSET result_offset;
  END IF;
END;
$$;

-- DROP + CREATE clears the GIV-233 EXECUTE grants; re-issue them.
GRANT EXECUTE ON FUNCTION search_charity_organizations(TEXT, TEXT, TEXT, VARCHAR, INT, INT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION search_charity_organizations(TEXT, TEXT, TEXT, VARCHAR, INT, INT) IS
  'Searches charity_organizations by full-text query, EIN, or geographic filters. '
  'SECURITY DEFINER to bypass RLS. '
  'Returns the registry row UUID `id` (GIV-119/GIV-959) plus EIN and platform flags. '
  'GIV-233: EIN vs full-text query paths, EXECUTE grants, 30s statement timeout.';
