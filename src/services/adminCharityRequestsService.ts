import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import type {
  AdminCharityRequestItem,
  AdminCharityRequestRow,
  AdminCharityRequestsResult,
} from "@/types/adminCharityRequests";

const EMPTY_RESULT: AdminCharityRequestsResult = {
  requests: [],
  totalCount: 0,
};

/**
 * Maps a raw database row to a typed charity request item.
 * @param row - Raw row from the admin_list_charity_requests RPC
 * @returns Mapped charity request item with normalized fields
 */
function mapRow(row: AdminCharityRequestRow): AdminCharityRequestItem {
  return {
    ein: row.ein,
    requestCount: Number(row.request_count),
    firstRequestedAt: row.first_requested_at,
    latestRequestedAt: row.latest_requested_at,
    latestRequesterEmail: row.latest_requester_email,
  };
}

/**
 * Fetches charity requests aggregated by EIN via the
 * admin_list_charity_requests RPC. Requires admin JWT claims.
 * @param limit - Max rows to return (1-500, default 100)
 * @param offset - Pagination offset (default 0)
 * @returns Aggregated charity request list
 */
export async function listCharityRequests(
  limit = 100,
  offset = 0,
): Promise<AdminCharityRequestsResult> {
  const { data, error } = await supabase.rpc("admin_list_charity_requests", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    Logger.error("Error fetching admin charity requests", { error });
    throw new Error(
      `admin_list_charity_requests RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminCharityRequestRow[];
  if (rows.length === 0) {
    return EMPTY_RESULT;
  }

  return {
    requests: rows.map(mapRow),
    totalCount: Number(rows[0].total_count),
  };
}
