-- GIV-383: Add consent audit trail columns to volunteer_applications
-- Persists age confirmation, privacy notice acknowledgement, consent timestamp,
-- and consent text version for GDPR Art. 5(2) accountability.

ALTER TABLE volunteer_applications
  ADD COLUMN IF NOT EXISTS age_confirmation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_notice_acknowledged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

COMMENT ON COLUMN volunteer_applications.age_confirmation IS 'Age >= 16 confirmed by applicant at submission';
COMMENT ON COLUMN volunteer_applications.privacy_notice_acknowledged IS 'Privacy notice read and acknowledged by applicant';
COMMENT ON COLUMN volunteer_applications.consent_given_at IS 'Timestamp when consent was given by the applicant';
COMMENT ON COLUMN volunteer_applications.consent_version IS 'Version identifier of the consent text presented to the applicant';
