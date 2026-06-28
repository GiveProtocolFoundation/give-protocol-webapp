-- Migration: Create admin audit trail infrastructure
-- Part of GIV-84: Audit trail infrastructure and RLS policies for admin backend
-- Creates the foundational audit tables, RLS policies, indexes, and RPC functions
-- that all admin operations depend on.

-- =============================================================================
-- 1. admin_audit_log — Master audit trail for all admin actions
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID        NOT NULL,     -- references auth.users.id
  action_type     TEXT        NOT NULL
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
                                'user_ban'
                              )),
  entity_type     TEXT        NOT NULL
                              CHECK (entity_type IN (
                                'charity',
                                'user',
                                'donation',
                                'validation_request',
                                'platform_config',
                                'charity_verification'
                              )),
  entity_id       UUID        NOT NULL,     -- PK of the affected entity
  old_values      JSONB,                    -- snapshot before the change
  new_values      JSONB,                    -- snapshot after the change
  ip_address      INET,                     -- request IP when available
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_audit_log IS
  'Master audit trail for every admin action. All admin RPCs insert a row here. '
  'Retention: 2 years minimum for compliance.';
COMMENT ON COLUMN admin_audit_log.admin_user_id IS
  'The auth.users.id of the admin who performed the action.';
COMMENT ON COLUMN admin_audit_log.action_type IS
  'Enumerated action type for filtering and reporting.';
COMMENT ON COLUMN admin_audit_log.old_values IS
  'JSONB snapshot of the entity state before the change (null for create actions).';
COMMENT ON COLUMN admin_audit_log.new_values IS
  'JSONB snapshot of the entity state after the change.';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user
  ON admin_audit_log (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
  ON admin_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON admin_audit_log (created_at DESC);

-- RLS: admin users can read audit log; only service_role or admin can insert
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_log" ON admin_audit_log;
CREATE POLICY "admin_read_audit_log" ON admin_audit_log
  FOR SELECT
  USING (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "admin_insert_audit_log" ON admin_audit_log;
CREATE POLICY "admin_insert_audit_log" ON admin_audit_log
  FOR INSERT
  WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

-- =============================================================================
-- 2. charity_status_audit — Track charity status transitions
-- =============================================================================
CREATE TABLE IF NOT EXISTS charity_status_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id      UUID        NOT NULL,     -- references charity profile
  previous_status TEXT        NOT NULL,
  new_status      TEXT        NOT NULL,
  reason          TEXT,                     -- admin-provided reason
  admin_user_id   UUID        NOT NULL,     -- references auth.users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE charity_status_audit IS
  'Records every charity status change (approve, reject, suspend, reinstate) with reason and admin ID.';

CREATE INDEX IF NOT EXISTS idx_charity_status_audit_charity
  ON charity_status_audit (charity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_charity_status_audit_admin
  ON charity_status_audit (admin_user_id, created_at DESC);

ALTER TABLE charity_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_charity_status_audit" ON charity_status_audit;
CREATE POLICY "admin_read_charity_status_audit" ON charity_status_audit
  FOR SELECT
  USING (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "admin_insert_charity_status_audit" ON charity_status_audit;
CREATE POLICY "admin_insert_charity_status_audit" ON charity_status_audit
  FOR INSERT
  WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

-- =============================================================================
-- 3. user_status_audit — Track user status transitions
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_status_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL,     -- references auth.users.id
  previous_status TEXT        NOT NULL,
  new_status      TEXT        NOT NULL,
  reason          TEXT,                     -- admin-provided reason
  admin_user_id   UUID        NOT NULL,     -- references auth.users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_status_audit IS
  'Records every user status change (suspend, reinstate, ban) with reason and admin ID.';

CREATE INDEX IF NOT EXISTS idx_user_status_audit_user
  ON user_status_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_status_audit_admin
  ON user_status_audit (admin_user_id, created_at DESC);

ALTER TABLE user_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_user_status_audit" ON user_status_audit;
CREATE POLICY "admin_read_user_status_audit" ON user_status_audit
  FOR SELECT
  USING (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "admin_insert_user_status_audit" ON user_status_audit;
CREATE POLICY "admin_insert_user_status_audit" ON user_status_audit
  FOR INSERT
  WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'type' = 'admin'
    OR auth.role() = 'service_role'
  );

-- =============================================================================
-- 4. admin_get_audit_log RPC — Paginated, filtered query for audit log
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_get_audit_log(
  p_action_type   TEXT        DEFAULT NULL,
  p_entity_type   TEXT        DEFAULT NULL,
  p_entity_id     UUID        DEFAULT NULL,
  p_admin_user_id UUID        DEFAULT NULL,
  p_date_from     TIMESTAMPTZ DEFAULT NULL,
  p_date_to       TIMESTAMPTZ DEFAULT NULL,
  p_page          INT         DEFAULT 1,
  p_limit         INT         DEFAULT 50
)
RETURNS TABLE (
  id              UUID,
  admin_user_id   UUID,
  action_type     TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ,
  total_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
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
    SELECT a.*
    FROM admin_audit_log a
    WHERE (p_action_type   IS NULL OR a.action_type   = p_action_type)
      AND (p_entity_type   IS NULL OR a.entity_type   = p_entity_type)
      AND (p_entity_id     IS NULL OR a.entity_id     = p_entity_id)
      AND (p_admin_user_id IS NULL OR a.admin_user_id = p_admin_user_id)
      AND (p_date_from     IS NULL OR a.created_at   >= p_date_from)
      AND (p_date_to       IS NULL OR a.created_at   <= p_date_to)
  )
  SELECT
    f.id,
    f.admin_user_id,
    f.action_type,
    f.entity_type,
    f.entity_id,
    f.old_values,
    f.new_values,
    f.ip_address,
    f.created_at,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION admin_get_audit_log IS
  'Paginated, filterable query for the admin audit log. Admin-only via JWT check.';

-- =============================================================================
-- 5. insert_admin_audit_entry — Helper function for admin RPCs to log actions
-- =============================================================================
CREATE OR REPLACE FUNCTION insert_admin_audit_entry(
  p_action_type   TEXT,
  p_entity_type   TEXT,
  p_entity_id     UUID,
  p_old_values    JSONB DEFAULT NULL,
  p_new_values    JSONB DEFAULT NULL,
  p_ip_address    INET  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_audit_id UUID;
BEGIN
  -- Guard: only admin users can call this function
  IF (auth.jwt() -> 'user_metadata' ->> 'type') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_admin_id := auth.uid();

  INSERT INTO admin_audit_log (
    admin_user_id, action_type, entity_type, entity_id,
    old_values, new_values, ip_address
  )
  VALUES (
    v_admin_id, p_action_type, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_ip_address
  )
  RETURNING admin_audit_log.id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION insert_admin_audit_entry IS
  'Helper function called by other admin RPCs to insert audit log entries. '
  'Automatically captures the current admin user ID from JWT.';
