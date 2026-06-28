/**
 * Status of a volunteer validation request.
 * - pending: awaiting peer validator response
 * - approved: validator confirmed the hours
 * - rejected: validator rejected the hours
 * - expired: no response before deadline
 */
export type ValidationRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

/** Aggregated pipeline statistics from admin_validation_stats RPC */
export interface AdminValidationStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalExpired: number;
  /** Average hours between request creation and validation response */
  avgResponseTimeHours: number;
  /** Fraction of requests that expired before a response (0–1) */
  expirationRate: number;
  /** Fraction of responded requests that were rejected (0–1) */
  rejectionRate: number;
  /** Pending request counts grouped by organisation */
  pendingByOrg: AdminPendingByOrg[];
}

/** Per-org pending count row from admin_validation_stats */
export interface AdminPendingByOrg {
  orgId: string;
  orgName: string | null;
  pendingCount: number;
}

/** A single validation request row from admin_list_validation_requests RPC */
export interface AdminValidationRequestItem {
  id: string;
  volunteerId: string;
  volunteerEmail: string | null;
  volunteerDisplayName: string | null;
  orgId: string;
  orgName: string | null;
  hoursReported: number;
  activityDate: string;
  status: ValidationRequestStatus;
  validatorUserId: string | null;
  validatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Filters for admin_list_validation_requests */
export interface AdminValidationRequestFilters {
  status?: ValidationRequestStatus;
  orgId?: string;
  volunteerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/** Paginated result from admin_list_validation_requests */
export interface AdminValidationRequestResult {
  requests: AdminValidationRequestItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Input for admin_override_validation RPC */
export interface AdminOverrideValidationInput {
  requestId: string;
  newStatus: ValidationRequestStatus;
  reason: string;
}

/** Volunteer context passed to the hours email notification */
export interface VolunteerHoursEmailContext {
  volunteerId: string;
  volunteerDisplayName: string | null;
  orgName: string | null;
  hoursReported: number;
  activityDate: string;
}

/** A suspicious volunteer pattern row from admin_suspicious_volunteer_patterns RPC */
export interface AdminSuspiciousVolunteerPattern {
  volunteerId: string;
  volunteerEmail: string | null;
  volunteerDisplayName: string | null;
  orgId: string;
  orgName: string | null;
  /** Hours reported in the rolling 7-day window */
  weeklyHours: number;
  /** Total validation requests from this volunteer */
  totalRequests: number;
}

/** Raw database row from admin_list_validation_requests RPC (snake_case) */
export interface AdminValidationRequestRow {
  id: string;
  volunteer_id: string;
  volunteer_email: string | null;
  volunteer_display_name: string | null;
  org_id: string;
  org_name: string | null;
  hours_reported: string | number;
  activity_date: string;
  status: string;
  validator_user_id: string | null;
  validated_at: string | null;
  expires_at: string | null;
  created_at: string;
  total_count: number;
}

/** Raw database row from admin_validation_stats RPC (snake_case) */
export interface AdminValidationStatsRow {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_expired: number;
  avg_response_time_hours: number;
  expiration_rate: number;
  rejection_rate: number;
  pending_by_org: Array<{
    org_id: string;
    org_name: string | null;
    pending_count: number;
  }>;
}

/** Raw database row from admin_suspicious_volunteer_patterns RPC (snake_case) */
export interface AdminSuspiciousVolunteerPatternRow {
  volunteer_id: string;
  volunteer_email: string | null;
  volunteer_display_name: string | null;
  org_id: string;
  org_name: string | null;
  weekly_hours: number;
  total_requests: number;
}
