-- Migration: refund + dispute tables for GIV-1056
-- Adds fiat_refunds, fiat_disputes, and admin RPCs for refund processing

-- ============================================================
-- 1. fiat_refunds — tracks refund requests and outcomes
-- ============================================================

CREATE TABLE IF NOT EXISTS fiat_refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id     UUID NOT NULL REFERENCES fiat_donations(id),
  amount_cents    INTEGER NOT NULL CHECK (amount_cents > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'denied')),
  processor       TEXT NOT NULL
    CHECK (processor IN ('helcim', 'paypal')),
  processor_refund_id   TEXT,          -- Helcim refundTransactionId or PayPal refund ID
  processor_response    JSONB,         -- raw processor response for audit
  initiated_by    UUID,                -- admin user who initiated the refund
  denial_reason   TEXT,                -- reason if denied (e.g. outside 30-day window)
  refunded_at     TIMESTAMPTZ,         -- when processor confirmed refund
  -- on-chain reversal tracking
  attestation_reversal_status TEXT DEFAULT 'pending'
    CHECK (attestation_reversal_status IN ('pending', 'submitted', 'confirmed', 'failed', 'skipped')),
  attestation_reversal_tx_hash TEXT,
  attestation_reversal_error   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiat_refunds_donation_id ON fiat_refunds(donation_id);
CREATE INDEX idx_fiat_refunds_status ON fiat_refunds(status);
CREATE INDEX idx_fiat_refunds_created_at ON fiat_refunds(created_at);

-- ============================================================
-- 2. fiat_disputes — tracks payment processor disputes/chargebacks
-- ============================================================

CREATE TABLE IF NOT EXISTS fiat_disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id         UUID NOT NULL REFERENCES fiat_donations(id),
  amount_cents        INTEGER NOT NULL CHECK (amount_cents > 0),
  currency            TEXT NOT NULL DEFAULT 'USD',
  processor           TEXT NOT NULL
    CHECK (processor IN ('helcim', 'paypal')),
  processor_dispute_id TEXT NOT NULL,   -- Helcim dispute ID or PayPal dispute ID
  dispute_reason      TEXT,             -- chargeback reason code
  status              TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_won', 'resolved_lost', 'resolved_settled')),
  -- netting: amount to withhold from future disbursements
  net_amount_cents    INTEGER NOT NULL DEFAULT 0,
  netted_at           TIMESTAMPTZ,      -- when netting was applied
  netting_note        TEXT,
  -- on-chain reversal (applied if dispute is lost)
  attestation_reversal_status TEXT DEFAULT 'pending'
    CHECK (attestation_reversal_status IN ('pending', 'submitted', 'confirmed', 'failed', 'skipped')),
  attestation_reversal_tx_hash TEXT,
  attestation_reversal_error   TEXT,
  processor_response  JSONB,            -- raw processor data for audit
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiat_disputes_donation_id ON fiat_disputes(donation_id);
CREATE INDEX idx_fiat_disputes_status ON fiat_disputes(status);
CREATE INDEX idx_fiat_disputes_processor_dispute_id ON fiat_disputes(processor_dispute_id);

-- ============================================================
-- 3. disbursement_holds — netting ledger for dispute holds
-- ============================================================

CREATE TABLE IF NOT EXISTS disbursement_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id      UUID NOT NULL,
  dispute_id      UUID REFERENCES fiat_disputes(id),
  refund_id       UUID REFERENCES fiat_refunds(id),
  hold_amount_cents INTEGER NOT NULL CHECK (hold_amount_cents > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'applied', 'released')),
  applied_at      TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disbursement_holds_charity_id ON disbursement_holds(charity_id);
CREATE INDEX idx_disbursement_holds_status ON disbursement_holds(status);

-- ============================================================
-- 4. Admin RPC: admin_process_refund
--    Validates 30-day window and creates a refund record
-- ============================================================

CREATE OR REPLACE FUNCTION admin_process_refund(
  p_donation_id     UUID,
  p_reason          TEXT,
  p_admin_user_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation RECORD;
  v_existing_refund RECORD;
  v_refund_id UUID;
  v_days_since INTEGER;
  v_processor TEXT;
BEGIN
  -- 1. Look up the donation
  SELECT id, amount_cents, currency, status, payment_processor,
         transaction_id, charity_id, created_at
  INTO v_donation
  FROM fiat_donations
  WHERE id = p_donation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation not found');
  END IF;

  -- 2. Check donation status
  IF v_donation.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Only completed donations can be refunded. Current status: ' || v_donation.status);
  END IF;

  -- 3. Check for existing refund
  SELECT id, status INTO v_existing_refund
  FROM fiat_refunds
  WHERE donation_id = p_donation_id
    AND status NOT IN ('failed', 'denied')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error',
      'A refund already exists for this donation (refund_id: ' || v_existing_refund.id || ', status: ' || v_existing_refund.status || ')');
  END IF;

  -- 4. Enforce 30-day refund window
  v_days_since := EXTRACT(DAY FROM (now() - v_donation.created_at));
  IF v_days_since > 30 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Refund window has expired. Donation was ' || v_days_since || ' days ago (30-day limit).');
  END IF;

  -- 5. Determine processor
  v_processor := COALESCE(v_donation.payment_processor, 'helcim');

  -- 6. Create refund record
  INSERT INTO fiat_refunds (
    donation_id, amount_cents, currency, reason, status,
    processor, initiated_by
  )
  VALUES (
    p_donation_id, v_donation.amount_cents, v_donation.currency,
    p_reason, 'approved', v_processor, p_admin_user_id
  )
  RETURNING id INTO v_refund_id;

  -- 7. Return success with refund details
  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'donation_id', p_donation_id,
    'amount_cents', v_donation.amount_cents,
    'currency', v_donation.currency,
    'processor', v_processor,
    'transaction_id', v_donation.transaction_id,
    'days_since_donation', v_days_since
  );
END;
$$;

-- ============================================================
-- 5. Admin RPC: admin_list_refunds
-- ============================================================

CREATE OR REPLACE FUNCTION admin_list_refunds(
  p_status    TEXT DEFAULT NULL,
  p_limit     INTEGER DEFAULT 50,
  p_offset    INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'refunds', COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM fiat_refunds
              WHERE (p_status IS NULL OR status = p_status))
  )
  INTO v_result
  FROM (
    SELECT
      fr.id,
      fr.donation_id,
      fr.amount_cents,
      fr.currency,
      fr.reason,
      fr.status,
      fr.processor,
      fr.processor_refund_id,
      fr.denial_reason,
      fr.refunded_at,
      fr.attestation_reversal_status,
      fr.created_at,
      fd.donor_name,
      fd.donor_email,
      fd.charity_id,
      fd.transaction_id AS donation_transaction_id
    FROM fiat_refunds fr
    JOIN fiat_donations fd ON fd.id = fr.donation_id
    WHERE (p_status IS NULL OR fr.status = p_status)
    ORDER BY fr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) r;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 6. Admin RPC: admin_list_disputes
-- ============================================================

CREATE OR REPLACE FUNCTION admin_list_disputes(
  p_status    TEXT DEFAULT NULL,
  p_limit     INTEGER DEFAULT 50,
  p_offset    INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'disputes', COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM fiat_disputes
              WHERE (p_status IS NULL OR status = p_status))
  )
  INTO v_result
  FROM (
    SELECT
      fd2.id,
      fd2.donation_id,
      fd2.amount_cents,
      fd2.currency,
      fd2.processor,
      fd2.processor_dispute_id,
      fd2.dispute_reason,
      fd2.status,
      fd2.net_amount_cents,
      fd2.netted_at,
      fd2.attestation_reversal_status,
      fd2.opened_at,
      fd2.resolved_at,
      fd2.created_at,
      fd.donor_name,
      fd.donor_email,
      fd.charity_id,
      fd.transaction_id AS donation_transaction_id
    FROM fiat_disputes fd2
    JOIN fiat_donations fd ON fd.id = fd2.donation_id
    WHERE (p_status IS NULL OR fd2.status = p_status)
    ORDER BY fd2.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) d;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 7. Row-Level Security
-- ============================================================

ALTER TABLE fiat_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiat_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_holds ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access on fiat_refunds"
  ON fiat_refunds FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on fiat_disputes"
  ON fiat_disputes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on disbursement_holds"
  ON disbursement_holds FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_fiat_refunds_updated_at
  BEFORE UPDATE ON fiat_refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_fiat_disputes_updated_at
  BEFORE UPDATE ON fiat_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
