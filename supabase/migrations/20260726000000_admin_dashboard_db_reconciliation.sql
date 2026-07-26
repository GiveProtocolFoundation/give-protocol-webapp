-- =============================================================================
-- GIV-721: Admin dashboard database reconciliation
--
-- Production audit (2026-07-25, CTO) found the live database missing an entire
-- cluster of admin RPCs that the frontend has always called, plus schema drift
-- in fiat_donations. This single idempotent script brings production to the
-- state the webapp expects. It is safe to run more than once.
--
-- What it fixes, by admin page:
--   1. Charity Management  — re-applies the canonical admin_list_charities
--      (the 20260725000004 fix was merged but never successfully applied:
--      its ALTER TABLE half ran, the function recreate half failed with 42P13
--      before PR #513 added the DROP FUNCTION guard).
--   2. Donation Monitoring — creates donation_flags table and the four
--      donation RPCs (admin_list_donations, admin_donation_summary,
--      admin_flag_donation, admin_resolve_flag) that never existed in any
--      migration. Also adds 13 fiat_donations columns the deployed
--      helcim-validate edge function writes (inserts currently fail).
--   3. Charity Requests    — creates admin_list_charity_requests (was in
--      20260501000000 but never applied to production).
--   4. Reports             — creates admin_charity_growth_report,
--      admin_donor_activity_report, admin_volunteer_report.
--   5. Volunteer Validation— creates admin_validation_stats,
--      admin_override_validation.
--   6. Content Moderation  — adds moderation columns to causes and
--      volunteer_opportunities; creates admin_list_causes,
--      admin_list_opportunities, admin_moderate_content.
--   7. Platform Config     — creates platform_config + platform_config_audit
--      tables (seeded) and admin_get_config, admin_update_config,
--      admin_get_config_audit, admin_list_admin_users.
--
-- Conventions (match the deployed get_admin_dashboard_stats):
--   * donations.amount is treated as USD.
--   * fiat_donations.amount_cents / 100 is USD; only status = 'completed'
--     rows count toward totals.
--   * All functions are SECURITY DEFINER, guard on is_admin_user() (already
--     deployed), and are revoked from anon.
-- =============================================================================


-- =============================================================================
-- SECTION A: fiat_donations schema drift
-- The deployed helcim-validate edge function inserts these columns; production
-- lacks them, so recording a fiat donation currently errors.
-- =============================================================================
ALTER TABLE public.fiat_donations
  ADD COLUMN IF NOT EXISTS donor_email         TEXT,
  ADD COLUMN IF NOT EXISTS donor_name          TEXT,
  ADD COLUMN IF NOT EXISTS donor_address       TEXT,
  ADD COLUMN IF NOT EXISTS payment_method      TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id      TEXT,
  ADD COLUMN IF NOT EXISTS card_type           TEXT,
  ADD COLUMN IF NOT EXISTS card_last_four      TEXT,
  ADD COLUMN IF NOT EXISTS fee_covered         BOOLEAN,
  ADD COLUMN IF NOT EXISTS subscription_id     UUID,
  ADD COLUMN IF NOT EXISTS cause_id            UUID,
  ADD COLUMN IF NOT EXISTS fund_id             UUID,
  ADD COLUMN IF NOT EXISTS cause_name          TEXT,
  ADD COLUMN IF NOT EXISTS fund_name           TEXT;


-- =============================================================================
-- SECTION B: canonical admin_list_charities (Charity Management page)
-- Identical to 20260725000004; re-applied here so a single run fixes
-- production regardless of which earlier hotfix files were applied.
-- =============================================================================
ALTER TABLE public.charity_verifications
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP FUNCTION IF EXISTS public.admin_list_charities(text, text, text, integer, integer);

CREATE FUNCTION public.admin_list_charities(
  p_status        TEXT        DEFAULT NULL,
  p_category      TEXT        DEFAULT NULL,
  p_search        TEXT        DEFAULT NULL,
  p_page          INT         DEFAULT 1,
  p_limit         INT         DEFAULT 50
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  name                TEXT,
  category            TEXT,
  logo_url            TEXT,
  mission             TEXT,
  verification_id     UUID,
  verification_status TEXT,
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,
  wallet_address      TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  total_count         BIGINT,
  ein                 TEXT,
  signer_name         TEXT,
  signer_email        TEXT,
  signer_phone        TEXT,
  claimed_at          TIMESTAMPTZ,
  charity_profile_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.user_id,
      p.name,
      (p.meta ->> 'category')::TEXT              AS category,
      (p.meta ->> 'logoUrl')::TEXT               AS logo_url,
      (p.meta ->> 'mission')::TEXT               AS mission,
      cv.id                                       AS verification_id,
      COALESCE(cv.status, 'pending')::TEXT        AS verification_status,
      cv.review_notes,
      cv.reviewed_at::TIMESTAMPTZ                 AS reviewed_at,
      (p.meta ->> 'walletAddress')::TEXT          AS wallet_address,
      p.created_at::TIMESTAMPTZ                   AS created_at,
      p.updated_at::TIMESTAMPTZ                   AS updated_at,
      cp.ein,
      cp.authorized_signer_name                   AS signer_name,
      cp.authorized_signer_email                  AS signer_email,
      cp.authorized_signer_phone                  AS signer_phone,
      cp.claimed_at::TIMESTAMPTZ                  AS claimed_at,
      cp.status                                   AS charity_profile_status
    FROM profiles p
    LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
    LEFT JOIN charity_profiles cp ON cp.claimed_by = p.user_id
    WHERE p.type = 'charity'
      AND (p_status   IS NULL OR COALESCE(cv.status, 'pending') = p_status)
      AND (p_category IS NULL OR (p.meta ->> 'category') = p_category)
      AND (p_search   IS NULL OR p.name ILIKE '%' || p_search || '%'
           OR cp.ein ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.user_id,
    f.name,
    f.category,
    f.logo_url,
    f.mission,
    f.verification_id,
    f.verification_status,
    f.review_notes,
    f.reviewed_at,
    f.wallet_address,
    f.created_at,
    f.updated_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count,
    f.ein,
    f.signer_name,
    f.signer_email,
    f.signer_phone,
    f.claimed_at,
    f.charity_profile_status
  FROM filtered f
  ORDER BY
    CASE f.verification_status
      WHEN 'pending'   THEN 1
      WHEN 'verified'  THEN 2
      WHEN 'approved'  THEN 2
      WHEN 'suspended' THEN 3
      WHEN 'rejected'  THEN 4
      ELSE 5
    END,
    f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_charities IS
  'Returns a paginated, filtered list of charity profiles with verification '
  'status and EIN/signer details for admin review. Pending charities sort '
  'first. Timestamps cast to TIMESTAMPTZ to prevent 42804. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_charities(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_charities(text, text, text, integer, integer) TO authenticated, service_role;


-- =============================================================================
-- SECTION C: Donation Monitoring
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.donation_flags (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id     UUID        NOT NULL,
  donation_type   TEXT        NOT NULL CHECK (donation_type IN ('crypto', 'fiat')),
  flag_reason     TEXT        NOT NULL,
  flagged_by      UUID        NOT NULL,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_flags_donation
  ON public.donation_flags (donation_id, donation_type);
CREATE INDEX IF NOT EXISTS idx_donation_flags_open
  ON public.donation_flags (donation_id) WHERE resolved_at IS NULL;

ALTER TABLE public.donation_flags ENABLE ROW LEVEL SECURITY;
-- No RLS policies: access is exclusively via the SECURITY DEFINER RPCs below.

DROP FUNCTION IF EXISTS public.admin_list_donations(text, uuid, uuid, text, timestamptz, timestamptz, numeric, numeric, boolean, integer, integer);

CREATE FUNCTION public.admin_list_donations(
  p_payment_method TEXT        DEFAULT NULL,
  p_charity_id     UUID        DEFAULT NULL,
  p_donor_user_id  UUID        DEFAULT NULL,
  p_search         TEXT        DEFAULT NULL,
  p_date_from      TIMESTAMPTZ DEFAULT NULL,
  p_date_to        TIMESTAMPTZ DEFAULT NULL,
  p_min_amount_usd NUMERIC     DEFAULT NULL,
  p_max_amount_usd NUMERIC     DEFAULT NULL,
  p_flagged        BOOLEAN     DEFAULT NULL,
  p_page           INT         DEFAULT 1,
  p_limit          INT         DEFAULT 50
)
RETURNS TABLE (
  id                 UUID,
  payment_method     TEXT,
  amount             NUMERIC,
  amount_usd         NUMERIC,
  currency           TEXT,
  charity_id         UUID,
  charity_name       TEXT,
  donor_user_id      UUID,
  donor_email        TEXT,
  donor_display_name TEXT,
  tx_hash            TEXT,
  processor_id       TEXT,
  status             TEXT,
  is_flagged         BOOLEAN,
  open_flag_count    BIGINT,
  created_at         TIMESTAMPTZ,
  total_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH unified AS (
    -- On-chain / legacy donations. amount is USD by platform convention.
    SELECT
      d.id,
      'crypto'::TEXT               AS payment_method,
      d.amount::NUMERIC            AS amount,
      d.amount::NUMERIC            AS amount_usd,
      NULL::TEXT                   AS currency,
      d.charity_id,
      d.donor_id                   AS donor_user_id,
      NULL::TEXT                   AS tx_hash,
      NULL::TEXT                   AS processor_id,
      'completed'::TEXT            AS status,
      d.created_at::TIMESTAMPTZ    AS created_at
    FROM donations d
    UNION ALL
    SELECT
      fd.id,
      'fiat'::TEXT                 AS payment_method,
      fd.amount_cents::NUMERIC     AS amount,
      (fd.amount_cents::NUMERIC / 100) AS amount_usd,
      fd.currency,
      fd.charity_id,
      fd.donor_id                  AS donor_user_id,
      NULL::TEXT                   AS tx_hash,
      fd.transaction_id            AS processor_id,
      fd.status,
      fd.created_at::TIMESTAMPTZ   AS created_at
    FROM fiat_donations fd
  ),
  enriched AS (
    SELECT
      u.id,
      u.payment_method,
      u.amount,
      u.amount_usd,
      u.currency,
      u.charity_id,
      COALESCE(chp.name, chpf.name)          AS charity_name,
      u.donor_user_id,
      au.email::TEXT                          AS donor_email,
      dp.name                                 AS donor_display_name,
      u.tx_hash,
      u.processor_id,
      u.status,
      COALESCE(fl.open_count, 0)::BIGINT      AS open_flag_count,
      (COALESCE(fl.open_count, 0) > 0)        AS is_flagged,
      u.created_at
    FROM unified u
    LEFT JOIN profiles chp ON chp.id = u.charity_id
    LEFT JOIN charity_profiles chpf ON chpf.id = u.charity_id
    LEFT JOIN profiles dp ON dp.id = u.donor_user_id
    LEFT JOIN auth.users au ON au.id = u.donor_user_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS open_count
      FROM donation_flags f
      WHERE f.donation_id = u.id AND f.resolved_at IS NULL
    ) fl ON TRUE
  ),
  filtered AS (
    SELECT * FROM enriched e
    WHERE (p_payment_method IS NULL OR e.payment_method = p_payment_method)
      AND (p_charity_id     IS NULL OR e.charity_id = p_charity_id)
      AND (p_donor_user_id  IS NULL OR e.donor_user_id = p_donor_user_id)
      AND (p_date_from      IS NULL OR e.created_at >= p_date_from)
      AND (p_date_to        IS NULL OR e.created_at <= p_date_to)
      AND (p_min_amount_usd IS NULL OR e.amount_usd >= p_min_amount_usd)
      AND (p_max_amount_usd IS NULL OR e.amount_usd <= p_max_amount_usd)
      AND (p_flagged        IS NULL OR e.is_flagged = p_flagged)
      AND (p_search         IS NULL
           OR e.charity_name ILIKE '%' || p_search || '%'
           OR e.donor_email ILIKE '%' || p_search || '%'
           OR e.donor_display_name ILIKE '%' || p_search || '%'
           OR e.processor_id ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.payment_method,
    f.amount,
    f.amount_usd,
    f.currency,
    f.charity_id,
    f.charity_name,
    f.donor_user_id,
    f.donor_email,
    f.donor_display_name,
    f.tx_hash,
    f.processor_id,
    f.status,
    f.is_flagged,
    f.open_flag_count,
    f.created_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_donations IS
  'Unified paginated crypto + fiat donation list with donor/charity context '
  'and open-flag counts for the admin Donation Monitoring page. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_donations(text, uuid, uuid, text, timestamptz, timestamptz, numeric, numeric, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_donations(text, uuid, uuid, text, timestamptz, timestamptz, numeric, numeric, boolean, integer, integer) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_donation_summary(timestamptz, timestamptz, text);

CREATE FUNCTION public.admin_donation_summary(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ,
  p_group_by  TEXT DEFAULT 'month'
)
RETURNS TABLE (
  group_key        TEXT,
  payment_method   TEXT,
  total_amount_usd NUMERIC,
  donation_count   BIGINT,
  charity_id       UUID,
  charity_name     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_group_by NOT IN ('charity', 'day', 'week', 'month', 'payment_method') THEN
    RAISE EXCEPTION 'Invalid group_by: %. Must be charity, day, week, month, or payment_method', p_group_by;
  END IF;

  RETURN QUERY
  WITH unified AS (
    SELECT
      'crypto'::TEXT            AS payment_method,
      d.amount::NUMERIC         AS amount_usd,
      d.charity_id,
      d.created_at::TIMESTAMPTZ AS created_at
    FROM donations d
    UNION ALL
    SELECT
      'fiat'::TEXT,
      fd.amount_cents::NUMERIC / 100,
      fd.charity_id,
      fd.created_at::TIMESTAMPTZ
    FROM fiat_donations fd
    WHERE fd.status = 'completed'
  ),
  in_range AS (
    SELECT * FROM unified u
    WHERE u.created_at >= p_date_from AND u.created_at <= p_date_to
  )
  SELECT
    CASE p_group_by
      WHEN 'charity'        THEN COALESCE(p.name, cp.name, r.charity_id::TEXT)
      WHEN 'day'            THEN to_char(r.created_at, 'YYYY-MM-DD')
      WHEN 'week'           THEN to_char(date_trunc('week', r.created_at), 'YYYY-MM-DD')
      WHEN 'month'          THEN to_char(r.created_at, 'YYYY-MM')
      WHEN 'payment_method' THEN r.payment_method
    END                                           AS group_key,
    r.payment_method,
    SUM(r.amount_usd)::NUMERIC                    AS total_amount_usd,
    COUNT(*)::BIGINT                              AS donation_count,
    CASE WHEN p_group_by = 'charity' THEN r.charity_id ELSE NULL END AS charity_id,
    CASE WHEN p_group_by = 'charity' THEN COALESCE(p.name, cp.name) ELSE NULL END AS charity_name
  FROM in_range r
  LEFT JOIN profiles p ON p.id = r.charity_id
  LEFT JOIN charity_profiles cp ON cp.id = r.charity_id
  GROUP BY 1, r.payment_method,
    CASE WHEN p_group_by = 'charity' THEN r.charity_id ELSE NULL END,
    CASE WHEN p_group_by = 'charity' THEN COALESCE(p.name, cp.name) ELSE NULL END
  ORDER BY 1, r.payment_method;
END;
$$;

COMMENT ON FUNCTION public.admin_donation_summary IS
  'Aggregated donation totals grouped by charity, day, week, month, or '
  'payment method for admin reporting and CSV export. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_donation_summary(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_donation_summary(timestamptz, timestamptz, text) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_flag_donation(uuid, text, text);

CREATE FUNCTION public.admin_flag_donation(
  p_donation_id   UUID,
  p_donation_type TEXT,
  p_reason        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_flag_id UUID;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_donation_type NOT IN ('crypto', 'fiat') THEN
    RAISE EXCEPTION 'Invalid donation type: %', p_donation_type;
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required to flag a donation';
  END IF;

  IF p_donation_type = 'crypto' THEN
    SELECT EXISTS (SELECT 1 FROM donations WHERE id = p_donation_id) INTO v_exists;
  ELSE
    SELECT EXISTS (SELECT 1 FROM fiat_donations WHERE id = p_donation_id) INTO v_exists;
  END IF;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id;
  END IF;

  INSERT INTO donation_flags (donation_id, donation_type, flag_reason, flagged_by)
  VALUES (p_donation_id, p_donation_type, trim(p_reason), auth.uid())
  RETURNING id INTO v_flag_id;

  RETURN v_flag_id;
END;
$$;

COMMENT ON FUNCTION public.admin_flag_donation IS
  'Flags a donation for admin review. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_flag_donation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_flag_donation(uuid, text, text) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_resolve_flag(uuid, text);

CREATE FUNCTION public.admin_resolve_flag(
  p_flag_id         UUID,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE donation_flags
  SET resolved_by = auth.uid(),
      resolved_at = NOW(),
      resolution_note = p_resolution_note
  WHERE id = p_flag_id AND resolved_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Flag % not found or already resolved', p_flag_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_resolve_flag IS
  'Resolves an open donation flag. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_resolve_flag(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_flag(uuid, text) TO authenticated, service_role;


-- =============================================================================
-- SECTION D: Charity Requests (from 20260501000000, never applied to prod)
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_list_charity_requests(integer, integer);

CREATE FUNCTION public.admin_list_charity_requests(
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  ein                    TEXT,
  request_count          BIGINT,
  first_requested_at     TIMESTAMPTZ,
  latest_requested_at    TIMESTAMPTZ,
  latest_requester_email TEXT,
  total_count            BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_limit < 1 OR p_limit > 500 THEN p_limit := 100; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  RETURN QUERY
  WITH grouped AS (
    SELECT
      cr.ein,
      COUNT(*)::BIGINT                 AS request_count,
      MIN(cr.created_at)::TIMESTAMPTZ  AS first_requested_at,
      MAX(cr.created_at)::TIMESTAMPTZ  AS latest_requested_at,
      (
        SELECT COALESCE(cr2.contact_email, u.email::TEXT)
        FROM charity_requests cr2
        LEFT JOIN auth.users u ON u.id = cr2.user_id
        WHERE cr2.ein = cr.ein
        ORDER BY cr2.created_at DESC
        LIMIT 1
      )                                AS latest_requester_email
    FROM charity_requests cr
    GROUP BY cr.ein
  )
  SELECT
    g.ein,
    g.request_count,
    g.first_requested_at,
    g.latest_requested_at,
    g.latest_requester_email,
    (SELECT COUNT(*) FROM grouped)::BIGINT AS total_count
  FROM grouped g
  ORDER BY g.latest_requested_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_charity_requests IS
  'Charity requests aggregated by EIN with counts and latest requester. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_charity_requests(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_charity_requests(integer, integer) TO authenticated, service_role;


-- =============================================================================
-- SECTION E: Reports (monthly buckets between p_date_from and p_date_to)
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_charity_growth_report(timestamptz, timestamptz);

CREATE FUNCTION public.admin_charity_growth_report(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  period            TEXT,
  new_registrations BIGINT,
  approved          BIGINT,
  rejected          BIGINT,
  active            BIGINT,
  suspended         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    to_char(m.month_start, 'YYYY-MM') AS period,
    (SELECT COUNT(*) FROM profiles p
      WHERE p.type = 'charity'
        AND p.created_at >= m.month_start
        AND p.created_at < m.month_start + INTERVAL '1 month')::BIGINT AS new_registrations,
    (SELECT COUNT(*) FROM charity_verifications cv
      WHERE cv.status IN ('verified', 'approved')
        AND cv.reviewed_at >= m.month_start
        AND cv.reviewed_at < m.month_start + INTERVAL '1 month')::BIGINT AS approved,
    (SELECT COUNT(*) FROM charity_verifications cv
      WHERE cv.status = 'rejected'
        AND cv.reviewed_at >= m.month_start
        AND cv.reviewed_at < m.month_start + INTERVAL '1 month')::BIGINT AS rejected,
    -- Cumulative verified charities as of month end
    (SELECT COUNT(*) FROM charity_verifications cv
      WHERE cv.status IN ('verified', 'approved')
        AND cv.created_at < m.month_start + INTERVAL '1 month')::BIGINT AS active,
    (SELECT COUNT(*) FROM charity_verifications cv
      WHERE cv.status = 'suspended'
        AND cv.reviewed_at >= m.month_start
        AND cv.reviewed_at < m.month_start + INTERVAL '1 month')::BIGINT AS suspended
  FROM generate_series(
    date_trunc('month', p_date_from),
    date_trunc('month', p_date_to),
    INTERVAL '1 month'
  ) AS m(month_start)
  ORDER BY m.month_start;
END;
$$;

COMMENT ON FUNCTION public.admin_charity_growth_report IS
  'Monthly charity registration and verification funnel counts. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_charity_growth_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_charity_growth_report(timestamptz, timestamptz) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_donor_activity_report(timestamptz, timestamptz);

CREATE FUNCTION public.admin_donor_activity_report(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  period            TEXT,
  new_donors        BIGINT,
  active_donors     BIGINT,
  dormant_donors    BIGINT,
  avg_donation_usd  NUMERIC,
  repeat_donor_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH unified AS (
    SELECT d.donor_id, d.amount::NUMERIC AS amount_usd, d.created_at::TIMESTAMPTZ AS created_at
    FROM donations d
    UNION ALL
    SELECT fd.donor_id, fd.amount_cents::NUMERIC / 100, fd.created_at::TIMESTAMPTZ
    FROM fiat_donations fd
    WHERE fd.status = 'completed'
  ),
  months AS (
    SELECT month_start FROM generate_series(
      date_trunc('month', p_date_from),
      date_trunc('month', p_date_to),
      INTERVAL '1 month'
    ) AS g(month_start)
  ),
  per_month AS (
    SELECT
      m.month_start,
      (SELECT COUNT(*) FROM profiles p
        WHERE p.type = 'donor'
          AND p.created_at >= m.month_start
          AND p.created_at < m.month_start + INTERVAL '1 month')::BIGINT AS new_donors,
      (SELECT COUNT(DISTINCT u.donor_id) FROM unified u
        WHERE u.created_at >= m.month_start
          AND u.created_at < m.month_start + INTERVAL '1 month')::BIGINT AS active_donors,
      (SELECT COUNT(DISTINCT prior.donor_id) FROM unified prior
        WHERE prior.created_at < m.month_start
          AND prior.donor_id NOT IN (
            SELECT u2.donor_id FROM unified u2
            WHERE u2.created_at >= m.month_start
              AND u2.created_at < m.month_start + INTERVAL '1 month'
              AND u2.donor_id IS NOT NULL
          )
          AND prior.donor_id IS NOT NULL)::BIGINT AS dormant_donors,
      (SELECT COALESCE(AVG(u.amount_usd), 0) FROM unified u
        WHERE u.created_at >= m.month_start
          AND u.created_at < m.month_start + INTERVAL '1 month')::NUMERIC AS avg_donation_usd,
      (SELECT COUNT(*) FROM (
          SELECT u.donor_id FROM unified u
          WHERE u.created_at >= m.month_start
            AND u.created_at < m.month_start + INTERVAL '1 month'
            AND u.donor_id IS NOT NULL
          GROUP BY u.donor_id
          HAVING COUNT(*) > 1
        ) rep)::BIGINT AS repeat_donors
    FROM months m
  )
  SELECT
    to_char(pm.month_start, 'YYYY-MM') AS period,
    pm.new_donors,
    pm.active_donors,
    pm.dormant_donors,
    ROUND(pm.avg_donation_usd, 2) AS avg_donation_usd,
    CASE WHEN pm.active_donors > 0
      THEN ROUND(pm.repeat_donors::NUMERIC / pm.active_donors, 4)
      ELSE 0 END AS repeat_donor_rate
  FROM per_month pm
  ORDER BY pm.month_start;
END;
$$;

COMMENT ON FUNCTION public.admin_donor_activity_report IS
  'Monthly donor acquisition, activity, and retention metrics. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_donor_activity_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_donor_activity_report(timestamptz, timestamptz) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_volunteer_report(timestamptz, timestamptz);

CREATE FUNCTION public.admin_volunteer_report(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  period              TEXT,
  hours_submitted     NUMERIC,
  hours_validated     NUMERIC,
  hours_rejected      NUMERIC,
  rejection_rate      NUMERIC,
  avg_validation_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH all_hours AS (
    -- Formal volunteer hours (charity-linked)
    SELECT
      vh.hours::NUMERIC   AS hours,
      vh.status           AS status,        -- pending / approved / rejected
      vh.created_at::TIMESTAMPTZ AS created_at,
      vh.approved_at::TIMESTAMPTZ AS decided_at
    FROM volunteer_hours vh
    UNION ALL
    -- Self-reported hours
    SELECT
      srh.hours::NUMERIC,
      CASE srh.validation_status
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        ELSE 'pending'
      END,
      srh.created_at::TIMESTAMPTZ,
      srh.validated_at::TIMESTAMPTZ
    FROM self_reported_hours srh
  ),
  months AS (
    SELECT month_start FROM generate_series(
      date_trunc('month', p_date_from),
      date_trunc('month', p_date_to),
      INTERVAL '1 month'
    ) AS g(month_start)
  ),
  per_month AS (
    SELECT
      m.month_start,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.created_at >= m.month_start
          AND h.created_at < m.month_start + INTERVAL '1 month') AS hours_submitted,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.status = 'approved'
          AND COALESCE(h.decided_at, h.created_at) >= m.month_start
          AND COALESCE(h.decided_at, h.created_at) < m.month_start + INTERVAL '1 month') AS hours_validated,
      (SELECT COALESCE(SUM(h.hours), 0) FROM all_hours h
        WHERE h.status = 'rejected'
          AND COALESCE(h.decided_at, h.created_at) >= m.month_start
          AND COALESCE(h.decided_at, h.created_at) < m.month_start + INTERVAL '1 month') AS hours_rejected,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (h.decided_at - h.created_at)) / 86400), 0)
        FROM all_hours h
        WHERE h.decided_at IS NOT NULL
          AND h.decided_at >= m.month_start
          AND h.decided_at < m.month_start + INTERVAL '1 month') AS avg_validation_days
    FROM months m
  )
  SELECT
    to_char(pm.month_start, 'YYYY-MM') AS period,
    pm.hours_submitted::NUMERIC,
    pm.hours_validated::NUMERIC,
    pm.hours_rejected::NUMERIC,
    CASE WHEN (pm.hours_validated + pm.hours_rejected) > 0
      THEN ROUND(pm.hours_rejected / (pm.hours_validated + pm.hours_rejected), 4)
      ELSE 0 END::NUMERIC AS rejection_rate,
    ROUND(pm.avg_validation_days::NUMERIC, 2) AS avg_validation_days
  FROM per_month pm
  ORDER BY pm.month_start;
END;
$$;

COMMENT ON FUNCTION public.admin_volunteer_report IS
  'Monthly volunteer hours submission/validation metrics across formal and '
  'self-reported hours. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_volunteer_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_volunteer_report(timestamptz, timestamptz) TO authenticated, service_role;


-- =============================================================================
-- SECTION F: Volunteer Validation
-- =============================================================================
DROP FUNCTION IF EXISTS public.admin_validation_stats();

CREATE FUNCTION public.admin_validation_stats()
RETURNS TABLE (
  total_pending           BIGINT,
  total_approved          BIGINT,
  total_rejected          BIGINT,
  total_expired           BIGINT,
  avg_response_time_hours NUMERIC,
  expiration_rate         NUMERIC,
  rejection_rate          NUMERIC,
  pending_by_org          JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending  BIGINT;
  v_approved BIGINT;
  v_rejected BIGINT;
  v_expired  BIGINT;
  v_avg_hours NUMERIC;
  v_by_org   JSONB;
  v_decided  BIGINT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE srh.validation_status = 'pending'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'approved'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'rejected'),
    COUNT(*) FILTER (WHERE srh.validation_status = 'expired'),
    COALESCE(AVG(EXTRACT(EPOCH FROM (srh.validated_at - srh.created_at)) / 3600)
      FILTER (WHERE srh.validated_at IS NOT NULL), 0)
  INTO v_pending, v_approved, v_rejected, v_expired, v_avg_hours
  FROM self_reported_hours srh;

  SELECT COALESCE(jsonb_agg(o), '[]'::JSONB) INTO v_by_org
  FROM (
    SELECT
      srh.organization_id   AS org_id,
      MAX(srh.organization_name) AS org_name,
      COUNT(*)              AS pending_count
    FROM self_reported_hours srh
    WHERE srh.validation_status = 'pending'
    GROUP BY srh.organization_id
    ORDER BY COUNT(*) DESC
  ) o;

  v_decided := v_approved + v_rejected + v_expired;

  RETURN QUERY SELECT
    v_pending,
    v_approved,
    v_rejected,
    v_expired,
    ROUND(v_avg_hours, 2),
    CASE WHEN v_decided > 0 THEN ROUND(v_expired::NUMERIC / v_decided, 4) ELSE 0 END,
    CASE WHEN v_decided > 0 THEN ROUND(v_rejected::NUMERIC / v_decided, 4) ELSE 0 END,
    v_by_org;
END;
$$;

COMMENT ON FUNCTION public.admin_validation_stats IS
  'Aggregate self-reported volunteer-hours validation stats with per-org '
  'pending breakdown. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_validation_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_validation_stats() TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_override_validation(uuid, text, text);

CREATE FUNCTION public.admin_override_validation(
  p_request_id UUID,
  p_new_status TEXT,
  p_reason     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_new_status NOT IN ('approved', 'rejected', 'pending', 'expired') THEN
    RAISE EXCEPTION 'Invalid validation status: %', p_new_status;
  END IF;

  UPDATE self_reported_hours
  SET validation_status = p_new_status,
      validated_at = CASE WHEN p_new_status IN ('approved', 'rejected') THEN NOW() ELSE validated_at END,
      updated_at = NOW()
  WHERE id = p_request_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Validation request % not found', p_request_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_override_validation IS
  'Admin override of a self-reported volunteer-hours validation decision. '
  'Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_override_validation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_override_validation(uuid, text, text) TO authenticated, service_role;


-- =============================================================================
-- SECTION G: Content Moderation
-- =============================================================================
ALTER TABLE public.causes
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ;

ALTER TABLE public.volunteer_opportunities
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.admin_list_causes(text, text, uuid, integer, integer);

CREATE FUNCTION public.admin_list_causes(
  p_moderation_status TEXT DEFAULT NULL,
  p_search            TEXT DEFAULT NULL,
  p_charity_id        UUID DEFAULT NULL,
  p_page              INT  DEFAULT 1,
  p_limit             INT  DEFAULT 50
)
RETURNS TABLE (
  id                UUID,
  charity_id        UUID,
  charity_name      TEXT,
  title             TEXT,
  status            TEXT,
  moderation_status TEXT,
  moderation_reason TEXT,
  moderated_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ,
  total_count       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.charity_id,
      COALESCE(p.name, cp.name, 'Unknown')::TEXT AS charity_name,
      c.name::TEXT                               AS title,
      c.status::TEXT                             AS status,
      c.moderation_status,
      c.moderation_reason,
      c.moderated_at::TIMESTAMPTZ                AS moderated_at,
      c.updated_at::TIMESTAMPTZ                  AS updated_at
    FROM causes c
    LEFT JOIN profiles p ON p.id = c.charity_id
    LEFT JOIN charity_profiles cp ON cp.id = c.charity_id
    WHERE (p_moderation_status IS NULL OR c.moderation_status = p_moderation_status)
      AND (p_charity_id IS NULL OR c.charity_id = p_charity_id)
      AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%'
           OR COALESCE(p.name, cp.name, '') ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id, f.charity_id, f.charity_name, f.title, f.status,
    f.moderation_status, f.moderation_reason, f.moderated_at, f.updated_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_causes IS
  'Paginated cause list with moderation state for the admin Content '
  'Moderation page. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_causes(text, text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_causes(text, text, uuid, integer, integer) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_list_opportunities(text, text, uuid, integer, integer);

CREATE FUNCTION public.admin_list_opportunities(
  p_moderation_status TEXT DEFAULT NULL,
  p_search            TEXT DEFAULT NULL,
  p_charity_id        UUID DEFAULT NULL,
  p_page              INT  DEFAULT 1,
  p_limit             INT  DEFAULT 50
)
RETURNS TABLE (
  id                UUID,
  charity_id        UUID,
  charity_name      TEXT,
  title             TEXT,
  status            TEXT,
  moderation_status TEXT,
  moderation_reason TEXT,
  moderated_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ,
  total_count       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      vo.id,
      vo.charity_id,
      COALESCE(p.name, cp.name, 'Unknown')::TEXT AS charity_name,
      vo.title::TEXT                             AS title,
      vo.status::TEXT                            AS status,
      vo.moderation_status,
      vo.moderation_reason,
      vo.moderated_at::TIMESTAMPTZ               AS moderated_at,
      vo.updated_at::TIMESTAMPTZ                 AS updated_at
    FROM volunteer_opportunities vo
    LEFT JOIN profiles p ON p.id = vo.charity_id
    LEFT JOIN charity_profiles cp ON cp.id = vo.charity_id
    WHERE (p_moderation_status IS NULL OR vo.moderation_status = p_moderation_status)
      AND (p_charity_id IS NULL OR vo.charity_id = p_charity_id)
      AND (p_search IS NULL OR vo.title ILIKE '%' || p_search || '%'
           OR COALESCE(p.name, cp.name, '') ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id, f.charity_id, f.charity_name, f.title, f.status,
    f.moderation_status, f.moderation_reason, f.moderated_at, f.updated_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_list_opportunities IS
  'Paginated volunteer-opportunity list with moderation state for the admin '
  'Content Moderation page. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_opportunities(text, text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_opportunities(text, text, uuid, integer, integer) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_moderate_content(text, uuid, text, text);

CREATE FUNCTION public.admin_moderate_content(
  p_content_type TEXT,
  p_content_id   UUID,
  p_action       TEXT,
  p_reason       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
  v_updated INT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_content_type NOT IN ('cause', 'opportunity') THEN
    RAISE EXCEPTION 'Invalid content type: %', p_content_type;
  END IF;

  v_new_status := CASE p_action
    WHEN 'hide'   THEN 'hidden'
    WHEN 'unhide' THEN 'visible'
    WHEN 'flag'   THEN 'flagged'
    WHEN 'unflag' THEN 'visible'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid moderation action: %. Must be hide, unhide, flag, or unflag', p_action;
  END IF;

  IF p_content_type = 'cause' THEN
    UPDATE causes
    SET moderation_status = v_new_status,
        moderation_reason = p_reason,
        moderated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_content_id;
  ELSE
    UPDATE volunteer_opportunities
    SET moderation_status = v_new_status,
        moderation_reason = p_reason,
        moderated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_content_id;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION '% with id % not found', p_content_type, p_content_id;
  END IF;

  RETURN p_content_id;
END;
$$;

COMMENT ON FUNCTION public.admin_moderate_content IS
  'Applies a moderation action (hide/unhide/flag/unflag) to a cause or '
  'volunteer opportunity. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_moderate_content(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_content(text, uuid, text, text) TO authenticated, service_role;


-- =============================================================================
-- SECTION H: Platform Config + Admin Users
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.platform_config (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_config_audit (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key    TEXT        NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  admin_user_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config_audit ENABLE ROW LEVEL SECURITY;
-- No RLS policies: access is exclusively via the SECURITY DEFINER RPCs below.

INSERT INTO public.platform_config (key, value, description) VALUES
  ('min_donation_usd', '1'::JSONB, 'Minimum accepted donation amount in USD'),
  ('max_causes_per_charity', '10'::JSONB, 'Maximum number of active causes a charity may run'),
  ('max_opportunities_per_charity', '10'::JSONB, 'Maximum number of open volunteer opportunities per charity'),
  ('validation_window_days', '30'::JSONB, 'Days a charity has to validate self-reported volunteer hours'),
  ('supported_tokens', '["ETH","USDC"]'::JSONB, 'Token symbols accepted for on-chain donations'),
  ('supported_networks', '[{"chainId":8453,"name":"Base"}]'::JSONB, 'Blockchain networks supported for donations')
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.admin_get_config();

CREATE FUNCTION public.admin_get_config()
RETURNS TABLE (
  key         TEXT,
  value       JSONB,
  description TEXT,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT pc.key, pc.value, pc.description, pc.updated_by, pc.updated_at
  FROM platform_config pc
  ORDER BY pc.key;
END;
$$;

COMMENT ON FUNCTION public.admin_get_config IS
  'Returns all platform configuration entries. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_get_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_config() TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_update_config(text, jsonb);

CREATE FUNCTION public.admin_update_config(
  p_key   TEXT,
  p_value JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old JSONB;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT pc.value INTO v_old FROM platform_config pc WHERE pc.key = p_key;

  INSERT INTO platform_config (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, auth.uid(), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO platform_config_audit (config_key, old_value, new_value, admin_user_id)
  VALUES (p_key, v_old, p_value, auth.uid());
END;
$$;

COMMENT ON FUNCTION public.admin_update_config IS
  'Upserts a platform configuration value and records the change in '
  'platform_config_audit. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_update_config(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_config(text, jsonb) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_get_config_audit(integer);

CREATE FUNCTION public.admin_get_config_audit(
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id            UUID,
  config_key    TEXT,
  old_value     JSONB,
  new_value     JSONB,
  admin_user_id UUID,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_limit < 1 OR p_limit > 500 THEN p_limit := 50; END IF;

  RETURN QUERY
  SELECT a.id, a.config_key, a.old_value, a.new_value, a.admin_user_id, a.created_at
  FROM platform_config_audit a
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.admin_get_config_audit IS
  'Returns recent platform configuration changes. Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_get_config_audit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_config_audit(integer) TO authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_list_admin_users();

CREATE FUNCTION public.admin_list_admin_users()
RETURNS TABLE (
  user_id      UUID,
  email        TEXT,
  display_name TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.id                          AS user_id,
    u.email::TEXT                 AS email,
    pr.name                       AS display_name,
    u.created_at::TIMESTAMPTZ     AS created_at
  FROM auth.users u
  LEFT JOIN profiles pr ON pr.user_id = u.id
  WHERE pr.type = 'admin'
     OR u.raw_user_meta_data ->> 'type' = 'admin'
  ORDER BY u.created_at;
END;
$$;

COMMENT ON FUNCTION public.admin_list_admin_users IS
  'Lists all users with the admin role (profile type or auth metadata). '
  'Admin-only. GIV-721.';

REVOKE ALL ON FUNCTION public.admin_list_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_admin_users() TO authenticated, service_role;


-- =============================================================================
-- Verification (run after applying; both should return rows without error):
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND proname LIKE 'admin_%' ORDER BY proname;
--
--   As an admin user in the app: Charity Management, Donation Monitoring,
--   Reports, Volunteer Validation, Content Moderation, and Platform Config
--   should all load live data.
-- =============================================================================
