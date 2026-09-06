-- =============================================================================
-- Migration: Add seed_key to causes and portfolio_funds
-- GIV-947 (Supabase review follow-up): production-safe, idempotent reseeding
--
-- Adds a stable seed identifier to both tables so the seed script
-- (supabase/seed_causes_and_funds.sql) can upsert with
-- ON CONFLICT (seed_key) DO UPDATE instead of delete-and-reinsert.
-- That keeps row ids stable across reruns, preserves live raised_amount
-- and admin-set status values, and never touches rows the seed does not own.
--
-- Safe to re-run: IF NOT EXISTS on every statement.
-- =============================================================================

ALTER TABLE causes
ADD COLUMN IF NOT EXISTS seed_key text;

CREATE UNIQUE INDEX IF NOT EXISTS causes_seed_key_uidx
ON causes (seed_key)
WHERE seed_key IS NOT NULL;

ALTER TABLE portfolio_funds
ADD COLUMN IF NOT EXISTS seed_key text;

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_funds_seed_key_uidx
ON portfolio_funds (seed_key)
WHERE seed_key IS NOT NULL;
