import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import type {
  TeosStatus,
  TeosStatusRow,
  TeosPub78Status,
  OfficerVerification,
  OfficerVerificationRow,
  OfficerCheckResult,
  TeosRefreshLogEntry,
  TeosVerificationSummary,
} from "@/types/teosVerification";

/**
 * Fetches TEOS exempt status for a given EIN.
 * Calls the `get_teos_status` RPC which returns Pub 78 status,
 * deductibility, and revocation information.
 *
 * @param ein - The Employer Identification Number (9 digits, no hyphens)
 * @returns TeosStatus object or null if not found / on error
 */
export async function getTeosStatus(
  ein: string,
): Promise<TeosStatus | null> {
  if (!ein) return null;

  const normalizedEin = ein.replace(/-/g, "");

  try {
    const { data, error } = await supabase.rpc("get_teos_status", {
      p_ein: normalizedEin,
    });

    if (error) {
      Logger.error("Error fetching TEOS status", { error, ein });
      return null;
    }

    const rows = data as TeosStatusRow[] | null;
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      ein: row.ein,
      name: row.name,
      pub78Status: (row.pub78_status || "not_found") as TeosPub78Status,
      deductibility: row.deductibility,
      revocationDate: row.revocation_date,
      reinstatementDate: row.reinstatement_date,
      lastCheckedAt: row.last_checked_at,
      isInPub78: row.is_in_pub78,
      isRevoked: row.is_revoked,
      isReinstated: row.is_reinstated,
    };
  } catch (err) {
    Logger.error("Exception fetching TEOS status", {
      error: err instanceof Error ? err.message : String(err),
      ein,
    });
    return null;
  }
}

/**
 * Fetches PPA v1.1 officer verification records for a given EIN.
 * Returns all active Authorized Representative verification entries.
 *
 * @param ein - The Employer Identification Number
 * @returns Array of OfficerVerification records, or empty array on error
 */
export async function getOfficerVerifications(
  ein: string,
): Promise<OfficerVerification[]> {
  if (!ein) return [];

  const normalizedEin = ein.replace(/-/g, "");

  try {
    const { data, error } = await supabase.rpc(
      "get_charity_officer_verification",
      { p_ein: normalizedEin },
    );

    if (error) {
      Logger.error("Error fetching officer verifications", { error, ein });
      return [];
    }

    const rows = data as OfficerVerificationRow[] | null;
    if (!rows) return [];

    return rows.map((row) => ({
      repId: row.rep_id,
      repName: row.rep_name,
      repTitle: row.rep_title,
      checkResult: (row.check_result || "pending") as OfficerCheckResult,
      lastCheckedAt: row.last_checked_at,
      verifiedAt: row.verified_at,
      isActive: row.is_active,
    }));
  } catch (err) {
    Logger.error("Exception fetching officer verifications", {
      error: err instanceof Error ? err.message : String(err),
      ein,
    });
    return [];
  }
}

/**
 * Fetches the most recent TEOS refresh log entry.
 *
 * @returns TeosRefreshLogEntry or null if no refresh has run yet
 */
export async function getLatestRefreshLog(): Promise<TeosRefreshLogEntry | null> {
  try {
    const { data, error } = await supabase
      .from("teos_refresh_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      Logger.error("Error fetching TEOS refresh log", { error });
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      status: data.status,
      pub78Total: data.pub78_total,
      pub78Inserted: data.pub78_inserted,
      pub78Updated: data.pub78_updated,
      revocTotal: data.revoc_total,
      revocInserted: data.revoc_inserted,
      revocUpdated: data.revoc_updated,
      statusFlagsAdded: data.status_flags_added,
      statusFlagsRemoved: data.status_flags_removed,
      officerChecksRun: data.officer_checks_run,
      officerChecksFailed: data.officer_checks_failed,
      errorMessage: data.error_message,
    };
  } catch (err) {
    Logger.error("Exception fetching TEOS refresh log", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Fetches a combined TEOS verification summary for a charity.
 * Includes TEOS exempt status, officer verifications, and last refresh info.
 *
 * @param ein - The Employer Identification Number
 * @returns TeosVerificationSummary combining all TEOS data
 */
export async function getTeosVerificationSummary(
  ein: string,
): Promise<TeosVerificationSummary> {
  const [teosStatus, officerVerifications, lastRefresh] = await Promise.all([
    getTeosStatus(ein),
    getOfficerVerifications(ein),
    getLatestRefreshLog(),
  ]);

  return {
    teosStatus,
    officerVerifications,
    lastRefresh,
  };
}
