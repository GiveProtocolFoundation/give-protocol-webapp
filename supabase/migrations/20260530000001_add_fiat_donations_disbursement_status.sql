-- Add disbursement_status column to fiat_donations
-- This column tracks whether a donation has been disbursed to the charity.
-- Referenced by CharityPortal and contributionAggregationService but never added to the schema.

ALTER TABLE fiat_donations
  ADD COLUMN IF NOT EXISTS disbursement_status TEXT
    DEFAULT 'pending'
    CHECK (disbursement_status IN ('pending', 'disbursed', 'failed'));

COMMENT ON COLUMN fiat_donations.disbursement_status IS
  'Tracks whether the donation funds have been disbursed to the charity. '
  'pending = awaiting disbursement, disbursed = funds sent, failed = disbursement failed.';

CREATE INDEX IF NOT EXISTS idx_fiat_donations_disbursement_status
  ON fiat_donations(disbursement_status);
