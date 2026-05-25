-- =============================================================================
-- Migration: Platform News table with admin CRUD support
-- Issue: GIV-279
-- Description: Replaces static src/data/newsUpdates.ts with a Supabase table
--   so admins can manage platform news without code deploys.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create platform_news table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_news (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  url          TEXT,
  image_url    TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category     TEXT        NOT NULL DEFAULT 'general'
                           CHECK (category IN ('general', 'product', 'impact', 'partnership', 'governance')),
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_news IS 'Admin-managed news items shown on the public browse page.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_platform_news_active_published
  ON platform_news (is_active, published_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_platform_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_news_updated_at ON platform_news;
CREATE TRIGGER trg_platform_news_updated_at
  BEFORE UPDATE ON platform_news
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_news_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE platform_news ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read active news
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_news_public_read' AND tablename = 'platform_news'
  ) THEN
    CREATE POLICY platform_news_public_read ON platform_news
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Admin insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_news_admin_insert' AND tablename = 'platform_news'
  ) THEN
    CREATE POLICY platform_news_admin_insert ON platform_news
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
      );
  END IF;
END $$;

-- Admin update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_news_admin_update' AND tablename = 'platform_news'
  ) THEN
    CREATE POLICY platform_news_admin_update ON platform_news
      FOR UPDATE
      TO authenticated
      USING (auth.jwt() -> 'user_metadata' ->> 'type' = 'admin')
      WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'type' = 'admin');
  END IF;
END $$;

-- Admin delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_news_admin_delete' AND tablename = 'platform_news'
  ) THEN
    CREATE POLICY platform_news_admin_delete ON platform_news
      FOR DELETE
      TO authenticated
      USING (auth.jwt() -> 'user_metadata' ->> 'type' = 'admin');
  END IF;
END $$;

-- Admin select (includes inactive items)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_news_admin_read_all' AND tablename = 'platform_news'
  ) THEN
    CREATE POLICY platform_news_admin_read_all ON platform_news
      FOR SELECT
      TO authenticated
      USING (auth.jwt() -> 'user_metadata' ->> 'type' = 'admin');
  END IF;
END $$;

-- Grant access
GRANT SELECT ON platform_news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON platform_news TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed with existing static data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO platform_news (id, title, content, url, published_at, category, is_active)
VALUES
  (gen_random_uuid(), 'Multi-chain distributions live on Moonbeam',
   'Charities can now receive scheduled donations on Moonbeam in addition to Ethereum and Polygon.',
   '/news/multichain-moonbeam', '2026-04-15'::timestamptz, 'product', true),
  (gen_random_uuid(), 'Quarterly impact report — Q1 2026',
   'Over $4.2M in on-chain donations and 18,700 verified volunteer hours across 430 nonprofits this quarter.',
   '/news/q1-2026-impact', '2026-04-02'::timestamptz, 'impact', true),
  (gen_random_uuid(), 'New verification tier for registered 501(c)(3) charities',
   'A lightweight onboarding path is now available for nonprofits already registered with the IRS.',
   '/news/501c3-tier', '2026-03-18'::timestamptz, 'product', true),
  (gen_random_uuid(), 'Volunteer hour endorsements moving on-chain',
   'Charity endorsements of volunteer hours are being migrated to a tamper-resistant on-chain registry.',
   '/news/endorsements-onchain', '2026-03-05'::timestamptz, 'product', true),
  (gen_random_uuid(), 'Give Protocol joins the Open Philanthropy Signals coalition',
   'We are collaborating with partners across the sector to publish shared transparency signals for donors.',
   '/news/open-philanthropy-signals', '2026-02-20'::timestamptz, 'partnership', true)
ON CONFLICT DO NOTHING;
