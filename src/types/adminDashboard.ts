/** Trend counters returned by get_admin_dashboard_stats() */
export interface AdminDashboardTrends {
  donations7d: number;
  donations30d: number;
  registrations7d: number;
  registrations30d: number;
}

/** KPI aggregate data from get_admin_dashboard_stats() */
export interface AdminDashboardStats {
  totalDonors: number;
  totalCharities: number;
  verifiedCharities: number;
  pendingCharities: number;
  totalVolunteers: number;
  cryptoVolumeUsd: number;
  fiatVolumeUsd: number;
  totalVolumeUsd: number;
  trends: AdminDashboardTrends;
}

/** Activity event types returned by get_admin_recent_activity() */
export type AdminActivityEventType =
  "donation" | "registration" | "verification" | "volunteer_hours";

/** A single activity event from get_admin_recent_activity() */
export interface AdminActivityEvent {
  id: string;
  eventType: AdminActivityEventType;
  description: string;
  actorId: string | null;
  actorName: string | null;
  entityId: string | null;
  entityType: string | null;
  amountUsd: number | null;
  eventTime: string;
}

/** Paginated result for get_admin_recent_activity() */
export interface AdminActivityResult {
  events: AdminActivityEvent[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Alert severity levels */
export type AdminAlertSeverity = "high" | "medium" | "low";

/** Alert types returned by get_admin_alerts() */
export type AdminAlertType =
  | "pending_verification"
  | "expired_validation"
  | "pending_validation"
  | "removal_request"
  | "donation_flag";

/** A single pending admin alert */
export interface AdminAlert {
  alertType: AdminAlertType;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  entityId: string;
  entityType: string;
  createdAt: string;
  count: number;
}

/** Raw snake_case row from get_admin_dashboard_stats() JSONB (parsed) */
export interface AdminDashboardStatsRaw {
  totalDonors: number;
  totalCharities: number;
  verifiedCharities: number;
  pendingCharities: number;
  totalVolunteers: number;
  cryptoVolumeUsd: number;
  fiatVolumeUsd: number;
  totalVolumeUsd: number;
  trends: {
    donations7d: number;
    donations30d: number;
    registrations7d: number;
    registrations30d: number;
  };
}

/** Raw snake_case row from get_admin_recent_activity() */
export interface AdminActivityRow {
  id: string;
  event_type: string;
  description: string;
  actor_id: string | null;
  actor_name: string | null;
  entity_id: string | null;
  entity_type: string | null;
  amount_usd: number | null;
  event_time: string;
  total_count: number;
}

/** Raw snake_case row from get_admin_alerts() */
export interface AdminAlertRow {
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  entity_id: string;
  entity_type: string;
  created_at: string;
  count: number;
}
