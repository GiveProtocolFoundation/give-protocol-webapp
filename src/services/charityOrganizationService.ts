import { supabase } from "@/lib/supabase";
import type {
  CharityOrganization,
  CharitySearchParams,
  CharitySearchResult,
} from "@/types/charityOrganization";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: CharitySearchResult = { organizations: [], hasMore: false };

const FEATURED_LIMIT = 12;

/**
 * Fetches featured platform charities (is_on_platform = true) for display on the dashboard.
 * @returns Array of platform charity organizations
 */
export async function getFeaturedCharities(): Promise<CharityOrganization[]> {
  try {
    const { data, error } = await supabase
      .from("charity_organizations")
      .select(
        "id,ein,name,city,state,zip,ntee_cd,deductibility,is_on_platform,platform_charity_id,country,rank,registry_source,data_source,data_vintage,last_synced_at",
      )
      .eq("is_on_platform", true)
      .limit(FEATURED_LIMIT);

    if (error) {
      Logger.error("Error fetching featured charities", { error });
      return [];
    }

    return (data || []) as CharityOrganization[];
  } catch (error) {
    Logger.error("Featured charities fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Searches the charity organizations database via the search_charity_organizations RPC.
 * Requires at least a 2-character query OR an active state/country filter.
 * @param params - Search parameters
 * @returns Paginated search results
 */
export async function searchCharityOrganizations(
  params: CharitySearchParams,
): Promise<CharitySearchResult> {
  const query = params.search_query?.trim() || "";
  const hasQuery = query.length >= 2;
  const hasStateFilter = Boolean(params.filter_state);
  const hasCountryFilter = Boolean(params.filter_country);

  if (!hasQuery && !hasStateFilter && !hasCountryFilter) {
    return EMPTY_RESULT;
  }

  const fetchLimit = params.result_limit + 1;

  const { data, error } = await supabase.rpc("search_charity_organizations", {
    search_query: hasQuery ? query : null,
    filter_state: params.filter_state || null,
    filter_ntee: params.filter_ntee || null,
    filter_country: params.filter_country || null,
    result_limit: fetchLimit,
    result_offset: params.result_offset,
  });

  if (error) {
    Logger.error("Error searching charity organizations", { error, params });
    throw new Error(error.message ?? "Search RPC failed");
  }

  const rows = (data || []) as CharityOrganization[];
  const hasMore = rows.length > params.result_limit;
  const organizations = hasMore ? rows.slice(0, params.result_limit) : rows;

  return { organizations, hasMore };
}
