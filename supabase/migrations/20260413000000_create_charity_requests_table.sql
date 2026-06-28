-- Migration: Create charity_requests table
-- Tracks user interest in unclaimed charities ("Request this Charity" feature).
-- When donors request a charity, the platform can prioritize outreach.

CREATE TABLE IF NOT EXISTS charity_requests (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ein        TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Prevent duplicate requests from the same user for the same charity
CREATE UNIQUE INDEX idx_charity_requests_ein_user
  ON charity_requests (ein, user_id)
  WHERE user_id IS NOT NULL;

-- Index for lookups by EIN (admin dashboards, count queries)
CREATE INDEX idx_charity_requests_ein ON charity_requests (ein);

-- Enable row-level security
ALTER TABLE charity_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own requests
DROP POLICY IF EXISTS "Users can insert their own charity requests" ON charity_requests;
CREATE POLICY "Users can insert their own charity requests"
  ON charity_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own requests (to show "Requested" state)
DROP POLICY IF EXISTS "Users can read their own charity requests" ON charity_requests;
CREATE POLICY "Users can read their own charity requests"
  ON charity_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access (for admin dashboards)
DROP POLICY IF EXISTS "Service role has full access to charity requests" ON charity_requests;
CREATE POLICY "Service role has full access to charity requests"
  ON charity_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE charity_requests IS
  'Tracks donor interest in unclaimed charities. Used by the "Request this Charity" feature on unclaimed profile pages.';
