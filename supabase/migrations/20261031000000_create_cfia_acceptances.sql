-- CFIA (Charitable Fundraising Industry Agreement) acceptance recording (GIV-1051)
--
-- Stores each charity's acceptance of the CFIA legal text.
-- The legal text itself is NOT stored in this table — only the version identifier.
-- The text is finalized in a separate legal-drafting session with no committed
-- delivery date; this table stores the plumbing so activation can proceed once
-- the text lands.
--
-- Design notes:
--   - One acceptance row per (charity_profile_id, legal_text_version) pair.
--   - signer_* columns capture the human who accepted on behalf of the charity.
--   - signature_data stores the drawn signature as a data-URI (PNG).
--   - ip_address and user_agent provide forensic context for the signing event.
--   - The feature gate is outside this table: no charity can be activated until
--     the CFIA text is finalized and a row exists here for that charity+version.

CREATE TABLE IF NOT EXISTS cfia_acceptances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_profile_id uuid NOT NULL REFERENCES charity_profiles(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id),

  -- Legal text versioning (text content lives outside the DB)
  legal_text_version text NOT NULL,           -- e.g. 'cfia-v1.0'
  legal_text_hash    text,                    -- optional SHA-256 of the presented text

  -- Signer identity snapshot at acceptance time
  signer_name    text NOT NULL,
  signer_title   text NOT NULL,
  signer_email   text NOT NULL,

  -- Drawn signature capture (base64 data-URI of the PNG canvas export)
  signature_data text NOT NULL,

  -- Forensic / audit metadata
  ip_address     inet,
  user_agent     text,
  accepted_at    timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate acceptances of the same version
  CONSTRAINT uq_cfia_charity_version UNIQUE (charity_profile_id, legal_text_version)
);

-- Index for looking up a charity's latest acceptance
CREATE INDEX idx_cfia_acceptances_charity
  ON cfia_acceptances (charity_profile_id, accepted_at DESC);

-- RLS: users can INSERT their own acceptance rows
ALTER TABLE cfia_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own CFIA acceptance"
  ON cfia_acceptances
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can read own CFIA acceptances"
  ON cfia_acceptances
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

-- Admin read access for compliance review
CREATE POLICY "Admins can read all CFIA acceptances"
  ON cfia_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()::text
        AND profiles.type = 'admin'
    )
  );

-- RPC: record a CFIA acceptance with server-side timestamp and metadata.
-- SECURITY DEFINER so the function can read request headers for IP/user-agent.
CREATE OR REPLACE FUNCTION record_cfia_acceptance(
  p_charity_profile_id uuid,
  p_legal_text_version text,
  p_legal_text_hash    text DEFAULT NULL,
  p_signer_name        text DEFAULT NULL,
  p_signer_title       text DEFAULT NULL,
  p_signer_email       text DEFAULT NULL,
  p_signature_data     text DEFAULT NULL
)
RETURNS SETOF cfia_acceptances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ip      inet;
  v_ua      text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Extract forensic metadata from the request headers
  BEGIN
    v_ip := (current_setting('request.headers', true)::json->>'x-forwarded-for')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ua := current_setting('request.headers', true)::json->>'user-agent';

  RETURN QUERY
  INSERT INTO cfia_acceptances (
    charity_profile_id,
    user_id,
    legal_text_version,
    legal_text_hash,
    signer_name,
    signer_title,
    signer_email,
    signature_data,
    ip_address,
    user_agent
  ) VALUES (
    p_charity_profile_id,
    v_user_id,
    p_legal_text_version,
    p_legal_text_hash,
    p_signer_name,
    p_signer_title,
    p_signer_email,
    p_signature_data,
    v_ip,
    v_ua
  )
  ON CONFLICT ON CONSTRAINT uq_cfia_charity_version DO NOTHING
  RETURNING *;
END;
$$;

-- Grant execute to authenticated users (RLS still enforces ownership)
GRANT EXECUTE ON FUNCTION record_cfia_acceptance TO authenticated;

-- Helper: check whether a charity has accepted a given CFIA version.
-- Returns the acceptance row if it exists, empty set otherwise.
CREATE OR REPLACE FUNCTION get_cfia_acceptance(
  p_charity_profile_id uuid,
  p_legal_text_version text DEFAULT NULL
)
RETURNS SETOF cfia_acceptances
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_legal_text_version IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM cfia_acceptances
    WHERE charity_profile_id = p_charity_profile_id
      AND legal_text_version = p_legal_text_version
    ORDER BY accepted_at DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT * FROM cfia_acceptances
    WHERE charity_profile_id = p_charity_profile_id
    ORDER BY accepted_at DESC
    LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cfia_acceptance TO authenticated;
