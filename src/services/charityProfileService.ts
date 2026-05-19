import { supabase } from "@/lib/supabase";
import type { CharityProfile } from "@/types/charityProfile";
import { Logger } from "@/utils/logger";

interface ClaimCharityParams {
  ein: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string;
}

/**
 * Claims an unclaimed charity profile by EIN via the claim_charity_profile RPC.
 * Sets the profile status to 'claimed-pending' and records the authorized signer details.
 * @param params - The claim parameters including EIN and signer contact info
 * @returns The updated charity profile or null on error
 */
export async function claimCharityProfile(
  params: ClaimCharityParams,
): Promise<CharityProfile | null> {
  try {
    const { data, error } = await supabase.rpc("claim_charity_profile", {
      p_ein: params.ein,
      p_signer_name: params.signerName,
      p_signer_email: params.signerEmail,
      p_signer_phone: params.signerPhone,
    });

    if (error) {
      Logger.error("Error claiming charity profile", {
        error,
        ein: params.ein,
      });
      return null;
    }

    const rows = (data || []) as CharityProfile[];
    return rows[0] || null;
  } catch (error) {
    Logger.error("Charity profile claim failed", {
      error: error instanceof Error ? error.message : String(error),
      ein: params.ein,
    });
    return null;
  }
}

/**
 * Fetches the wallet address stored on a charity profile for a given user.
 * Queries charity_profiles by claimed_by (the user who claimed the profile).
 * @param userId - The authenticated user's ID
 * @returns The wallet address string, or null if not set or not found
 */
export async function getCharityWalletAddress(
  userId: string,
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("charity_profiles")
      .select("wallet_address")
      .eq("claimed_by", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    const row = data as { wallet_address: string | null };
    return row.wallet_address;
  } catch (err) {
    Logger.error("Charity wallet address fetch failed", {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
    return null;
  }
}

/**
 * Fetches or creates a charity profile by EIN via the get_or_create_charity_profile RPC.
 * Returns null if the EIN is empty, not found in IRS records, or on error.
 * @param ein - The Employer Identification Number to look up
 * @returns The charity profile or null
 */
export async function getCharityProfileByEin(
  ein: string,
): Promise<CharityProfile | null> {
  const trimmed = ein?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc(
      "get_or_create_charity_profile",
      {
        lookup_ein: trimmed,
      },
    );

    if (error) {
      Logger.error("Error fetching charity profile", { error, ein: trimmed });
      return null;
    }

    const rows = (data || []) as CharityProfile[];
    return rows[0] || null;
  } catch (error) {
    Logger.error("Charity profile fetch failed", {
      error: error instanceof Error ? error.message : String(error),
      ein: trimmed,
    });
    return null;
  }
}

/**
 * Public-facing asset record for the claimed charity profile of a given user.
 * `bannerImageUrl` is null when the column has not yet been deployed in the
 * underlying database, allowing callers to render without error.
 */
export interface CharityProfileAssets {
  id: string;
  name: string;
  ein: string;
  logoUrl: string | null;
  bannerImageUrl: string | null;
  claimedByUserId: string | null;
}

interface AssetRow {
  id: string;
  name: string;
  ein: string;
  logo_url: string | null;
  banner_image_url?: string | null;
  claimed_by: string | null;
}

/** Returns true when a PostgREST error indicates an unknown column. */
function isUndefinedColumnError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const errorObj = err as { code?: string; message?: string };
  if (errorObj.code === "42703") return true;
  return Boolean(errorObj.message?.includes("banner_image_url"));
}

/** Maps a charity_profiles DB row into the public CharityProfileAssets shape. */
function toAssets(row: AssetRow): CharityProfileAssets {
  return {
    id: row.id,
    name: row.name,
    ein: row.ein,
    logoUrl: row.logo_url ?? null,
    bannerImageUrl: row.banner_image_url ?? null,
    claimedByUserId: row.claimed_by ?? null,
  };
}

/**
 * Runs a tolerant select on charity_profiles that handles missing
 * `banner_image_url` column by falling back to a narrower select.
 * @param filterColumn - Column to filter by ('claimed_by' or 'ein')
 * @param filterValue - Value to match
 * @returns The asset record, or null when no row exists or on error
 */
async function fetchAssetsByColumn(
  filterColumn: "claimed_by" | "ein" | "authorized_signer_email" | "name",
  filterValue: string,
): Promise<CharityProfileAssets | null> {
  const full = await supabase
    .from("charity_profiles")
    .select("id, name, ein, logo_url, banner_image_url, claimed_by")
    .eq(filterColumn, filterValue)
    .maybeSingle();

  if (!full.error) {
    return full.data ? toAssets(full.data as AssetRow) : null;
  }

  if (!isUndefinedColumnError(full.error)) {
    Logger.error("Charity profile assets fetch failed", {
      error: full.error,
      filterColumn,
      filterValue,
    });
    return null;
  }

  Logger.warn(
    "charity_profiles.banner_image_url missing; falling back to logo-only select",
    { filterColumn, filterValue },
  );

  const fallback = await supabase
    .from("charity_profiles")
    .select("id, name, ein, logo_url, claimed_by")
    .eq(filterColumn, filterValue)
    .maybeSingle();

  if (fallback.error) {
    Logger.error("Charity profile assets fallback fetch failed", {
      error: fallback.error,
      filterColumn,
      filterValue,
    });
    return null;
  }

  return fallback.data ? toAssets(fallback.data as AssetRow) : null;
}

/**
 * Fetches the logo, banner and identity metadata for the charity profile claimed
 * by the given user. Tolerates a missing `banner_image_url` column in production
 * (when the column-add migration has not been deployed) by retrying the query
 * with a narrower column list and returning `bannerImageUrl: null`.
 * @param userId - The authenticated user's id, matched against claimed_by
 * @returns The asset record, or null when no charity_profiles row exists
 */
export async function fetchCharityProfileAssets(
  userId: string,
): Promise<CharityProfileAssets | null> {
  if (!userId) return null;

  try {
    return await fetchAssetsByColumn("claimed_by", userId);
  } catch (err) {
    Logger.error("Charity profile assets fetch threw", {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
    return null;
  }
}

/**
 * Fetches charity profile assets by EIN. Used as a fallback when the
 * `claimed_by` lookup returns nothing (e.g. claim RPC failed).
 * @param ein - The charity EIN to look up
 * @returns The asset record, or null when no row exists
 */
export async function fetchCharityProfileAssetsByEin(
  ein: string,
): Promise<CharityProfileAssets | null> {
  const trimmed = ein?.trim();
  if (!trimmed) return null;

  try {
    return await fetchAssetsByColumn("ein", trimmed);
  } catch (err) {
    Logger.error("Charity profile assets by EIN fetch threw", {
      error: err instanceof Error ? err.message : String(err),
      ein: trimmed,
    });
    return null;
  }
}

/**
 * Fetches charity profile assets by authorized signer email. Used as a
 * last-resort fallback when both claimed_by and EIN lookups fail (e.g.
 * claimed_by is NULL and EIN is not in user_metadata).
 * @param email - The authorized signer email to match
 * @returns The asset record, or null when no row exists
 */
export async function fetchCharityProfileBySignerEmail(
  email: string,
): Promise<CharityProfileAssets | null> {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    return await fetchAssetsByColumn("authorized_signer_email", trimmed);
  } catch (err) {
    Logger.error("Charity profile assets by signer email fetch threw", {
      error: err instanceof Error ? err.message : String(err),
      email: trimmed,
    });
    return null;
  }
}

/**
 * Fetches charity profile assets by organization name. Used as a final
 * fallback when claimed_by, EIN, and signer email all fail.
 * @param name - The organization name to match
 * @returns The asset record, or null when no row exists
 */
export async function fetchCharityProfileByName(
  name: string,
): Promise<CharityProfileAssets | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  try {
    return await fetchAssetsByColumn("name", trimmed);
  } catch (err) {
    Logger.error("Charity profile assets by name fetch threw", {
      error: err instanceof Error ? err.message : String(err),
      name: trimmed,
    });
    return null;
  }
}

/**
 * Self-repair: sets claimed_by and authorized_signer_email on a charity
 * profile that was left unlinked (e.g. because the claim RPC failed during
 * onboarding). Only updates rows where claimed_by is currently NULL.
 * @param ein - The charity EIN identifying the row to repair
 * @param userId - The auth user ID to set as claimed_by
 * @param email - The user email to set as authorized_signer_email
 */
export async function repairClaimedBy(
  ein: string,
  userId: string,
  email?: string | null,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("repair_claimed_by", {
      p_ein: ein,
      p_user: userId,
      p_email: email ?? null,
    });

    if (error) {
      Logger.warn("Self-repair claimed_by failed", { error, ein, userId });
    } else {
      Logger.info("Self-repair: linked charity profile", { ein, userId });
    }
  } catch (err) {
    Logger.warn("Self-repair claimed_by threw", {
      error: err instanceof Error ? err.message : String(err),
      ein,
      userId,
    });
  }
}
