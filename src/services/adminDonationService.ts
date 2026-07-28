import { supabase } from "@/lib/supabase";
import type {
  AdminDonationListFilters,
  AdminDonationListItem,
  AdminDonationListResult,
  AdminDonationListRow,
  AdminDonationSummaryRow,
  AdminFlagDonationInput,
  AdminResolveFlagInput,
  DonationPaymentMethod,
  DonationSummaryGroupBy,
} from "@/types/adminDonation";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminDonationListResult = {
  donations: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminDonationListItem.
 * @param row - Raw row from admin_list_donations RPC
 * @returns Mapped AdminDonationListItem
 */
function mapDonationRow(row: AdminDonationListRow): AdminDonationListItem {
  return {
    id: row.id,
    paymentMethod: row.payment_method as DonationPaymentMethod,
    amount: Number(row.amount),
    amountUsd: row.amount_usd !== null ? Number(row.amount_usd) : null,
    currency: row.currency,
    charityId: row.charity_id,
    charityName: row.charity_name,
    donorUserId: row.donor_user_id,
    donorEmail: row.donor_email,
    donorDisplayName: row.donor_display_name,
    txHash: row.tx_hash,
    processorId: row.processor_id,
    status: row.status,
    isFlagged: Boolean(row.is_flagged),
    openFlagCount: Number(row.open_flag_count),
    createdAt: row.created_at,
  };
}

/**
 * Fetches a paginated, filtered list of donations via the admin_list_donations RPC.
 * Unions crypto and fiat donations. Requires admin JWT claims.
 * @param filters - Optional filters for payment method, charity, donor, date range, amount, flags, and pagination
 * @returns Paginated donation list result
 */
export async function listDonations(
  filters: AdminDonationListFilters = {},
): Promise<AdminDonationListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const { data, error } = await supabase.rpc("admin_list_donations", {
    p_payment_method: filters.paymentMethod ?? null,
    p_charity_id: filters.charityId ?? null,
    p_donor_user_id: filters.donorUserId ?? null,
    p_search: filters.search ?? null,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_min_amount_usd: filters.minAmountUsd ?? null,
    p_max_amount_usd: filters.maxAmountUsd ?? null,
    p_flagged: filters.flagged ?? null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    Logger.error("Error fetching admin donation list", { error, filters });
    throw new Error(
      `admin_list_donations RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminDonationListRow[];

  if (rows.length === 0) {
    return { ...EMPTY_RESULT, page, limit };
  }

  const totalCount = rows[0].total_count;
  const donations = rows.map(mapDonationRow);

  return {
    donations,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Fetches aggregated donation summary data via admin_donation_summary RPC.
 * Used for reporting and CSV export. Requires admin JWT claims.
 * @param dateFrom - Start of the reporting period (ISO string)
 * @param dateTo - End of the reporting period (ISO string)
 * @param groupBy - Grouping dimension: charity, day, week, month, or payment_method
 * @returns Array of aggregated summary rows
 */
export async function getDonationSummary(
  dateFrom: string,
  dateTo: string,
  groupBy: DonationSummaryGroupBy,
): Promise<AdminDonationSummaryRow[]> {
  const { data, error } = await supabase.rpc("admin_donation_summary", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_group_by: groupBy,
  });

  if (error) {
    Logger.error("Error fetching donation summary", {
      error,
      dateFrom,
      dateTo,
      groupBy,
    });
    throw new Error(
      `admin_donation_summary RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as Array<{
    group_key: string;
    payment_method: string;
    total_amount_usd: number;
    donation_count: number;
    charity_id: string | null;
    charity_name: string | null;
  }>;

  return rows.map((row) => ({
    groupKey: row.group_key,
    paymentMethod: row.payment_method as DonationPaymentMethod,
    totalAmountUsd: Number(row.total_amount_usd),
    donationCount: Number(row.donation_count),
    charityId: row.charity_id,
    charityName: row.charity_name,
  }));
}

/**
 * Flags a donation for review via admin_flag_donation RPC.
 * Inserts into donation_flags and admin_audit_log. Requires admin JWT claims.
 * @param input - donationId, donationType, and reason
 * @returns The flag record UUID, or null on failure
 */
export async function flagDonation(
  input: AdminFlagDonationInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("admin_flag_donation", {
      p_donation_id: input.donationId,
      p_donation_type: input.donationType,
      p_reason: input.reason,
    });

    if (error) {
      Logger.error("Error flagging donation", { error, input });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.error("Donation flag failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return null;
  }
}

/**
 * Resolves an open donation flag via admin_resolve_flag RPC.
 * Updates donation_flags and admin_audit_log. Requires admin JWT claims.
 * @param input - flagId and optional resolutionNote
 * @returns true on success, false on failure
 */
export async function resolveFlag(
  input: AdminResolveFlagInput,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_resolve_flag", {
      p_flag_id: input.flagId,
      p_resolution_note: input.resolutionNote ?? null,
    });

    if (error) {
      Logger.error("Error resolving donation flag", { error, input });
      return false;
    }

    return true;
  } catch (error) {
    Logger.error("Donation flag resolve failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return false;
  }
}

/**
 * Converts an array of AdminDonationSummaryRow to a CSV string for download.
 * @param rows - Summary rows to export
 * @returns CSV string with header row
 */
export function summaryToCsv(rows: AdminDonationSummaryRow[]): string {
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
