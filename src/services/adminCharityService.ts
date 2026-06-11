import { supabase } from "@/lib/supabase";
import type {
  AdminCharityListFilters,
  AdminCharityListItem,
  AdminCharityListResult,
  AdminCharityListRow,
  AdminCharityStatusUpdateInput,
  AdminCharityVerificationStatus,
} from "@/types/adminCharity";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: AdminCharityListResult = {
  charities: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminCharityListItem.
 * @param row - Raw row from admin_list_charities RPC
 * @returns Mapped AdminCharityListItem
 */
function mapCharityRow(row: AdminCharityListRow): AdminCharityListItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    logoUrl: row.logo_url,
    mission: row.mission,
    verificationId: row.verification_id,
    verificationStatus:
      row.verification_status as AdminCharityVerificationStatus,
    reviewNotes: row.review_notes,
    reviewedAt: row.reviewed_at,
    walletAddress: row.wallet_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ein: row.ein ?? null,
    signerName: row.signer_name ?? null,
    signerEmail: row.signer_email ?? null,
    signerPhone: row.signer_phone ?? null,
    claimedAt: row.claimed_at ?? null,
    charityProfileStatus: row.charity_profile_status ?? null,
  };
}

/**
 * Fetches a paginated, filtered list of charities via the admin_list_charities RPC.
 * Requires the current user to have admin JWT claims.
 * @param filters - Optional filters for status, category, search, and pagination
 * @returns Paginated charity list result
 */
export async function listCharities(
  filters: AdminCharityListFilters = {},
): Promise<AdminCharityListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  try {
    const { data, error } = await supabase.rpc("admin_list_charities", {
      p_status: filters.status ?? null,
      p_category: filters.category ?? null,
      p_search: filters.search ?? null,
      p_page: page,
      p_limit: limit,
    });

    if (error) {
      Logger.error("Error fetching admin charity list", { error, filters });
      return EMPTY_RESULT;
    }

    const rows = (data || []) as AdminCharityListRow[];

    if (rows.length === 0) {
      return { ...EMPTY_RESULT, page, limit };
    }

    const totalCount = rows[0].total_count;
    const charities = rows.map(mapCharityRow);

    return {
      charities,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    Logger.error("Admin charity list query failed", {
      error: error instanceof Error ? error.message : String(error),
      filters,
    });
    return EMPTY_RESULT;
  }
}

/**
 * Updates a charity's verification status via admin_update_charity_status RPC.
 * Atomically inserts into charity_status_audit and admin_audit_log.
 * Requires admin JWT claims.
 * @param input - charityId, newStatus, and optional reason
 * @returns The verification record UUID, or null on failure
 */
export async function updateCharityStatus(
  input: AdminCharityStatusUpdateInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("admin_update_charity_status", {
      p_charity_id: input.charityId,
      p_new_status: input.newStatus,
      p_reason: input.reason ?? null,
    });

    if (error) {
      Logger.error("Error updating charity status", { error, input });
      return null;
    }

    // Fire-and-forget: notify the charity by email. Failure must not block the status update.
    notifyCharityStatusChange(input).catch(() => {
      // Errors are already logged inside notifyCharityStatusChange
    });

    return data as string;
  } catch (error) {
    Logger.error("Charity status update failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return null;
  }
}

/**
 * Invokes the charity-status-email edge function to notify a charity of their
 * new verification status. Called fire-and-forget after a successful status update.
 * Errors are logged but never propagated to the caller.
 * @param input - charityId, newStatus, and optional reason
 */
export async function notifyCharityStatusChange(
  input: AdminCharityStatusUpdateInput,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("charity-status-email", {
      body: {
        charityId: input.charityId,
        newStatus: input.newStatus,
        reason: input.reason ?? null,
      },
    });

    if (error) {
      Logger.error("Charity status email notification failed", {
        error,
        charityId: input.charityId,
      });
    }
  } catch (error) {
    Logger.error("Charity status email invocation threw", {
      error: error instanceof Error ? error.message : String(error),
      charityId: input.charityId,
    });
  }
}
