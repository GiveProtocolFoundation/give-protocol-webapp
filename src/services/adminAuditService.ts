import { supabase } from "@/lib/supabase";
import type {
  AdminAuditLogEntry,
  AdminAuditLogFilters,
  AdminAuditLogResult,
  AdminAuditLogRow,
  AdminAuditEntityType,
  AdminAuditReadContext,
} from "@/types/adminAudit";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminAuditLogResult = {
  entries: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminAuditLogEntry.
 * @param row - Raw row from admin_get_audit_log RPC
 * @returns Mapped AdminAuditLogEntry
 */
function mapAuditRow(row: AdminAuditLogRow): AdminAuditLogEntry {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    actionType: row.action_type as AdminAuditLogEntry["actionType"],
    entityType: row.entity_type as AdminAuditLogEntry["entityType"],
    entityId: row.entity_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

/**
 * Queries the admin audit log via the admin_get_audit_log RPC function.
 * Requires the current user to have admin JWT claims.
 * @param filters - Optional filters for action type, entity, date range, pagination
 * @returns Paginated audit log result
 */
export async function getAdminAuditLog(
  filters: AdminAuditLogFilters = {},
): Promise<AdminAuditLogResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  try {
    const { data, error } = await supabase.rpc("admin_get_audit_log", {
      p_action_type: filters.actionType ?? null,
      p_entity_type: filters.entityType ?? null,
      p_entity_id: filters.entityId ?? null,
      p_admin_user_id: filters.adminUserId ?? null,
      p_date_from: filters.dateFrom ?? null,
      p_date_to: filters.dateTo ?? null,
      p_page: page,
      p_limit: limit,
    });

    if (error) {
      Logger.error("Error fetching admin audit log", { error, filters });
      return EMPTY_RESULT;
    }

    const rows = (data || []) as AdminAuditLogRow[];

    if (rows.length === 0) {
      return { ...EMPTY_RESULT, page, limit };
    }

    const totalCount = rows[0].total_count;
    const entries = rows.map(mapAuditRow);

    return {
      entries,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    Logger.error("Admin audit log query failed", {
      error: error instanceof Error ? error.message : String(error),
      filters,
    });
    return EMPTY_RESULT;
  }
}

/**
 * Inserts an audit log entry via the insert_admin_audit_entry RPC function.
 * Called by other admin service functions after performing their operations.
 * @param actionType - The type of admin action performed
 * @param entityType - The type of entity affected
 * @param entityId - The ID of the affected entity
 * @param oldValues - Snapshot of the entity before the change
 * @param newValues - Snapshot of the entity after the change
 * @returns The generated audit entry UUID, or null on failure
 */
export async function insertAuditEntry(
  actionType: AdminAuditLogEntry["actionType"],
  entityType: AdminAuditLogEntry["entityType"],
  entityId: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("insert_admin_audit_entry", {
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_old_values: oldValues ?? null,
      p_new_values: newValues ?? null,
      p_ip_address: null,
    });

    if (error) {
      Logger.error("Failed to insert audit entry", {
        error,
        actionType,
        entityType,
        entityId,
      });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.error("Audit entry insertion failed", {
      error: error instanceof Error ? error.message : String(error),
      actionType,
      entityType,
      entityId,
    });
    return null;
  }
}

/**
 * Records a PII read-access audit entry via insert_admin_audit_read_entry RPC.
 * Called by admin pages that display PII (donor lists, donor detail, etc.).
 * The server-side RPC enforces context allowlisting and derives action_type from entity_id presence.
 * @param entityType - The type of entity whose PII was accessed
 * @param entityId - The specific entity ID (null for list views)
 * @param context - Metadata about the access (page, limit, source, etc.)
 * @returns The generated audit entry UUID, or null on failure
 */
export async function logRead(
  entityType: AdminAuditEntityType,
  entityId?: string | null,
  context?: AdminAuditReadContext | null,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc(
      "insert_admin_audit_read_entry",
      {
        p_entity_type: entityType,
        p_entity_id: entityId ?? null,
        p_context: context ?? null,
      },
    );

    if (error) {
      Logger.error("Failed to log PII read access", {
        error,
        entityType,
        entityId,
      });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.error("PII read audit failed", {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
    });
    return null;
  }
}
