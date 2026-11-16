import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { REGION_IDS, getCountriesInRegion, isRegionId } from "@/utils/regions";

/** Privacy field that decides whether a giver appears in a given leaderboard. */
export type GiverVisibilityField = "showDonations" | "showVolunteerHours";

/** Region filter value: "all", a region id, or "unspecified". */
export type RegionFilterValue = string;

/**
 * Reads the country the signed-in user chose to share.
 * @param userId - The auth user id
 * @returns The ISO 3166-1 alpha-2 country, or null when none is set
 * @throws When the profile cannot be read
 */
export async function getOwnCountry(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("country")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    Logger.warn("Error fetching giver country", { error });
    throw new Error("Failed to load country");
  }

  return (data as { country: string | null } | null)?.country ?? null;
}

/**
 * Saves, or clears, the country the signed-in user chose to share.
 * @param userId - The auth user id
 * @param country - ISO 3166-1 alpha-2 code, or null to clear it
 * @throws When the update fails
 */
export async function setOwnCountry(
  userId: string,
  country: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ country })
    .eq("user_id", userId);

  if (error) {
    Logger.warn("Error saving giver country", { error });
    throw new Error("Failed to save country");
  }
}

/**
 * Narrows a list of givers to those in a region, without exposing any country.
 * Givers who hide the given field from public view are never returned.
 * @param ids - Giver ids (auth user ids or profile ids)
 * @param field - The privacy field that governs this leaderboard
 * @param region - "all", a region id, or "unspecified"
 * @returns The ids to keep, or null when the region does not narrow the list
 * @throws When the lookup fails, so the caller never shows an unfiltered list
 */
export async function filterGiversByRegion(
  ids: string[],
  field: GiverVisibilityField,
  region?: RegionFilterValue,
): Promise<Set<string> | null> {
  const isUnspecified = region === "unspecified";
  if (region === undefined || (!isUnspecified && !isRegionId(region))) {
    return null;
  }
  if (ids.length === 0) {
    return new Set();
  }

  const countries = isUnspecified
    ? REGION_IDS.flatMap((id) => getCountriesInRegion(id))
    : getCountriesInRegion(
        region as Parameters<typeof getCountriesInRegion>[0],
      );

  const { data, error } = await supabase.rpc("filter_givers_by_country", {
    p_ids: ids,
    p_field: field,
    p_countries: [...countries],
    p_invert: isUnspecified,
  });

  if (error) {
    Logger.warn("Error filtering givers by region", { error });
    throw new Error("Failed to filter by region");
  }

  return new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
}
