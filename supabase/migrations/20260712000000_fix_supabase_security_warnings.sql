-- =============================================================================
-- Migration: Fix Supabase Security Advisor warnings (GIV-647)
-- Description: Addresses three categories of security linter warnings:
--   1. function_search_path_mutable — 4 trigger functions missing SET search_path
--   2. anon_security_definer_function_executable — SECURITY DEFINER functions
--      callable by unauthenticated anon role when they shouldn't be
--   3. authenticated_security_definer_function_executable — re-applies REVOKE/GRANT
--      for admin functions where DROP+CREATE in later migrations reset privileges
-- Note: auth_leaked_password_protection is a Supabase Dashboard setting, not SQL.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1: Fix search_path on 4 trigger functions
-- Uses CREATE OR REPLACE to preserve existing trigger associations.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. handle_new_user_profile (trigger on auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'type', 'donor')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 1b. update_charity_wallets_updated_at (trigger on charity_wallets)
CREATE OR REPLACE FUNCTION public.update_charity_wallets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1c. update_platform_news_updated_at (trigger on platform_news)
CREATE OR REPLACE FUNCTION public.update_platform_news_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1d. validate_charity_wallet (trigger on charity_wallets)
CREATE OR REPLACE FUNCTION public.validate_charity_wallet()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Safe multisig: requires valid signer configuration
  IF NEW.wallet_type = 'safe' THEN
    IF NEW.signer_count IS NULL OR NEW.signer_count < 2 THEN
      RAISE EXCEPTION 'Safe wallets require signer_count >= 2';
    END IF;
    IF NEW.signer_threshold IS NULL OR NEW.signer_threshold < 1 THEN
      RAISE EXCEPTION 'Safe wallets require signer_threshold >= 1';
    END IF;
    IF NEW.signer_threshold > NEW.signer_count THEN
      RAISE EXCEPTION 'signer_threshold cannot exceed signer_count';
    END IF;
    IF NEW.proof_of_control_verified_at IS NULL THEN
      RAISE EXCEPTION 'Safe wallets require proof_of_control_verified_at';
    END IF;
  END IF;

  -- Institutional custody: requires custodian details
  IF NEW.wallet_type = 'institutional' THEN
    IF NEW.custodian_name IS NULL OR NEW.custodian_name = '' THEN
      RAISE EXCEPTION 'Institutional wallets require custodian_name';
    END IF;
    IF NEW.custodian_attestation_doc_url IS NULL OR NEW.custodian_attestation_doc_url = '' THEN
      RAISE EXCEPTION 'Institutional wallets require custodian_attestation_doc_url';
    END IF;
  END IF;

  -- Single-signer EOA: requires explicit risk acknowledgment
  IF NEW.wallet_type = 'eoa' THEN
    IF NEW.risk_acknowledgment_at IS NULL THEN
      RAISE EXCEPTION 'EOA wallets require risk_acknowledgment_at';
    END IF;
    IF NEW.risk_acknowledgment_user_id IS NULL THEN
      RAISE EXCEPTION 'EOA wallets require risk_acknowledgment_user_id';
    END IF;
  END IF;

  -- All types: require proof of control OR custodian attestation
  IF NEW.wallet_type IN ('eoa', 'safe') AND NEW.proof_of_control_verified_at IS NULL THEN
    RAISE EXCEPTION '% wallets require proof_of_control_verified_at', NEW.wallet_type;
  END IF;
  IF NEW.wallet_type = 'institutional' AND NEW.custodian_attestation_doc_url IS NULL THEN
    RAISE EXCEPTION 'Institutional wallets require custodian_attestation_doc_url';
  END IF;

  -- 24h rate-limit on is_primary swap
  IF TG_OP = 'UPDATE' AND NEW.is_primary = true AND OLD.is_primary = false THEN
    IF EXISTS (
      SELECT 1 FROM public.charity_wallets
      WHERE charity_profile_id = NEW.charity_profile_id
        AND chain_id = NEW.chain_id
        AND is_primary = true
        AND id <> NEW.id
        AND updated_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RAISE EXCEPTION 'Primary wallet swap rate-limited: must wait 24 hours between swaps';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 2: Revoke EXECUTE from anon on SECURITY DEFINER functions that should
--         not be callable by unauthenticated users.
--
-- Trigger functions: revoke from both anon AND authenticated since they should
-- only be invoked by the trigger mechanism (which bypasses EXECUTE checks).
--
-- RPC functions: revoke from anon only; re-grant to correct roles.
--
-- Intentionally public functions are left as-is:
--   - search_charity_organizations (public search)
--   - get_charity_record_by_ein (public lookup)
--   - get_or_create_charity_profile (public profile creation)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Trigger functions — not callable as RPCs
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_charity_wallets_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_platform_news_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_charity_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_charity_request() FROM PUBLIC, anon, authenticated;

-- 2b. Admin functions — authenticated + service_role only
--     Internal is_admin_user() guard handles authorization; REVOKE from anon
--     removes unnecessary attack surface.
REVOKE ALL ON FUNCTION public.admin_list_charities(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_charities(text, text, text, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_swap_primary_wallet(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_swap_primary_wallet(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_alerts() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_recent_activity(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_recent_activity(integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.insert_admin_audit_read_entry(text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_admin_audit_read_entry(text, uuid, jsonb) TO authenticated, service_role;

-- 2c. Charity management functions — authenticated + service_role only
REVOKE ALL ON FUNCTION public.claim_charity_profile(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_charity_profile(text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_charity_profile(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_charity_profile(text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_charity_profile_by_signer_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_charity_profile_by_signer_email() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_charity_verification_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_charity_verification_status(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_charity_profile_signer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_charity_profile_signer() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.repair_claimed_by(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_claimed_by(text, uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_charity_asset_url(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_charity_asset_url(text, text, text) TO authenticated, service_role;

-- 2d. GDPR erasure — service_role only (re-apply; earlier REVOKE may have been
--     lost when function was DROPped and recreated in a later migration)
REVOKE ALL ON FUNCTION public.execute_gdpr_erasure(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_gdpr_erasure(uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 3: Intentionally public SECURITY DEFINER functions
-- The following functions are correctly accessible by anon — they serve
-- public-facing charity search and lookup. No changes needed, documented here
-- for completeness and to satisfy the security review.
--
--   - search_charity_organizations(text, text, text, varchar, int, int)
--     → Public charity search, granted to anon, authenticated, service_role
--
--   - get_charity_record_by_ein(text)
--     → Public EIN lookup, granted to anon, authenticated, service_role
--
--   - get_or_create_charity_profile(text)
--     → Public profile stub creation, granted to anon, authenticated, service_role
--
-- These are flagged by the Supabase linter but are intentionally public.
-- They use SET search_path = public and operate on public charity data.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 4: auth_leaked_password_protection
-- This is a Supabase Dashboard setting, not configurable via SQL migration.
-- Action required: Enable in Supabase Dashboard:
--   Authentication → Settings → Password Protection → Enable Leaked Password Protection
-- Dashboard URL: https://supabase.com/dashboard/project/lhbyfidtlhojnrewpstp/auth/settings
-- ─────────────────────────────────────────────────────────────────────────────
