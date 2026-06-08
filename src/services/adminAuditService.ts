import { supabase } from "@/lib/supabase";
import type {
  AdminAuditEntityType,
  AdminAuditLogEntry,
  AdminAuditLogFilters,
  AdminAuditLogResult,
  AdminAuditLogRow,
} from "@/types/adminAudit";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminAuditLogResult = {
  entries: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/** Context for read audit log entries. Only filter keys (not values) are recorded. */
export interface LogReadContext {
  page?: number;
  limit?: number;
  filterKeys?: string[];
  resultCount?: number;
  source?: string;
}

/** In-memory dedup window (~1 s) to absorb StrictMode double-mount and rapid filter typing */
const dedupWindow = new Map<string, number>();
const DEDUP_MS = 1000;

/**
 * Clears the in-memory dedup window. Exposed for testing only.
 */
export function _resetDedupWindow(): void {
  dedupWindow.clear();
}

/**
 * Produces a stable string key from a LogReadContext for dedup keying.
 * @param ctx - The context to hash
 * @returns A deterministic string representation
 */
function stableContextKey(ctx?: LogReadContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.page !== undefined) parts.push(`p:${ctx.page}`);
  if (ctx.limit !== undefined) parts.push(`l:${ctx.limit}`);
  if (ctx.filterKeys) parts.push(`fk:${[...ctx.filterKeys].sort().join(",")}`);
  if (ctx.resultCount !== undefined) parts.push(`rc:${ctx.resultCount}`);
  if (ctx.source) parts.push(`s:${ctx.source}`);
  return parts.join("|");
}

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
      Logger.error("Failed to insert audit entry", { error, actionType, entityType, entityId });
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
 * Logs a read/view action for admin PII access audit trail.
 * Invokes the insert_admin_audit_read_entry RPC. Includes in-memory dedup
 * (~1 s window) to absorb React StrictMode double-mount and rapid filter typing.
 * Errors are swallowed silently to avoid breaking the user-facing page.
 * @param entityType - The type of entity being viewed
 * @param entityId - The specific entity ID, or null for list views
 * @param context - Additional context (page, limit, filter keys, result count)
 * @returns The generated audit entry UUID, or null on failure/dedup
 */
export async function logRead(
  entityType: AdminAuditEntityType,
  entityId: string | null,
  context?: LogReadContext,
): Promise<string | null> {
  const dedupKey = `${entityType}:${entityId ?? "list"}:${stableContextKey(context)}`;
  const now = Date.now();

  // Check dedup window
  const lastCall = dedupWindow.get(dedupKey);
  if (lastCall !== undefined && now - lastCall < DEDUP_MS) {
    return null;
  }

  // Expire stale entries
  for (const [key, ts] of dedupWindow) {
    if (now - ts >= DEDUP_MS) {
      dedupWindow.delete(key);
    }
  }

  dedupWindow.set(dedupKey, now);

  try {
    const actionType = entityId !== null ? "view_pii" : "view_pii_list";
    const { data, error } = await supabase.rpc(
      "insert_admin_audit_read_entry",
      {
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_context: context
          ? {
              page: context.page,
              limit: context.limit,
              filter_keys: context.filterKeys,
              result_count: context.resultCount,
              source: context.source,
            }
          : null,
      },
    );

    if (error) {
      Logger.warn("Failed to log admin read audit entry", {
        error,
        entityType,
        entityId,
      });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.warn("Admin read audit logging failed", {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
    });
    return null;
  }
}
