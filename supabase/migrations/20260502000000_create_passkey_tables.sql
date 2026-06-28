-- Migration: create tables for WebAuthn/FIDO2 passkey authentication
-- GIV-180: Passkey (WebAuthn/FIDO2) backend + frontend integration

-- Stores registered passkey credentials per user
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL,
  public_key      TEXT NOT NULL,
  counter         BIGINT NOT NULL DEFAULT 0,
  transports      TEXT[] DEFAULT '{}',
  device_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ,

  CONSTRAINT unique_passkey_credential UNIQUE (credential_id)
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id
  ON public.user_passkeys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_credential_id
  ON public.user_passkeys(credential_id);

-- Stores short-lived challenges for registration and authentication ceremonies
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge   TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  type        TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_challenge
  ON public.passkey_challenges(challenge);

-- RLS for user_passkeys
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can view own passkeys"
  ON public.user_passkeys FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can delete own passkeys"
  ON public.user_passkeys FOR DELETE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role can insert passkeys" ON public.user_passkeys;
CREATE POLICY "Service role can insert passkeys"
  ON public.user_passkeys FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update passkeys" ON public.user_passkeys;
CREATE POLICY "Service role can update passkeys"
  ON public.user_passkeys FOR UPDATE
  USING (true);

-- RLS for passkey_challenges (service role only)
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage challenges" ON public.passkey_challenges;
CREATE POLICY "Service role can manage challenges"
  ON public.passkey_challenges FOR ALL
  USING (true);

-- Add 'passkey' as valid primary_auth_method on user_identities
-- Drop and recreate the CHECK constraint to include 'passkey'
ALTER TABLE public.user_identities
  DROP CONSTRAINT IF EXISTS user_identities_primary_auth_method_check;

ALTER TABLE public.user_identities
  ADD CONSTRAINT user_identities_primary_auth_method_check
  CHECK (primary_auth_method IN ('email', 'wallet', 'passkey'));
