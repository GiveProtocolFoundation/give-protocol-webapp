import { supabase } from "@/lib/supabase";
import type { CharityData, CauseData } from "./types";

interface ApiResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Fetches a single charity profile by its profile ID.
 * @param id - The charity profile UUID
 * @returns Charity data or null, with error on failure
 */
export async function getCharity(id: string): Promise<ApiResult<CharityData>> {
  const { data, error } = await supabase
    .from("charity_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return { data: data as CharityData | null, error };
}

/**
 * Fetches all causes associated with a charity profile.
 * @param id - The charity profile UUID
 * @returns Array of cause data, with error on failure
 */
export async function getCharityCauses(
  id: string,
): Promise<ApiResult<CauseData[]>> {
  const { data, error } = await supabase
    .from("causes")
    .select("*")
    .eq("charity_id", id);

  return { data: data as CauseData[] | null, error };
}
