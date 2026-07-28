import { supabase } from "@/lib/supabase";
import type {
  AdminDonorDetail,
  AdminDonorListFilters,
  AdminDonorListItem,
  AdminDonorListResult,
  AdminDonorListRow,
  AdminDonorStatusUpdateInput,
  DonorUserStatus,
} from "@/types/adminDonor";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminDonorListResult = {
  donors: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminDonorListItem.
 * @param row - Raw row from admin_list_donors RPC
 * @returns Mapped AdminDonorListItem
 */
function mapDonorRow(row: AdminDonorListRow): AdminDonorListItem {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    walletAddress: row.wallet_address,
    primaryAuthMethod: row.primary_auth_method as "email" | "wallet",
    userStatus: row.user_status as DonorUserStatus,
    totalCryptoUsd: Number(row.total_crypto_usd),
    totalFiatUsd: Number(row.total_fiat_usd),
    donationCount: Number(row.donation_count),
    createdAt: row.created_at,
  };
}

/**
 * Fetches a paginated, filtered list of donors via the admin_list_donors RPC.
 * Requires the current user to have admin JWT claims.
 * @param filters - Optional filters for status, auth method, search, date range, and pagination
 * @returns Paginated donor list result
 */
export async function listDonors(
  filters: AdminDonorListFilters = {},
): Promise<AdminDonorListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const { data, error } = await supabase.rpc("admin_list_donors", {
    p_status: filters.status ?? null,
    p_auth_method: filters.authMethod ?? null,
    p_search: filters.search ?? null,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_min_donated: filters.minDonated ?? null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    Logger.error("Error fetching admin donor list", { error, filters });
    throw new Error(
      `admin_list_donors RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminDonorListRow[];

  if (rows.length === 0) {
    return { ...EMPTY_RESULT, page, limit };
  }

  const totalCount = rows[0].total_count;
  const donors = rows.map(mapDonorRow);

  return {
    donors,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Fetches full detail for a single donor via the admin_get_donor_detail RPC.
 * Requires admin JWT claims.
 * @param userId - The donor's auth user ID
 * @returns Full donor detail, or null on failure
 */
export async function getDonorDetail(
  userId: string,
): Promise<AdminDonorDetail | null> {
  const { data, error } = await supabase.rpc("admin_get_donor_detail", {
    p_user_id: userId,
  });

  if (error) {
    Logger.error("Error fetching donor detail", { error, userId });
    throw new Error(
      `admin_get_donor_detail RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  return data as AdminDonorDetail;
}

/**
 * Updates a donor's user_status via admin_update_user_status RPC.
 * Atomically inserts into user_status_audit and admin_audit_log.
 * Requires admin JWT claims.
 * @param input - userId, newStatus, and optional reason
 * @returns The user_status_audit record UUID, or null on failure
 */
export async function updateDonorStatus(
  input: AdminDonorStatusUpdateInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("admin_update_user_status", {
      p_user_id: input.userId,
      p_new_status: input.newStatus,
      p_reason: input.reason ?? null,
    });

    if (error) {
      Logger.error("Error updating donor status", { error, input });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.error("Donor status update failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return null;
  }
}
