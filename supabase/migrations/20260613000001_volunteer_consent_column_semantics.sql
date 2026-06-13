-- GIV-494: Retire/clarify legacy volunteer-consent columns after the GIV-382
-- (PR #454) legal-basis switch.
--
-- Context: GIV-382 moved volunteer-application processing off "consent" as a
-- legal basis. Application processing is now an Art. 6(1)(b) acknowledgment
-- (steps prior to, and performance of, a volunteer arrangement), and
-- international transfers no longer rely on consent (they rely on Art. 46
-- SCCs disclosed in the Privacy Notice). New records are written with
-- consent_version = 'v2'; pre-fix records are 'v1'.
--
-- CTO data-model determination (co-signed by Head of Data):
--   1. consent_given: DO NOT rename. The physical column flows into the
--      GDPR Art. 20 portability export (supabase/functions/privacy-export),
--      types/supabase.ts and tests; a rename would be a breaking schema change
--      requiring a coordinated edge-function/app deploy for no functional gain.
--      The consent_version discriminator already disambiguates v1 (consent) vs
--      v2 (Art. 6(1)(b) acknowledgment) semantics. We document the new meaning
--      in the column COMMENT instead.
--   2. international_transfers_consent: RETAIN as deprecated / historical-only.
--      Do NOT drop. It preserves the v1 accountability record of what applicants
--      were told and remains part of each data subject's Art. 20 export. It is
--      legally inert for v2+ records (always false; the UI no longer collects it).
--   3. Backfill consent_version = 'v1' for all existing rows where it is NULL so
--      the version discriminator is reliable for every pre-fix record.
--
-- This migration is DDL-comment + data-backfill only. It makes no behavioural
-- code change and does not conflict with PR #454; it should land after #454.

-- 1. Document the post-GIV-382 meaning of consent_given (kept name).
COMMENT ON COLUMN volunteer_applications.consent_given IS
  'Application-processing acknowledgment. For consent_version >= v2 this records an Art. 6(1)(b) processing acknowledgment (NOT consent-as-legal-basis); for v1/NULL it recorded essential-processing consent. Name retained for export/schema stability (GIV-494, follow-up to GIV-382).';

-- 2. Mark international_transfers_consent as deprecated / historical-only.
COMMENT ON COLUMN volunteer_applications.international_transfers_consent IS
  'DEPRECATED / historical-only (GIV-494). Legally inert from consent_version v2 onward: international transfers rely on Art. 46 SCCs disclosed in the Privacy Notice, not on consent. Retained to preserve the v1 accountability record and the data subject Art. 20 export. New records are always false; the form no longer collects it (GIV-382 / PR #454).';

-- 3. Backfill the version discriminator for existing rows so v1 vs v2 is reliable.
UPDATE volunteer_applications
SET consent_version = 'v1'
WHERE consent_version IS NULL;
