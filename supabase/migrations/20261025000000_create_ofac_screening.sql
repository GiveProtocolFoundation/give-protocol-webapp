-- =============================================================================
-- Migration: OFAC / sanctions screening
-- GIV-1048: Shared screening service for charity onboarding (MVP-CHR-01) and
-- wallet attribution (MVP-CHR-07).
--
-- Two tables:
--   1. ofac_sdn_entries          — cached Specially Designated Nationals (SDN)
--                                   list, refreshed by the ofac-refresh edge
--                                   function from the Treasury SDN CSV.
--   2. charity_sanctions_screens — immutable audit of each screening run
--                                   against a charity profile.
--
-- The screening itself is performed by the ofac-screen edge function (and the
-- _shared/ofac.ts engine); this migration only provides the storage and the
-- admin/owner read path.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. OFAC SDN list cache
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ofac_sdn_entries (
  entity_number              TEXT         PRIMARY KEY,
  name                       TEXT         NOT NULL,
  entry_type                 TEXT,
  programs                   TEXT[]       NOT NULL DEFAULT '{}',
  remark                     TEXT,
  alt_names                  TEXT[]       NOT NULL DEFAULT '{}',
  digital_currency_addresses JSONB        NOT NULL DEFAULT '[]',
  source                     TEXT         NOT NULL DEFAULT 'ofac_sdn_csv',
  snapshot_at                TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ofac_sdn_entries IS
  'Cached OFAC SDN (Specially Designated Nationals) entries for sanctions '
  'screening. Refreshed by the ofac-refresh edge function from the Treasury '
  'SDN CSV. Created by GIV-1048.';

CREATE INDEX IF NOT EXISTS idx_ofac_sdn_entries_name
  ON ofac_sdn_entries (name);

CREATE INDEX IF NOT EXISTS idx_ofac_sdn_entries_updated_at
  ON ofac_sdn_entries (updated_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Charity sanctions screening audit
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS charity_sanctions_screens (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_profile_id UUID         NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  flow               TEXT         NOT NULL
                                   CHECK (flow IN ('charity_onboarding', 'wallet_attribution', 'admin_review')),
  org_name           TEXT,
  officer_names      JSONB        NOT NULL DEFAULT '[]',
  wallet_addresses   JSONB        NOT NULL DEFAULT '[]',
  status             TEXT         NOT NULL
                                   CHECK (status IN ('passed', 'flagged', 'unavailable')),
  result             JSONB        NOT NULL DEFAULT '{}',
  snapshot_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE charity_sanctions_screens IS
  'Immutable audit of each OFAC screening run against a charity profile. '
  'status = passed (no SDN match), flagged (SDN match, requires operator '
  'review), or unavailable (SDN list could not be loaded at screening time). '
  'Created by GIV-1048.';

CREATE INDEX IF NOT EXISTS idx_charity_sanctions_screens_profile
  ON charity_sanctions_screens (charity_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_charity_sanctions_screens_status
  ON charity_sanctions_screens (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ofac_sdn_entries ENABLE ROW LEVEL SECURITY;

-- SDN cache is write-managed by the ofac-refresh edge function (service_role)
-- and read by the ofac-screen edge function (service_role). No direct client
-- access: anon/authenticated users cannot read raw SDN rows directly.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ofac_sdn_entries' AND policyname='ofac_sdn_entries_service_all') THEN
    CREATE POLICY "ofac_sdn_entries_service_all" ON ofac_sdn_entries
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE charity_sanctions_screens ENABLE ROW LEVEL SECURITY;

-- Write path is the screening edge function (service_role). Reads are via the
-- RPC below (SECURITY DEFINER), so no direct SELECT policies are granted.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='charity_sanctions_screens' AND policyname='charity_sanctions_screens_service_all') THEN
    CREATE POLICY "charity_sanctions_screens_service_all" ON charity_sanctions_screens
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Latest screening read RPC (admin, or the charity's own claimed user)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_charity_sanctions_screen(p_charity_profile_id UUID)
RETURNS TABLE (
  id                 UUID,
  charity_profile_id UUID,
  flow               TEXT,
  org_name           TEXT,
  officer_names      JSONB,
  wallet_addresses   JSONB,
  status             TEXT,
  result             JSONB,
  snapshot_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_admin_user()
    OR EXISTS (
      SELECT 1
      FROM charity_profiles cp
      WHERE cp.id = p_charity_profile_id
        AND cp.claimed_by = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    css.id,
    css.charity_profile_id,
    css.flow,
    css.org_name,
    css.officer_names,
    css.wallet_addresses,
    css.status,
    css.result,
    css.snapshot_at,
    css.created_at
  FROM charity_sanctions_screens css
  WHERE css.charity_profile_id = p_charity_profile_id
  ORDER BY css.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_charity_sanctions_screen(UUID) IS
  'Returns the most recent OFAC sanctions screen for a charity profile. '
  'Callable by admins or by the claiming user of that charity. GIV-1048.';

REVOKE ALL ON FUNCTION get_charity_sanctions_screen(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_charity_sanctions_screen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_charity_sanctions_screen(UUID) TO service_role;