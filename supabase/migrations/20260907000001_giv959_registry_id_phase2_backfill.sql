-- GIV-959 phase 2/3: backfill charity_organizations.id in small batches.
--
-- Constraint discovered in production (Database Deploy run 34148039710):
-- `supabase db push --linked` executes through the Supabase Management API,
-- which enforces a 120-second server-side statement timeout. The original
-- single DO-loop was cancelled at exactly 120s (SQLSTATE 57014), a few
-- batches short of finishing the 1.69M-row backfill. A direct connection
-- has no such timeout, but GitHub runners cannot reach the IPv6-only
-- direct host — so the migration must live within the 120s per-statement
-- limit instead.
--
-- Strategy: repeated time-boxed DO blocks. Each block stops starting new
-- batches after 85 seconds, so a single statement can run at most 85s plus
-- one in-flight 50k batch (measured at a few seconds each) — comfortably
-- under the 120s limit. Work not finished by one block is picked up by the
-- next. Rows that already have an id are skipped, so every block is
-- idempotent and blocks with no remaining work exit immediately.
--
-- The session timeout raise is defense in depth in case individual batches
-- run slower than measured; harmless if the platform ignores it.

SET statement_timeout = '10min';

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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

-- Repeat: each block carries its own 85-second budget. Six blocks give
-- ~8.5 minutes of combined backfill capacity; the observed full backfill
-- needs ~2-3 minutes. Later blocks no-op once no rows remain.

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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

DO $$
DECLARE
  rows_updated INTEGER;
  batch_size   CONSTANT INTEGER := 50000;
  started      timestamptz := clock_timestamp();
BEGIN
  LOOP
    EXIT WHEN clock_timestamp() - started > interval '85 seconds';
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
