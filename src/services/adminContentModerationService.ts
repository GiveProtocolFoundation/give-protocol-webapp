import { supabase } from "@/lib/supabase";
import type {
  AdminCauseListItem,
  AdminCauseListResult,
  AdminCauseListRow,
  AdminContentModerationFilters,
  AdminModerateContentInput,
  AdminCascadeCharityModerationInput,
  AdminOpportunityListItem,
  AdminOpportunityListResult,
  AdminOpportunityListRow,
  ModerationStatus,
} from "@/types/adminContentModeration";
import { Logger } from "@/utils/logger";

const EMPTY_OPPORTUNITY_RESULT: AdminOpportunityListResult = {
  opportunities: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

const EMPTY_CAUSE_RESULT: AdminCauseListResult = {
  causes: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Maps a raw database row (snake_case) to a camelCase AdminOpportunityListItem.
 * @param row - Raw row from admin_list_opportunities RPC
 * @returns Mapped AdminOpportunityListItem
 */
function mapOpportunityRow(
  row: AdminOpportunityListRow,
): AdminOpportunityListItem {
  return {
    id: row.id,
    charityId: row.charity_id,
    charityName: row.charity_name,
    title: row.title,
    status: row.status,
    moderationStatus: row.moderation_status as ModerationStatus,
    moderationReason: row.moderation_reason,
    moderatedAt: row.moderated_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a raw database row (snake_case) to a camelCase AdminCauseListItem.
 * @param row - Raw row from admin_list_causes RPC
 * @returns Mapped AdminCauseListItem
 */
function mapCauseRow(row: AdminCauseListRow): AdminCauseListItem {
  return {
    id: row.id,
    charityId: row.charity_id,
    charityName: row.charity_name,
    title: row.title,
    status: row.status,
    moderationStatus: row.moderation_status as ModerationStatus,
    moderationReason: row.moderation_reason,
    moderatedAt: row.moderated_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches a paginated, filtered list of volunteer opportunities via admin_list_opportunities RPC.
 * Requires the current user to have admin JWT claims.
 * @param filters - Optional filters for moderation status, search, charity, and pagination
 * @returns Paginated opportunity list result
 */
export async function listOpportunities(
  filters: AdminContentModerationFilters = {},
): Promise<AdminOpportunityListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const { data, error } = await supabase.rpc("admin_list_opportunities", {
    p_moderation_status: filters.moderationStatus ?? null,
    p_search: filters.search ?? null,
    p_charity_id: filters.charityId ?? null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    Logger.error("Error fetching admin opportunity list", { error, filters });
    throw new Error(
      `admin_list_opportunities RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminOpportunityListRow[];

  if (rows.length === 0) {
    return { ...EMPTY_OPPORTUNITY_RESULT, page, limit };
  }

  const totalCount = rows[0].total_count;
  const opportunities = rows.map(mapOpportunityRow);

  return {
    opportunities,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Fetches a paginated, filtered list of causes via admin_list_causes RPC.
 * Requires the current user to have admin JWT claims.
 * @param filters - Optional filters for moderation status, search, charity, and pagination
 * @returns Paginated cause list result
 */
export async function listCauses(
  filters: AdminContentModerationFilters = {},
): Promise<AdminCauseListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const { data, error } = await supabase.rpc("admin_list_causes", {
    p_moderation_status: filters.moderationStatus ?? null,
    p_search: filters.search ?? null,
    p_charity_id: filters.charityId ?? null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    Logger.error("Error fetching admin cause list", { error, filters });
    throw new Error(
      `admin_list_causes RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminCauseListRow[];

  if (rows.length === 0) {
    return { ...EMPTY_CAUSE_RESULT, page, limit };
  }

  const totalCount = rows[0].total_count;
  const causes = rows.map(mapCauseRow);

  return {
    causes,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Moderates a single opportunity or cause via admin_moderate_content RPC.
 * Actions are logged to the admin audit trail.
 * Requires admin JWT claims.
 * @param input - contentType, contentId, action, and optional reason
 * @returns The audit log entry UUID, or null on failure
 */
export async function moderateContent(
  input: AdminModerateContentInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("admin_moderate_content", {
      p_content_type: input.contentType,
      p_content_id: input.contentId,
      p_action: input.action,
      p_reason: input.reason ?? null,
    });

    if (error) {
      Logger.error("Error moderating content", { error, input });
      return null;
    }

    return data as string;
  } catch (error) {
    Logger.error("Content moderation action failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return null;
  }
}

/**
 * Cascades a moderation action across all opportunities and causes belonging to a charity.
 * Calls admin_cascade_charity_moderation RPC.
 * Requires admin JWT claims.
 * @param input - charityId, action, and optional reason
 * @returns The number of affected rows, or null on failure
 */
export async function cascadeCharityModeration(
  input: AdminCascadeCharityModerationInput,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_cascade_charity_moderation",
      {
        p_charity_id: input.charityId,
        p_action: input.action,
        p_reason: input.reason ?? null,
      },
    );

    if (error) {
      Logger.error("Error cascading charity moderation", { error, input });
      return null;
    }

    return data as number;
  } catch (error) {
    Logger.error("Cascade charity moderation failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return null;
  }
}
