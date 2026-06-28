-- GIV-233: Fix search_charity_organizations returning no results
--
-- Root cause: MISSING EXECUTE GRANT
--   The search_charity_organizations function was created without an explicit
--   GRANT EXECUTE to anon/authenticated roles. Newer Supabase instances revoke
--   the default PostgreSQL PUBLIC EXECUTE privilege, so the function is
--   inaccessible via PostgREST. The service silently returns EMPTY_RESULT on any
--   error, so users see "no results" instead of a permission error.
--
-- Note: search_vector is a GENERATED ALWAYS AS column — it is auto-computed by
--   PostgreSQL from name/sort_name/ein on every insert/update. No backfill or
--   trigger is needed, and UPDATE/SET on this column is not permitted.
--
-- Fixes applied in this migration:
--
--   A. Recreate GIN index (IF NOT EXISTS – no-op if already present).
--   B. Grant EXECUTE to anon, authenticated, and service_role.
--   C. Replace search_charity_organizations with an updated SECURITY DEFINER
--      version that separates EIN vs full-text paths for a clearer query plan.

-- ─────────────────────────────────────────────────────────────────────────────
-- A. GIN index (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_charity_organizations_search_vector
  ON charity_organizations USING gin (search_vector);

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Grant EXECUTE so PostgREST can call the function via the anon/auth keys
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION search_charity_organizations(TEXT, TEXT, TEXT, VARCHAR, INT, INT)
  TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Replace RPC with explicit EIN vs full-text branching
--    search_vector is always populated (generated column), so no ILIKE fallback
--    is needed for NULL values, but we keep the EIN fast-path separate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_charity_organizations(
  search_query TEXT DEFAULT NULL,
  filter_state TEXT DEFAULT NULL,
  filter_ntee  TEXT DEFAULT NULL,
  filter_country VARCHAR(2) DEFAULT NULL,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  ein                TEXT,
  name               TEXT,
  city               TEXT,
  state              TEXT,
  zip                TEXT,
  ntee_cd            TEXT,
  deductibility      TEXT,
  is_on_platform     BOOLEAN,
  platform_charity_id TEXT,
  rank               REAL,
  country            VARCHAR(2),
  registry_source    VARCHAR(50)
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

COMMENT ON FUNCTION search_charity_organizations IS
  'Searches charity_organizations by full-text query, EIN, or geographic filters. '
  'SECURITY DEFINER to bypass RLS. '
  'search_vector is a GENERATED ALWAYS AS column — always populated, no backfill needed. '
  'GIV-233: added EXECUTE grants and separated EIN vs full-text query paths.';
