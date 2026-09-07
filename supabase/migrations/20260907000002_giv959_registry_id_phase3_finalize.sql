-- GIV-959 phase 3/3: finalize the registry schema.
--
-- Requires phase 2 (backfill) to have completed: every charity_organizations
-- row must have an id before NOT NULL can be enforced. The NOT NULL check
-- and the RPC swap are fast (a table scan of a few seconds and DDL).

-- =============================================================================
-- 1. Enforce NOT NULL on charity_organizations.id
--    (verification scan of ~1.69M rows: seconds)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'charity_organizations'
      AND column_name = 'id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE charity_organizations
      ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 2. search_charity_organizations RPC with `id`
--    DROP first: the return type changes (id added) and CREATE OR REPLACE
--    cannot change a function's return type. This is the same bug that broke
--    the migration chain in the first place (GIV-233).
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
