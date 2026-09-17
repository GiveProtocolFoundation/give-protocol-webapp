import { supabase } from "@/lib/supabase";
import type {
  CharityOrganization,
  CharitySearchParams,
  CharitySearchResult,
} from "@/types/charityOrganization";
import { Logger } from "@/utils/logger";

const EMPTY_RESULT: CharitySearchResult = { organizations: [], hasMore: false };

const FEATURED_LIMIT = 12;

/** Minimal charity_profiles row used for claim-status lookups. */
interface ClaimedStatusRow {
  ein: string;
  claimed_by: string | null;
}

/**
 * Normalizes an EIN for claim-status matching. Profile rows can store either
 * the hyphenated registry format or the stripped 9-digit form, mirroring the
 * dual-format lookup in get_or_create_charity_profile.
 * @param ein - EIN in any format
 * @returns Hyphen-free EIN for set membership comparisons
 */
function normalizeEin(ein: string): string {
  return ein.trim().replace(/-/g, "");
}

/**
 * Builds the charity_profiles.ein lookup keys for an EIN. Profile rows can
 * store either the hyphenated registry format or the stripped 9-digit form,
 * mirroring the dual-format lookup in get_or_create_charity_profile.
 * @param ein - EIN in any format
 * @returns Candidate keys to match against charity_profiles.ein
 */
function claimLookupKeys(ein: string): string[] {
  const trimmed = ein.trim();
  const stripped = trimmed.replace(/-/g, "");
  return trimmed === stripped ? [trimmed] : [trimmed, stripped];
}

/**
 * Fetches the claimed EINs among the given identifiers from charity_profiles.
 * Claim status is an enrichment, not a search dependency — on error it returns
 * an empty set so callers render the unclaimed treatment (GIV-1012).
 * @param eins - EINs to look up, in any format
 * @returns Set of normalized (hyphen-free) EINs whose profile has a claimant
 */
export async function fetchClaimedEins(
  eins: string[],
): Promise<Set<string>> {
  const claimed = new Set<string>();
  const lookupKeys = Array.from(
    new Set(eins.filter(Boolean).flatMap((ein) => claimLookupKeys(ein))),
  );
  if (lookupKeys.length === 0) return claimed;

  try {
    const { data, error } = await supabase
      .from("charity_profiles")
      .select("ein, claimed_by")
      .in("ein", lookupKeys);

    if (error) {
      Logger.warn("Claim status fetch failed", { error });
      return claimed;
    }

    for (const row of (data ?? []) as ClaimedStatusRow[]) {
      if (row.claimed_by !== null) {
        claimed.add(normalizeEin(row.ein));
      }
    }
  } catch (error) {
    Logger.warn("Claim status fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return claimed;
}

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

  // Enrich with claim status (GIV-1012): charity-profile donation is gated on
  // a claimed profile, so discovery cards need to know which orgs can receive
  // donations. Lookup failures degrade to unclaimed — the honest default.
  const claimedEins = await fetchClaimedEins(
    organizations.map((org) => org.ein),
  );
  const enriched = organizations.map((org) => ({
    ...org,
    is_claimed: claimedEins.has(normalizeEin(org.ein)),
  }));

  return { organizations: enriched, hasMore };
}
