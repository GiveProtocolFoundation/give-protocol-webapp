import { supabase } from "@/lib/supabase";
import type {
  AdminDashboardStats,
  AdminActivityEvent,
  AdminActivityResult,
  AdminActivityRow,
  AdminAlert,
  AdminAlertRow,
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

  try {
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
      return EMPTY_ACTIVITY_RESULT;
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
  } catch (error) {
    Logger.error("Admin recent activity query failed", {
      error: error instanceof Error ? error.message : String(error),
      page,
      limit,
    });
    return EMPTY_ACTIVITY_RESULT;
  }
}

/**
 * Fetches pending admin alerts from get_admin_alerts().
 * Returns pending charity verifications, expired validation requests,
 * and pending removal requests.
 * Requires the current user to have admin JWT claims.
 * @returns Array of AdminAlert items
 */
export async function getAdminAlerts(): Promise<AdminAlert[]> {
  try {
    const { data, error } = await supabase.rpc("get_admin_alerts");

    if (error) {
      Logger.error("Error fetching admin alerts", { error });
      return [];
    }

    const rows = (data || []) as AdminAlertRow[];
    return rows.map(mapAlertRow);
  } catch (error) {
    Logger.error("Admin alerts query failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
