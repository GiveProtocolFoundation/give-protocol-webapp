-- GIV-959 phase 2/3: backfill charity_organizations.id in small batches.
--
-- A single UPDATE over all ~1.69M rows exceeds the Supabase SQL editor's
-- statement timeout (that is exactly how the first reconciliation attempt
-- failed). This phase updates in batches of 50,000 rows so no single
-- statement runs long. When executed via `supabase db push` (direct
-- connection, no statement timeout) the loop completes in one transaction,
-- typically within a couple of minutes.
--
-- If you are running this by hand in the Supabase SQL editor and the DO
-- block still hits the editor's request timeout, run the plain batched
-- UPDATE from the GIV-959/GIV-966 runbook instead — it is the same
-- operation as one explicit statement you re-run until it reports 0 rows.
--
-- Idempotent: rows that already have an id are skipped.

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
BEGIN
  LOOP
    UPDATE charity_organizations
    SET id = gen_random_uuid()
    WHERE ctid IN (
      SELECT ctid
      FROM charity_organizations
      WHERE id IS NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
  END LOOP;
END $$;
