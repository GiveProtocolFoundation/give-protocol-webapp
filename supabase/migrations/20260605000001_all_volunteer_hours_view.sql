-- all_volunteer_hours: reporting view that consolidates admin-tracked and
-- self-reported volunteer hours into a single queryable surface.
--
-- Spec: GIV-340 / GIV-341 / GIV-473

-- Schema reconciliation guard: volunteer_hours is created by two earlier
-- `CREATE TABLE IF NOT EXISTS` migrations that disagree on opportunity_id
-- (20250810000001 omits it; 20250811124738 is a no-op because the table
-- already exists). On a clean `db reset` the column is therefore absent and
-- the view below would fail. This idempotent ALTER guarantees the column
-- exists in every environment (no-op where it already does).
ALTER TABLE volunteer_hours ADD COLUMN IF NOT EXISTS opportunity_id uuid;

CREATE OR REPLACE VIEW all_volunteer_hours
WITH (security_invoker = true)
AS
  -- Admin-tracked hours (recorded by charity staff)
  SELECT
    vh.id,
    vh.volunteer_id,
    vh.charity_id        AS organization_id,
    vh.opportunity_id,
    vh.date_performed    AS hours_date,
    vh.hours,
    vh.description,
    vh.status::text      AS status,
    NULL::bigint         AS sbt_token_id,
    'admin_tracked'::text AS source,
    vh.created_at
  FROM volunteer_hours vh

  UNION ALL

  -- Self-reported hours (submitted by volunteers)
  SELECT
    sr.id,
    sr.volunteer_id,
    sr.organization_id,
    NULL::uuid           AS opportunity_id,
    sr.activity_date     AS hours_date,
    sr.hours,
    sr.description,
    sr.validation_status::text AS status,
    sr.sbt_token_id,
    'self_reported'::text AS source,
    sr.created_at
  FROM self_reported_hours sr;

COMMENT ON VIEW all_volunteer_hours IS
  'Consolidated reporting view: UNION of volunteer_hours (admin-tracked) and '
  'self_reported_hours (user self-reported). '
  'Do NOT use this view for GDPR erasure — erasure must target the two base '
  'tables (volunteer_hours, self_reported_hours) directly.';
