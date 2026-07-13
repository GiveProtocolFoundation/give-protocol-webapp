-- Art. 9(2)(a) explicit-consent capture for donation confirmation (GIV-655)
-- Counsel-accepted baseline per GIV-652 memo §5; board confirmation c7fcdc8d.

CREATE TABLE IF NOT EXISTS donation_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  charity_id uuid,                    -- nullable for crypto (address-keyed)
  charity_wallet_address text,        -- crypto rail
  donation_type text NOT NULL CHECK (donation_type IN ('fiat','crypto')),
  donation_ref text,                  -- fiat: transaction_id; crypto: tx hash
  consent_text_version text NOT NULL, -- 'art9-donation-v1'
  locale text NOT NULL,               -- locale shown at capture time
  consented_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can INSERT their own rows and SELECT their own rows only.
ALTER TABLE donation_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own consent rows"
  ON donation_consents
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can read own consent rows"
  ON donation_consents
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

-- Service role (edge functions) bypasses RLS, so no additional policy needed
-- for the helcim-validate edge function server-side writes.
