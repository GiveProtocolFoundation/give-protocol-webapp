import { supabase } from "@/lib/supabase";
import type {
  AdminOverrideValidationInput,
  AdminSuspiciousVolunteerPattern,
  AdminSuspiciousVolunteerPatternRow,
  AdminValidationRequestFilters,
  AdminValidationRequestItem,
  AdminValidationRequestResult,
  AdminValidationRequestRow,
  AdminValidationStats,
  AdminValidationStatsRow,
  ValidationRequestStatus,
  VolunteerHoursEmailContext,
} from "@/types/adminVolunteerValidation";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminValidationRequestResult = {
  requests: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminValidationRequestItem.
 * @param row - Raw row from admin_list_validation_requests RPC
 * @returns Mapped AdminValidationRequestItem
 */
function mapRequestRow(
  row: AdminValidationRequestRow,
): AdminValidationRequestItem {
  return {
    id: row.id,
    volunteerId: row.volunteer_id,
    volunteerEmail: row.volunteer_email,
    volunteerDisplayName: row.volunteer_display_name,
    orgId: row.org_id,
    orgName: row.org_name,
    hoursReported: Number(row.hours_reported),
    activityDate: row.activity_date,
    status: row.status as ValidationRequestStatus,
    validatorUserId: row.validator_user_id,
    validatedAt: row.validated_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Fetches aggregated validation pipeline statistics via admin_validation_stats RPC.
 * Requires admin JWT claims.
 * @returns Pipeline statistics or null on failure
 */
export async function getValidationStats(): Promise<AdminValidationStats | null> {
  try {
    const { data, error } = await supabase.rpc("admin_validation_stats");

    if (error) {
      Logger.error("Error fetching admin validation stats", { error });
      return null;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const row = data[0] as AdminValidationStatsRow;
    const pendingByOrg = (row.pending_by_org ?? []).map(
      (o: {
        org_id: string;
        org_name: string | null;
        pending_count: number;
      }) => ({
        orgId: o.org_id,
        orgName: o.org_name,
        pendingCount: Number(o.pending_count),
      }),
    );

    return {
      totalPending: Number(row.total_pending),
      totalApproved: Number(row.total_approved),
      totalRejected: Number(row.total_rejected),
      totalExpired: Number(row.total_expired),
      avgResponseTimeHours: Number(row.avg_response_time_hours),
      expirationRate: Number(row.expiration_rate),
      rejectionRate: Number(row.rejection_rate),
      pendingByOrg,
    };
  } catch (error) {
    Logger.error("Admin validation stats query failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fetches a paginated, filtered list of validation requests via admin_list_validation_requests RPC.
 * Requires admin JWT claims.
 * @param filters - Optional filters for status, org, volunteer, date range, and pagination
 * @returns Paginated validation request result
 */
export async function listValidationRequests(
  filters: AdminValidationRequestFilters = {},
): Promise<AdminValidationRequestResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  try {
    const { data, error } = await supabase.rpc(
      "admin_list_validation_requests",
      {
        p_status: filters.status ?? null,
        p_org_id: filters.orgId ?? null,
        p_volunteer_id: filters.volunteerId ?? null,
        p_search: filters.search ?? null,
        p_date_from: filters.dateFrom ?? null,
        p_date_to: filters.dateTo ?? null,
        p_page: page,
        p_limit: limit,
      },
    );

    if (error) {
      Logger.error("Error fetching admin validation request list", {
        error,
        filters,
      });
      return EMPTY_RESULT;
    }

    const rows = (data || []) as AdminValidationRequestRow[];

    if (rows.length === 0) {
      return { ...EMPTY_RESULT, page, limit };
    }

    const totalCount = rows[0].total_count;
    const requests = rows.map(mapRequestRow);

    return {
      requests,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    Logger.error("Admin validation request list query failed", {
      error: error instanceof Error ? error.message : String(error),
      filters,
    });
    return EMPTY_RESULT;
  }
}

/**
 * Invokes the volunteer-hours-email edge function to notify a volunteer of their
 * hours approval or rejection. Called fire-and-forget after a successful override.
 * Errors are logged but never propagated to the caller.
 * @param input - requestId, newStatus, and reason
 * @param context - volunteer and submission details for the email body
 */
export async function notifyVolunteerHoursOverride(
  input: AdminOverrideValidationInput,
  context: VolunteerHoursEmailContext,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("volunteer-hours-email", {
      body: {
        volunteerId: context.volunteerId,
        volunteerDisplayName: context.volunteerDisplayName ?? null,
        orgName: context.orgName ?? null,
        hoursReported: context.hoursReported,
        activityDate: context.activityDate,
        newStatus: input.newStatus,
        reason: input.reason ?? null,
      },
    });
    if (error) {
      Logger.error("volunteer-hours-email edge function error", { error });
    }
  } catch (error) {
    Logger.error("notifyVolunteerHoursOverride failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Overrides the status of a validation request via admin_override_validation RPC.
 * Creates an entry in validation_overrides and admin_audit_log. Requires admin JWT claims.
 * Fires a volunteer email notification fire-and-forget when emailContext is provided.
 * @param input - requestId, newStatus, and reason
 * @param emailContext - optional volunteer context for email notification
 * @returns true on success, false on failure
 */
export async function overrideValidation(
  input: AdminOverrideValidationInput,
  emailContext?: VolunteerHoursEmailContext,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_override_validation", {
      p_request_id: input.requestId,
      p_new_status: input.newStatus,
      p_reason: input.reason,
    });

    if (error) {
      Logger.error("Error overriding validation request", { error, input });
      return false;
    }

    // Fire-and-forget: notify the volunteer by email. Failure must not block the override.
    if (emailContext) {
      notifyVolunteerHoursOverride(input, emailContext).catch(() => {
        // Errors are already logged inside notifyVolunteerHoursOverride
      });
    }

    return true;
  } catch (error) {
    Logger.error("Validation override failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return false;
  }
}

/**
 * Fetches suspicious volunteer patterns via admin_suspicious_volunteer_patterns RPC.
 * Returns volunteers exceeding configurable weekly hour thresholds. Requires admin JWT claims.
 * @returns Array of suspicious volunteer pattern rows
 */
export async function getSuspiciousPatterns(): Promise<
  AdminSuspiciousVolunteerPattern[]
> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_suspicious_volunteer_patterns",
    );

    if (error) {
      Logger.error("Error fetching suspicious volunteer patterns", { error });
      return [];
    }

    const rows = (data || []) as AdminSuspiciousVolunteerPatternRow[];

    return rows.map((row) => ({
      volunteerId: row.volunteer_id,
      volunteerEmail: row.volunteer_email,
      volunteerDisplayName: row.volunteer_display_name,
      orgId: row.org_id,
      orgName: row.org_name,
      weeklyHours: Number(row.weekly_hours),
      totalRequests: Number(row.total_requests),
    }));
  } catch (error) {
    Logger.error("Suspicious volunteer patterns query failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
