-- Migration: Extend admin_audit_log for PII read tracking + insert_admin_audit_read_entry RPC
-- Part of GIV-413: DB layer for admin read-access audit log (Art. 32 compliance)
-- Depends on: 20260411000001_create_admin_audit_infrastructure.sql

-- =============================================================================
-- 1. Extend action_type CHECK to include view_pii, view_pii_list
-- =============================================================================
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_type_check;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_type_check
  CHECK (action_type IN (
    'charity_status_change',
    'user_status_change',
    'donation_flag',
    'donation_flag_resolve',
    'validation_override',
    'config_change',
    'verification_approve',
    'verification_reject',
    'charity_suspend',
    'charity_reinstate',
    'user_suspend',
    'user_reinstate',
    'user_ban',
    'view_pii',
    'view_pii_list'
  ));

-- =============================================================================
-- 2. Extend entity_type CHECK to include volunteer, content
-- =============================================================================
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_entity_type_check;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_entity_type_check
  CHECK (entity_type IN (
    'charity',
    'user',
    'donation',
    'validation_request',
    'platform_config',
    'charity_verification',
    'volunteer',
    'content'
  ));

-- =============================================================================
-- 3. Relax entity_id to nullable + conditional CHECK
-- =============================================================================
ALTER TABLE admin_audit_log ALTER COLUMN entity_id DROP NOT NULL;

ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_entity_id_nullable_check;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_entity_id_nullable_check
  CHECK (entity_id IS NOT NULL OR action_type = 'view_pii_list');

-- =============================================================================
-- 4. Partial index for view_pii queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_view_pii
  ON admin_audit_log (admin_user_id, created_at DESC)
  WHERE action_type IN ('view_pii', 'view_pii_list');

-- =============================================================================
-- 5. insert_admin_audit_read_entry — Server-side audit RPC for PII reads
--
-- Context allowlist (keys permitted in p_context):
--   page, limit, filter_keys, result_count, source
-- Any other keys are stripped before storage. This prevents accidental PII
-- leakage into the audit log itself.
-- =============================================================================
CREATE OR REPLACE FUNCTION insert_admin_audit_read_entry(
  p_entity_type TEXT,
  p_entity_id   UUID    DEFAULT NULL,
  p_context     JSONB   DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id    UUID;
  v_action_type TEXT;
  v_ip          INET;
  v_ip_text     TEXT;
  v_headers     JSONB;
  v_safe_ctx    JSONB;
  v_audit_id    UUID;
  v_allowed_keys TEXT[] := ARRAY['page', 'limit', 'filter_keys', 'result_count', 'source'];
  v_key         TEXT;
BEGIN
  -- Guard: only admin users can call this function
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_admin_id := auth.uid();

  -- Derive action_type from entity_id presence
  IF p_entity_id IS NOT NULL THEN
    v_action_type := 'view_pii';
  ELSE
    v_action_type := 'view_pii_list';
  END IF;

  -- IP capture: x-forwarded-for with x-real-ip fallback
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
    v_ip_text := COALESCE(
      v_headers ->> 'x-forwarded-for',
      v_headers ->> 'x-real-ip'
    );
    IF v_ip_text IS NOT NULL THEN
      -- x-forwarded-for may contain multiple IPs; take the first
      v_ip_text := split_part(v_ip_text, ',', 1);
      v_ip := v_ip_text::INET;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Do not fail the audit insert because of header parsing issues
    v_ip := NULL;
  END;

  -- Strip non-allowlisted keys from context
  IF p_context IS NOT NULL THEN
    v_safe_ctx := '{}'::jsonb;
    FOR v_key IN SELECT jsonb_object_keys(p_context)
    LOOP
      IF v_key = ANY(v_allowed_keys) THEN
        v_safe_ctx := v_safe_ctx || jsonb_build_object(v_key, p_context -> v_key);
      END IF;
    END LOOP;
  ELSE
    v_safe_ctx := NULL;
  END IF;

  -- Insert audit row
  INSERT INTO admin_audit_log (
    admin_user_id, action_type, entity_type, entity_id,
    old_values, new_values, ip_address
  )
  VALUES (
    v_admin_id, v_action_type, p_entity_type, p_entity_id,
    NULL, v_safe_ctx, v_ip
  )
  RETURNING admin_audit_log.id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION insert_admin_audit_read_entry(TEXT, UUID, JSONB) IS
  'Server-side audit helper for PII read operations. Called from within admin read RPCs '
  'to provide tamper-resistant audit trail. Context allowlist: page, limit, filter_keys, '
  'result_count, source. Non-admin callers are rejected. Part of GIV-413.';

-- =============================================================================
-- 6. Instrument existing admin read RPCs that expose PII
-- =============================================================================

-- 6a. admin_list_donors — exposes email, display_name, wallet_address (list view)
CREATE OR REPLACE FUNCTION admin_list_donors(
  p_status        TEXT        DEFAULT NULL,
  p_auth_method   TEXT        DEFAULT NULL,
  p_search        TEXT        DEFAULT NULL,
  p_date_from     TIMESTAMPTZ DEFAULT NULL,
  p_date_to       TIMESTAMPTZ DEFAULT NULL,
  p_min_donated   NUMERIC     DEFAULT NULL,
  p_page          INT         DEFAULT 1,
  p_limit         INT         DEFAULT 50
)
RETURNS TABLE (
  user_id             UUID,
  email               TEXT,
  display_name        TEXT,
  wallet_address      TEXT,
  primary_auth_method TEXT,
  user_status         TEXT,
  total_crypto_usd    NUMERIC,
  total_fiat_usd      NUMERIC,
  donation_count      BIGINT,
  created_at          TIMESTAMPTZ,
  total_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset      INT;
  v_result_count BIGINT;
BEGIN
  -- Guard: only admin users can call this function
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Clamp pagination
  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN p_limit := 50; END IF;
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  WITH donor_profiles AS (
    SELECT
      p.user_id,
      au.email,
      p.name                            AS display_name,
      ui.wallet_address,
      COALESCE(ui.primary_auth_method, 'email')::TEXT AS primary_auth_method,
      p.user_status,
      p.created_at
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN user_identities ui ON ui.user_id = p.user_id
    WHERE p.type = 'donor'
      AND (p_status      IS NULL OR p.user_status = p_status)
      AND (p_auth_method IS NULL OR COALESCE(ui.primary_auth_method, 'email') = p_auth_method)
      AND (p_date_from   IS NULL OR p.created_at >= p_date_from)
      AND (p_date_to     IS NULL OR p.created_at <= p_date_to)
      AND (p_search      IS NULL
           OR au.email ILIKE '%' || p_search || '%'
           OR ui.wallet_address ILIKE '%' || p_search || '%'
           OR p.name ILIKE '%' || p_search || '%')
  ),
  donation_totals AS (
    SELECT
      d.donor_id           AS uid,
      SUM(d.amount)::NUMERIC AS crypto_usd,
      COUNT(*)::BIGINT       AS crypto_count
    FROM donations d
    WHERE d.donor_id IS NOT NULL
    GROUP BY d.donor_id
  ),
  fiat_totals AS (
    SELECT
      fd.donor_id         AS uid,
      SUM(fd.amount_cents)::NUMERIC / 100 AS fiat_usd,
      COUNT(*)::BIGINT                     AS fiat_count
    FROM fiat_donations fd
    WHERE fd.donor_id IS NOT NULL
    GROUP BY fd.donor_id
  ),
  combined AS (
    SELECT
      dp.user_id,
      dp.email,
      dp.display_name,
      dp.wallet_address,
      dp.primary_auth_method,
      dp.user_status,
      COALESCE(dt.crypto_usd, 0)                        AS total_crypto_usd,
      COALESCE(ft.fiat_usd, 0)                          AS total_fiat_usd,
      COALESCE(dt.crypto_count, 0) + COALESCE(ft.fiat_count, 0) AS donation_count,
      dp.created_at
    FROM donor_profiles dp
    LEFT JOIN donation_totals dt ON dt.uid = dp.user_id
    LEFT JOIN fiat_totals     ft ON ft.uid = dp.user_id
    WHERE (p_min_donated IS NULL
           OR (COALESCE(dt.crypto_usd, 0) + COALESCE(ft.fiat_usd, 0)) >= p_min_donated)
  )
  SELECT
    c.user_id,
    c.email,
    c.display_name,
    c.wallet_address,
    c.primary_auth_method,
    c.user_status,
    c.total_crypto_usd,
    c.total_fiat_usd,
    c.donation_count,
    c.created_at,
    (SELECT COUNT(*) FROM combined)::BIGINT AS total_count
  FROM combined c
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;

  -- Audit the PII list access (after query so result_count is available)
  GET DIAGNOSTICS v_result_count = ROW_COUNT;
  PERFORM insert_admin_audit_read_entry(
    'user',
    NULL,
    jsonb_build_object(
      'source', 'admin_list_donors',
      'page', p_page,
      'limit', p_limit,
      'result_count', v_result_count
    )
  );
END;
$$;

COMMENT ON FUNCTION admin_list_donors IS
  'Returns a paginated, filtered list of donor profiles with aggregated donation totals. '
  'Audits PII access via insert_admin_audit_read_entry. Admin-only via JWT check. Part of GIV-87/GIV-413.';

-- 6b. admin_get_donor_detail — exposes email, wallet, full donation history (single view)
CREATE OR REPLACE FUNCTION admin_get_donor_detail(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Guard: only admin users can call this function
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Audit the single-entity PII access
  PERFORM insert_admin_audit_read_entry(
    'user',
    p_user_id,
    jsonb_build_object('source', 'admin_get_donor_detail')
  );

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'userId',           p.user_id,
      'email',            au.email,
      'displayName',      p.name,
      'userStatus',       p.user_status,
      'createdAt',        p.created_at
    ),
    'identity', jsonb_build_object(
      'walletAddress',     ui.wallet_address,
      'primaryAuthMethod', COALESCE(ui.primary_auth_method, 'email'),
      'walletLinkedAt',    ui.wallet_linked_at
    ),
    'donationSummary', jsonb_build_object(
      'cryptoDonationCount', COALESCE((SELECT COUNT(*) FROM donations d WHERE d.donor_id = p_user_id), 0),
      'cryptoTotalUsd',      COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.donor_id = p_user_id), 0),
      'fiatDonationCount',   COALESCE((SELECT COUNT(*) FROM fiat_donations fd WHERE fd.donor_id = p_user_id), 0),
      'fiatTotalUsd',        COALESCE((SELECT SUM(fd.amount_cents)::NUMERIC / 100 FROM fiat_donations fd WHERE fd.donor_id = p_user_id), 0)
    ),
    'recentCryptoDonations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',         d.id,
        'amount',     d.amount,
        'charityId',  d.charity_id,
        'createdAt',  d.created_at
      ) ORDER BY d.created_at DESC), '[]'::jsonb)
      FROM donations d
      WHERE d.donor_id = p_user_id
      LIMIT 10
    ),
    'recentFiatDonations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',          fd.id,
        'amountCents', fd.amount_cents,
        'currency',    fd.currency,
        'charityId',   fd.charity_id,
        'createdAt',   fd.created_at
      ) ORDER BY fd.created_at DESC), '[]'::jsonb)
      FROM fiat_donations fd
      WHERE fd.donor_id = p_user_id
      LIMIT 10
    ),
    'statusHistory', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',             usa.id,
        'previousStatus', usa.previous_status,
        'newStatus',      usa.new_status,
        'reason',         usa.reason,
        'adminUserId',    usa.admin_user_id,
        'createdAt',      usa.created_at
      ) ORDER BY usa.created_at DESC), '[]'::jsonb)
      FROM user_status_audit usa
      WHERE usa.user_id = p_user_id
      LIMIT 20
    )
  )
  INTO v_result
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_identities ui ON ui.user_id = p.user_id
  WHERE p.user_id = p_user_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION admin_get_donor_detail IS
  'Returns a full JSONB snapshot of a donor profile including identity, donation history, '
  'and status change history. Audits PII access via insert_admin_audit_read_entry. '
  'Admin-only via JWT check. Part of GIV-87/GIV-413.';

-- 6c. admin_list_charities — exposes charity name, wallet_address (list view)
-- DROP required because 20260606100000 changed the return type to 19 columns;
-- CREATE OR REPLACE cannot alter an existing function's return signature.
DROP FUNCTION IF EXISTS admin_list_charities(TEXT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION admin_list_charities(
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
  total_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset      INT;
  v_result_count BIGINT;
BEGIN
  -- Guard: only admin users can call this function
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Clamp pagination
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
      cv.reviewed_at,
      (p.meta ->> 'walletAddress')::TEXT          AS wallet_address,
      p.created_at,
      p.updated_at
    FROM profiles p
    LEFT JOIN charity_verifications cv ON cv.charity_id = p.id
    WHERE p.type = 'charity'
      AND (p_status  IS NULL OR COALESCE(cv.status, 'pending') = p_status)
      AND (p_category IS NULL OR (p.meta ->> 'category') = p_category)
      AND (p_search   IS NULL OR p.name ILIKE '%' || p_search || '%')
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
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY
    CASE f.verification_status
      WHEN 'pending'  THEN 1
      WHEN 'verified' THEN 2
      WHEN 'approved' THEN 2
      WHEN 'suspended' THEN 3
      WHEN 'rejected' THEN 4
      ELSE 5
    END,
    f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;

  -- Audit the PII list access
  GET DIAGNOSTICS v_result_count = ROW_COUNT;
  PERFORM insert_admin_audit_read_entry(
    'charity',
    NULL,
    jsonb_build_object(
      'source', 'admin_list_charities',
      'page', p_page,
      'limit', p_limit,
      'result_count', v_result_count
    )
  );
END;
$$;

COMMENT ON FUNCTION admin_list_charities IS
  'Returns a paginated, filtered list of all charity profiles with their verification status. '
  'Audits PII access via insert_admin_audit_read_entry. '
  'Pending charities are sorted first. Admin-only via JWT check. Part of GIV-86/GIV-413.';

-- 6d. get_admin_recent_activity — exposes actor_name (email fallback)
CREATE OR REPLACE FUNCTION get_admin_recent_activity(
  p_limit  INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  event_type    TEXT,
  description   TEXT,
  actor_id      UUID,
  actor_name    TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  amount_usd    NUMERIC,
  event_time    TIMESTAMPTZ,
  total_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  INT := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset INT := GREATEST(COALESCE(p_offset, 0), 0);
  v_result_count BIGINT;
BEGIN
  -- Admin guard
  IF auth.jwt() -> 'user_metadata' ->> 'type' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH events AS (
    -- Crypto donations
    SELECT
      d.id                                                    AS event_id,
      'donation'::TEXT                                        AS event_type,
      'Crypto donation to ' || COALESCE(cp.name, 'charity')
                                                              AS description,
      d.donor_id                                              AS actor_id,
      COALESCE(dp.name, du.email, 'Unknown donor')         AS actor_name,
      d.charity_id                                            AS entity_id,
      'donation'::TEXT                                        AS entity_type,
      d.amount                                                AS amount_usd,
      d.created_at                                            AS event_time
    FROM donations d
    LEFT JOIN profiles dp ON dp.id = d.donor_id
    LEFT JOIN auth.users du ON du.id = dp.user_id
    LEFT JOIN profiles cp ON cp.id = d.charity_id

    UNION ALL

    -- Fiat donations
    SELECT
      fd.id,
      'donation'::TEXT,
      'Fiat donation to ' || COALESCE(cp.name, 'charity'),
      fd.donor_id,
      COALESCE(dp.name, fdu.email, 'Unknown donor'),
      fd.charity_id,
      'donation'::TEXT,
      fd.amount_cents::NUMERIC / 100,
      fd.created_at
    FROM fiat_donations fd
    LEFT JOIN profiles dp ON dp.id = fd.donor_id
    LEFT JOIN auth.users fdu ON fdu.id = dp.user_id
    LEFT JOIN profiles cp ON cp.id = fd.charity_id
    WHERE fd.status = 'completed'

    UNION ALL

    -- New user registrations
    SELECT
      p.id,
      'registration'::TEXT,
      initcap(p.type) || ' registered: ' || COALESCE(p.name, pu.email, 'Unknown'),
      p.id,
      COALESCE(p.name, pu.email, 'Unknown'),
      p.id,
      'user'::TEXT,
      NULL::NUMERIC,
      p.created_at
    FROM profiles p
    LEFT JOIN auth.users pu ON pu.id = p.user_id

    UNION ALL

    -- Charity verification status changes
    SELECT
      cv.id,
      'verification'::TEXT,
      'Charity verification ' || cv.status || ': ' || COALESCE(cp.name, 'charity'),
      cv.charity_id,
      COALESCE(cp.name, 'Unknown charity'),
      cv.charity_id,
      'charity_verification'::TEXT,
      NULL::NUMERIC,
      cv.updated_at
    FROM charity_verifications cv
    LEFT JOIN profiles cp ON cp.id = cv.charity_id

    UNION ALL

    -- Volunteer hours submissions
    SELECT
      vh.id,
      'volunteer_hours'::TEXT,
      'Volunteer hours submitted: ' || vh.hours || 'h for ' || COALESCE(op.title, 'opportunity'),
      vh.volunteer_id,
      COALESCE(vp.name, vu.email, 'Unknown volunteer'),
      vh.opportunity_id,
      'volunteer_hours'::TEXT,
      NULL::NUMERIC,
      vh.created_at
    FROM volunteer_hours vh
    LEFT JOIN profiles vp ON vp.user_id = vh.volunteer_id
    LEFT JOIN auth.users vu ON vu.id = vp.user_id
    LEFT JOIN volunteer_opportunities op ON op.id = vh.opportunity_id
  ),
  counted AS (
    SELECT *, COUNT(*) OVER () AS total
    FROM events
  )
  SELECT
    c.event_id,
    c.event_type,
    c.description,
    c.actor_id,
    c.actor_name,
    c.entity_id,
    c.entity_type,
    c.amount_usd,
    c.event_time,
    c.total
  FROM counted c
  ORDER BY c.event_time DESC
  LIMIT v_limit
  OFFSET v_offset;

  -- Audit the PII list access
  GET DIAGNOSTICS v_result_count = ROW_COUNT;
  PERFORM insert_admin_audit_read_entry(
    'user',
    NULL,
    jsonb_build_object(
      'source', 'get_admin_recent_activity',
      'limit', v_limit,
      'result_count', v_result_count
    )
  );
END;
$$;

COMMENT ON FUNCTION get_admin_recent_activity(INT, INT) IS
  'Returns paginated recent activity feed across donations, registrations, and '
  'verification events. Audits PII access via insert_admin_audit_read_entry. '
  'Requires admin JWT claim. Part of GIV-85/GIV-413.';

REVOKE ALL ON FUNCTION get_admin_recent_activity(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(INT, INT) TO service_role;

-- 6e. get_admin_alerts — exposes names/emails in descriptions
CREATE OR REPLACE FUNCTION get_admin_alerts()
RETURNS TABLE (
  alert_type    TEXT,
  severity      TEXT,
  title         TEXT,
  description   TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  created_at    TIMESTAMPTZ,
  count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_count BIGINT;
BEGIN
  -- Admin guard
  IF auth.jwt() -> 'user_metadata' ->> 'type' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY

  -- Pending charity verifications (high priority)
  SELECT
    'pending_verification'::TEXT    AS alert_type,
    'high'::TEXT                    AS severity,
    'Pending Charity Verification'::TEXT AS title,
    ('Charity awaiting verification: ' || COALESCE(p.name, 'Unknown charity'))::TEXT,
    cv.charity_id                   AS entity_id,
    'charity_verification'::TEXT    AS entity_type,
    cv.created_at,
    COUNT(*) OVER ()                AS count
  FROM charity_verifications cv
  LEFT JOIN profiles p ON p.id = cv.charity_id
  WHERE cv.status = 'pending'

  UNION ALL

  -- Expired validation requests (medium priority)
  SELECT
    'expired_validation'::TEXT,
    'medium'::TEXT,
    'Expired Validation Request'::TEXT,
    ('Validation request expired for volunteer: ' || COALESCE(vp.name, vru.email, 'Unknown'))::TEXT,
    vr.id,
    'validation_request'::TEXT,
    vr.created_at,
    COUNT(*) OVER ()
  FROM validation_requests vr
  LEFT JOIN profiles vp ON vp.user_id = vr.volunteer_id
  LEFT JOIN auth.users vru ON vru.id = vp.user_id
  WHERE vr.status = 'pending'
    AND vr.created_at < NOW() - INTERVAL '90 days'

  UNION ALL

  -- Removal requests awaiting admin action (high priority)
  SELECT
    'removal_request'::TEXT,
    'high'::TEXT,
    'Pending Removal Request'::TEXT,
    ('Account removal requested by: ' || COALESCE(rp.name, rru.email, 'Unknown user'))::TEXT,
    rr.user_id,
    'user'::TEXT,
    rr.created_at,
    COUNT(*) OVER ()
  FROM removal_requests rr
  LEFT JOIN profiles rp ON rp.user_id = rr.user_id
  LEFT JOIN auth.users rru ON rru.id = rp.user_id
  WHERE rr.status = 'pending'

  ORDER BY created_at ASC;

  -- Audit the PII list access
  GET DIAGNOSTICS v_result_count = ROW_COUNT;
  PERFORM insert_admin_audit_read_entry(
    'user',
    NULL,
    jsonb_build_object(
      'source', 'get_admin_alerts',
      'result_count', v_result_count
    )
  );
END;
$$;

COMMENT ON FUNCTION get_admin_alerts() IS
  'Returns all pending admin action items: charity verifications awaiting review, '
  'expired validation requests, and pending removal requests. '
  'Audits PII access via insert_admin_audit_read_entry. '
  'Requires admin JWT claim. Part of GIV-85/GIV-413.';

REVOKE ALL ON FUNCTION get_admin_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_alerts() TO service_role;
