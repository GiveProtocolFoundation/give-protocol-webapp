import { supabase } from "@/lib/supabase";
import type {
  CharityGrowthRow,
  CharityGrowthRawRow,
  DonorActivityRow,
  DonorActivityRawRow,
  VolunteerReportRow,
  VolunteerReportRawRow,
  PlatformHealthRow,
  PlatformHealthRawRow,
  PlatformHealthPeriod,
} from "@/types/adminReports";
import type { AdminAuditLogEntry } from "@/types/adminAudit";
import type { AdminDonationSummaryRow } from "@/types/adminDonation";
import { downloadCSV } from "@/utils/csvHelpers";
import { Logger } from "@/utils/logger";

// ─── Charity Growth ───────────────────────────────────────────────────────────

/**
 * Fetches charity registration and approval trends via admin_charity_growth_report RPC.
 * Requires admin JWT claims.
 * @param dateFrom - Start of the reporting period (ISO string)
 * @param dateTo - End of the reporting period (ISO string)
 * @returns Array of CharityGrowthRow data points
 */
export async function getCharityGrowthReport(
  dateFrom: string,
  dateTo: string,
): Promise<CharityGrowthRow[]> {
  const { data, error } = await supabase.rpc("admin_charity_growth_report", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    Logger.error("Error fetching charity growth report", {
      error,
      dateFrom,
      dateTo,
    });
    throw new Error(
      `admin_charity_growth_report RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as CharityGrowthRawRow[];
  return rows.map((row) => ({
    period: row.period,
    newRegistrations: Number(row.new_registrations),
    approved: Number(row.approved),
    rejected: Number(row.rejected),
    active: Number(row.active),
    suspended: Number(row.suspended),
  }));
}

// ─── Donor Activity ───────────────────────────────────────────────────────────

/**
 * Fetches donor registration, activity, and retention metrics via admin_donor_activity_report RPC.
 * Requires admin JWT claims.
 * @param dateFrom - Start of the reporting period (ISO string)
 * @param dateTo - End of the reporting period (ISO string)
 * @returns Array of DonorActivityRow data points
 */
export async function getDonorActivityReport(
  dateFrom: string,
  dateTo: string,
): Promise<DonorActivityRow[]> {
  const { data, error } = await supabase.rpc("admin_donor_activity_report", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    Logger.error("Error fetching donor activity report", {
      error,
      dateFrom,
      dateTo,
    });
    throw new Error(
      `admin_donor_activity_report RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as DonorActivityRawRow[];
  return rows.map((row) => ({
    period: row.period,
    newDonors: Number(row.new_donors),
    activeDonors: Number(row.active_donors),
    dormantDonors: Number(row.dormant_donors),
    avgDonationUsd: Number(row.avg_donation_usd),
    repeatDonorRate: Number(row.repeat_donor_rate),
  }));
}

// ─── Volunteer Hours ──────────────────────────────────────────────────────────

/**
 * Fetches volunteer hours and validation pipeline metrics via admin_volunteer_report RPC.
 * Requires admin JWT claims.
 * @param dateFrom - Start of the reporting period (ISO string)
 * @param dateTo - End of the reporting period (ISO string)
 * @returns Array of VolunteerReportRow data points
 */
export async function getVolunteerReport(
  dateFrom: string,
  dateTo: string,
): Promise<VolunteerReportRow[]> {
  const { data, error } = await supabase.rpc("admin_volunteer_report", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    Logger.error("Error fetching volunteer report", {
      error,
      dateFrom,
      dateTo,
    });
    throw new Error(
      `admin_volunteer_report RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as VolunteerReportRawRow[];
  return rows.map((row) => ({
    period: row.period,
    hoursSubmitted: Number(row.hours_submitted),
    hoursValidated: Number(row.hours_validated),
    hoursRejected: Number(row.hours_rejected),
    rejectionRate: Number(row.rejection_rate),
    avgValidationDays: Number(row.avg_validation_days),
  }));
}

// ─── Platform Health ──────────────────────────────────────────────────────────

/**
 * Fetches cross-cutting KPI aggregation via admin_platform_health_summary RPC.
 * Requires admin JWT claims.
 * @param period - Time period for trending: "7d" | "30d" | "90d"
 * @returns Array of PlatformHealthRow metrics
 */
export async function getPlatformHealthSummary(
  period: PlatformHealthPeriod,
): Promise<PlatformHealthRow[]> {
  const { data, error } = await supabase.rpc(
    "admin_platform_health_summary",
    {
      p_period: period,
    },
  );

  if (error) {
    Logger.error("Error fetching platform health summary", { error, period });
    throw new Error(
      `admin_platform_health_summary RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as PlatformHealthRawRow[];
  return rows.map((row) => ({
    metric: row.metric,
    value: Number(row.value),
    trend7d: row.trend_7d !== null ? Number(row.trend_7d) : null,
    trend30d: row.trend_30d !== null ? Number(row.trend_30d) : null,
    unit: row.unit,
  }));
}

// ─── CSV export helpers ───────────────────────────────────────────────────────

/**
 * Converts CharityGrowthRow array to a CSV string.
 * @param rows - Rows to export
 * @returns CSV string with header row
 */
export function charityGrowthToCsv(rows: CharityGrowthRow[]): string {
  const header = "Period,New Registrations,Approved,Rejected,Active,Suspended";
  const lines = rows.map((r) =>
    [
      r.period,
      r.newRegistrations,
      r.approved,
      r.rejected,
      r.active,
      r.suspended,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Converts DonorActivityRow array to a CSV string.
 * @param rows - Rows to export
 * @returns CSV string with header row
 */
export function donorActivityToCsv(rows: DonorActivityRow[]): string {
  const header =
    "Period,New Donors,Active Donors,Dormant Donors,Avg Donation USD,Repeat Donor Rate";
  const lines = rows.map((r) =>
    [
      r.period,
      r.newDonors,
      r.activeDonors,
      r.dormantDonors,
      r.avgDonationUsd.toFixed(2),
      `${(r.repeatDonorRate * 100).toFixed(1)}%`,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Converts VolunteerReportRow array to a CSV string.
 * @param rows - Rows to export
 * @returns CSV string with header row
 */
export function volunteerReportToCsv(rows: VolunteerReportRow[]): string {
  const header =
    "Period,Hours Submitted,Hours Validated,Hours Rejected,Rejection Rate,Avg Validation Days";
  const lines = rows.map((r) =>
    [
      r.period,
      r.hoursSubmitted,
      r.hoursValidated,
      r.hoursRejected,
      `${(r.rejectionRate * 100).toFixed(1)}%`,
      r.avgValidationDays.toFixed(1),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Converts PlatformHealthRow array to a CSV string.
 * @param rows - Rows to export
 * @returns CSV string with header row
 */
export function platformHealthToCsv(rows: PlatformHealthRow[]): string {
  const header = "Metric,Value,Unit,Trend 7d,Trend 30d";
  const lines = rows.map((r) =>
    [
      `"${r.metric}"`,
      r.value,
      r.unit,
      r.trend7d !== null ? r.trend7d : "",
      r.trend30d !== null ? r.trend30d : "",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Converts an AdminAuditLogEntry array to a CSV string.
 * @param entries - Entries to export
 * @returns CSV string with header row
 */
export function auditLogToCsv(entries: AdminAuditLogEntry[]): string {
  const header =
    "ID,Admin User ID,Action Type,Entity Type,Entity ID,IP Address,Created At";
  const lines = entries.map((e) =>
    [
      e.id,
      e.adminUserId,
      e.actionType,
      e.entityType,
      e.entityId,
      e.ipAddress ?? "",
      e.createdAt,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Converts an AdminDonationSummaryRow array to a CSV string.
 * @param rows - Summary rows to export
 * @returns CSV string with header row
 */
export function donationSummaryToCsv(rows: AdminDonationSummaryRow[]): string {
  const header = "Group,Payment Method,Total USD,Count,Charity ID,Charity Name";
  const lines = rows.map((r) =>
    [
      `"${r.groupKey}"`,
      r.paymentMethod,
      r.totalAmountUsd.toFixed(2),
      r.donationCount,
      r.charityId ?? "",
      `"${r.charityName ?? ""}"`,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Triggers a browser download of a CSV string as a file.
 * @param csvContent - The CSV string to download
 * @param filename - The filename for the downloaded file
 */
export function downloadReport(csvContent: string, filename: string): void {
  downloadCSV(csvContent, filename);
}
