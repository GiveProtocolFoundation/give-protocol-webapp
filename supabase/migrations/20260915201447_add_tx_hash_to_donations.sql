-- Add tx_hash to donations table to properly record crypto transaction hashes
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS tx_hash TEXT;

COMMENT ON COLUMN public.donations.tx_hash IS 'On-chain transaction hash for crypto donations';

-- Recreate admin_list_donations to use the real tx_hash instead of NULL
CREATE OR REPLACE FUNCTION public.admin_list_donations(
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
      d.tx_hash                    AS tx_hash,
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
