/**
 * Types for IRS TEOS (Tax Exempt Organization Search) data.
 * Used by the TEOS ingestion pipeline and verification workflows.
 *
 * GIV-1047 (MVP-CHR-01)
 */

/** TEOS Publication 78 status values for a charity organization */
export type TeosPub78Status =
  | "eligible"
  | "revoked"
  | "reinstated"
  | "not_found";

/** PPA v1.1 officer re-verification check result */
export type OfficerCheckResult =
  | "pending"
  | "verified"
  | "not_found"
  | "mismatch"
  | "error";

/** Result returned by the get_teos_status RPC */
export interface TeosStatus {
  ein: string;
  name: string;
  pub78Status: TeosPub78Status;
  deductibility: string | null;
  revocationDate: string | null;
  reinstatementDate: string | null;
  lastCheckedAt: string | null;
  isInPub78: boolean;
  isRevoked: boolean;
  isReinstated: boolean;
}

/** Raw row from get_teos_status RPC (snake_case) */
export interface TeosStatusRow {
  ein: string;
  name: string;
  pub78_status: string;
  deductibility: string | null;
  revocation_date: string | null;
  reinstatement_date: string | null;
  last_checked_at: string | null;
  is_in_pub78: boolean;
  is_revoked: boolean;
  is_reinstated: boolean;
}

/** Result returned by the get_charity_officer_verification RPC */
export interface OfficerVerification {
  repId: string;
  repName: string;
  repTitle: string | null;
  checkResult: OfficerCheckResult;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  isActive: boolean;
}

/** Raw row from get_charity_officer_verification RPC (snake_case) */
export interface OfficerVerificationRow {
  rep_id: string;
  rep_name: string;
  rep_title: string | null;
  check_result: string;
  last_checked_at: string | null;
  verified_at: string | null;
  is_active: boolean;
}

/** TEOS refresh log entry */
export interface TeosRefreshLogEntry {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "success" | "partial" | "failed";
  pub78Total: number;
  pub78Inserted: number;
  pub78Updated: number;
  revocTotal: number;
  revocInserted: number;
  revocUpdated: number;
  statusFlagsAdded: number;
  statusFlagsRemoved: number;
  officerChecksRun: number;
  officerChecksFailed: number;
  errorMessage: string | null;
}

/** Combined TEOS verification summary for a charity */
export interface TeosVerificationSummary {
  teosStatus: TeosStatus | null;
  officerVerifications: OfficerVerification[];
  lastRefresh: TeosRefreshLogEntry | null;
}
