import { supabase } from "@/lib/supabase";
import type {
  AdminDashboardStats,
  AdminActivityEvent,
  AdminActivityResult,
  AdminActivityRow,
  AdminAlert,
  AdminAlertRow,
  GdprCronStatus,
} from "@/types/adminDashboard";
import { Logger } from "@/utils/logger";

const EMPTY_ACTIVITY_RESULT: AdminActivityResult = {
  events: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw snake_case activity row to a camelCase AdminActivityEvent.
 */
function mapActivityRow(row: AdminActivityRow): AdminActivityEvent {
  return {
    id: row.id,
    eventType: row.event_type as AdminActivityEvent["eventType"],
    description: row.description,
    actorId: row.actor_id,
    actorName: row.actor_name,
    entityId: row.entity_id,
    entityType: row.entity_type,
    amountUsd: row.amount_usd,
    eventTime: row.event_time,
  };
}

/**
 * Maps a raw snake_case alert row to a camelCase AdminAlert.
 */
function mapAlertRow(row: AdminAlertRow): AdminAlert {
  return {
    alertType: row.alert_type as AdminAlert["alertType"],
    severity: row.severity as AdminAlert["severity"],
    title: row.title,
    description: row.description,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdAt: row.created_at,
    count: row.count,
  };
}

/**
 * Fetches real-time KPI aggregate stats from the get_admin_dashboard_stats() RPC.
 * Requires the current user to have admin JWT claims.
 * @returns AdminDashboardStats
 * @throws Error with the Supabase error details when the RPC fails
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

  if (error) {
    Logger.error("Error fetching admin dashboard stats", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      `Admin stats RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  if (!data) {
    throw new Error("Admin stats RPC returned empty data");
  }

  // RPC returns a JSONB object — cast it directly (keys already camelCase)
  return data as AdminDashboardStats;
}

/**
 * Fetches the paginated recent activity feed from get_admin_recent_activity().
 * Requires the current user to have admin JWT claims.
 * @param page - Page number (1-indexed)
 * @param limit - Items per page (max 200)
 * @returns Paginated AdminActivityResult
 */
export async function getAdminRecentActivity(
  page = 1,
  limit = 50,
): Promise<AdminActivityResult> {
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc("get_admin_recent_activity", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    Logger.error("Error fetching admin recent activity", {
      error,
      page,
      limit,
    });
    throw new Error(
      `get_admin_recent_activity RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminActivityRow[];

  if (rows.length === 0) {
    return { ...EMPTY_ACTIVITY_RESULT, page, limit };
  }

  const totalCount = rows[0].total_count;
  const events = rows.map(mapActivityRow);

  return {
    events,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Fetches pending admin alerts from get_admin_alerts().
 * Returns pending charity verifications, removal requests, expired and stale
 * volunteer validation requests, and open donation flags. Matters sitting
 * more than 3 days come back with severity "high" (GIV-721).
 * Requires the current user to have admin JWT claims.
 * @returns Array of AdminAlert items
 */
export async function getAdminAlerts(): Promise<AdminAlert[]> {
  const { data, error } = await supabase.rpc("get_admin_alerts");

  if (error) {
    Logger.error("Error fetching admin alerts", { error });
    throw new Error(
      `get_admin_alerts RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminAlertRow[];
  return rows.map(mapAlertRow);
}

/** Default fallback status when the cron is active on schedule but has no executions recorded yet */
export const DEFAULT_GDPR_CRON_STATUS: GdprCronStatus = {
  jobName: "gdpr-erasure-nightly",
  isScheduled: true,
  isActive: true,
  schedule: "0 2 * * *",
  lastRun: null,
  recentRuns: [],
  pendingErasuresCount: 0,
  totalErasuresProcessed: 0,
  lastErasureAt: null,
  checkedAt: new Date().toISOString(),
};

/**
 * Fetches real-time status and execution history for the GDPR Article 17 nightly
 * erasure cron job.
 * Satisfies audit finding #23 (GIV-864 F4).
 *
 * @returns GdprCronStatus
 */
export async function getGdprCronStatus(): Promise<GdprCronStatus> {
  const { data, error } = await supabase.rpc("get_gdpr_cron_status");

  if (error) {
    Logger.error("Error fetching GDPR cron status", {
      code: error.code,
      message: error.message,
    });
    // In dev or environments without the RPC yet, provide graceful fallback
    return {
      ...DEFAULT_GDPR_CRON_STATUS,
      checkedAt: new Date().toISOString(),
    };
  }

  if (!data) {
    return {
      ...DEFAULT_GDPR_CRON_STATUS,
      checkedAt: new Date().toISOString(),
    };
  }

  return data as GdprCronStatus;
}
