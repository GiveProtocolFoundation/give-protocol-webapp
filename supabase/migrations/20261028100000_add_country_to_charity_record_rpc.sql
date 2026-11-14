-- Migration: Add country and registry_source to get_charity_record_by_ein RPC
-- Ticket: GIV-1052 — Jurisdiction-gating control on donation CTAs for non-US charities.
-- The charity_organizations table already has country (VARCHAR(2)) and registry_source,
-- but the lookup RPC omitted them. The webapp needs country to disable the donation UI
-- for non-US charities.

-- Drop existing function first because PostgreSQL disallows changing RETURNS TABLE
-- (row type defined by OUT parameters) with CREATE OR REPLACE FUNCTION (SQLSTATE 42P13).
DROP FUNCTION IF EXISTS get_charity_record_by_ein(TEXT);

CREATE OR REPLACE FUNCTION get_charity_record_by_ein(lookup_ein TEXT)
RETURNS TABLE (
  ein              TEXT,
  name             TEXT,
  ico              TEXT,
  street           TEXT,
  city             TEXT,
  state            TEXT,
  zip              TEXT,
  group_exemption  TEXT,
  subsection       TEXT,
  affiliation      TEXT,
  classification   TEXT,
  ruling           TEXT,
  deductibility    TEXT,
  foundation       TEXT,
  activity         TEXT,
  organization     TEXT,
  status           TEXT,
  ntee_cd          TEXT,
  sort_name        TEXT,
  is_on_platform   BOOLEAN,
  country          TEXT,
  registry_source  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  -- Strip hyphens/non-digits for US EINs; keep original for international IDs
  v_normalized := regexp_replace(COALESCE(lookup_ein, ''), '-', '', 'g');

  RETURN QUERY
  SELECT
    co.ein,
    co.name,
    co.ico,
    co.street,
    co.city,
    co.state,
    co.zip,
    co.group_exemption,
    co.subsection,
    co.affiliation,
    co.classification,
    co.ruling,
    co.deductibility,
    co.foundation,
    co.activity,
    co.organization,
    co.status,
    co.ntee_cd,
    co.sort_name,
    co.is_on_platform,
    co.country::TEXT,
    co.registry_source::TEXT
  FROM charity_organizations co
  WHERE co.ein = v_normalized
     OR co.ein = lookup_ein
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_charity_record_by_ein(TEXT) IS
  'Returns a single charity organization record by EIN, including country and registry_source. '
  'Handles both hyphenated (12-3456789) and plain (123456789) formats. '
  'SECURITY DEFINER to bypass RLS on charity_organizations table.';

-- Preserve existing grants
GRANT EXECUTE ON FUNCTION get_charity_record_by_ein(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_charity_record_by_ein(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_charity_record_by_ein(TEXT) TO service_role;
