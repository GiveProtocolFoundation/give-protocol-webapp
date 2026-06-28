-- =============================================================================
-- Migration: Create portfolio_funds table
-- GIV-166: Portfolio Funds Supabase table + carousel + admin CRUD
-- =============================================================================

CREATE TABLE IF NOT EXISTS portfolio_funds (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  image_url   TEXT,
  charity_ids UUID[]        NOT NULL DEFAULT '{}',
  status      TEXT          NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'archived')),
  created_by  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE portfolio_funds IS
  'Admin-curated portfolio funds grouping multiple verified charities under a theme. '
  'Created by GIV-166.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_portfolio_funds_status
  ON portfolio_funds (status);

CREATE INDEX IF NOT EXISTS idx_portfolio_funds_category
  ON portfolio_funds (category);

CREATE INDEX IF NOT EXISTS idx_portfolio_funds_active_image
  ON portfolio_funds (status, image_url)
  WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_portfolio_funds_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portfolio_funds_updated_at ON portfolio_funds;
CREATE TRIGGER trg_portfolio_funds_updated_at
  BEFORE UPDATE ON portfolio_funds
  FOR EACH ROW EXECUTE FUNCTION trg_set_portfolio_funds_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE portfolio_funds ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view active funds
DROP POLICY IF EXISTS "portfolio_funds_public_select" ON portfolio_funds;
CREATE POLICY "portfolio_funds_public_select" ON portfolio_funds
  FOR SELECT
  TO public
  USING (status = 'active');

-- Admins can read all (including paused/archived)
DROP POLICY IF EXISTS "portfolio_funds_admin_select" ON portfolio_funds;
CREATE POLICY "portfolio_funds_admin_select" ON portfolio_funds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.type = 'admin'
    )
    OR auth.role() = 'service_role'
  );

-- Admins and service_role can insert
DROP POLICY IF EXISTS "portfolio_funds_admin_insert" ON portfolio_funds;
CREATE POLICY "portfolio_funds_admin_insert" ON portfolio_funds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.type = 'admin'
    )
    OR auth.role() = 'service_role'
  );

-- Admins and service_role can update
DROP POLICY IF EXISTS "portfolio_funds_admin_update" ON portfolio_funds;
CREATE POLICY "portfolio_funds_admin_update" ON portfolio_funds
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.type = 'admin'
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.type = 'admin'
    )
    OR auth.role() = 'service_role'
  );

-- Admins and service_role can delete
DROP POLICY IF EXISTS "portfolio_funds_admin_delete" ON portfolio_funds;
CREATE POLICY "portfolio_funds_admin_delete" ON portfolio_funds
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.type = 'admin'
    )
    OR auth.role() = 'service_role'
  );
