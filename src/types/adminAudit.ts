/** Action types that can be recorded in the admin audit log */
export type AdminAuditActionType =
  | "charity_status_change"
  | "user_status_change"
  | "donation_flag"
  | "donation_flag_resolve"
  | "validation_override"
  | "config_change"
  | "verification_approve"
  | "verification_reject"
  | "charity_suspend"
  | "charity_reinstate"
  | "user_suspend"
  | "user_reinstate"
  | "user_ban"
  | "view_pii"
  | "view_pii_list";

/** Entity types that admin actions can target */
export type AdminAuditEntityType =
  | "charity"
  | "user"
  | "donation"
  | "validation_request"
  | "platform_config"
  | "charity_verification"
  | "volunteer"
  | "content";

/** Allowed context keys for PII read audit entries */
export type AdminAuditReadContextKey =
  | "page"
  | "limit"
  | "filter_keys"
  | "result_count"
  | "source";

/** Context object for PII read audit entries (allowlisted keys only) */
export type AdminAuditReadContext = Partial<
  Record<AdminAuditReadContextKey, unknown>
>;

/** A single entry in the admin_audit_log table */
export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  actionType: AdminAuditActionType;
  entityType: AdminAuditEntityType;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

/** Filters for querying the admin audit log */
export interface AdminAuditLogFilters {
  actionType?: AdminAuditActionType;
  entityType?: AdminAuditEntityType;
  entityId?: string;
  adminUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/** Result from admin_get_audit_log RPC including total count for pagination */
export interface AdminAuditLogResult {
  entries: AdminAuditLogEntry[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** A row from the charity_status_audit table */
export interface CharityStatusAuditEntry {
  id: string;
  charityId: string;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  adminUserId: string;
  createdAt: string;
}

/** A row from the user_status_audit table */
export interface UserStatusAuditEntry {
  id: string;
  userId: string;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  adminUserId: string;
  createdAt: string;
}

/** Raw database row from admin_get_audit_log RPC (snake_case columns) */
export interface AdminAuditLogRow {
  id: string;
  admin_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  total_count: number;
}
