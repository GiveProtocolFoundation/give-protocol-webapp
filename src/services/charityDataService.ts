import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/**
 * Extended charity organization record with all registry fields.
 * Queried directly from charity_organizations table for the profile page.
 */
export interface CharityRecord {
  ein: string;
  name: string;
  ico: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  group_exemption: string | null;
  subsection: string | null;
  affiliation: string | null;
  classification: string | null;
  ruling: string | null;
  deductibility: string | null;
  foundation: string | null;
  activity: string | null;
  organization: string | null;
  status: string | null;
  ntee_cd: string | null;
  sort_name: string | null;
  is_on_platform: boolean;
}

/**
 * Fetches a full charity organization record by EIN via the
 * get_charity_record_by_ein RPC (SECURITY DEFINER, bypasses RLS).
 * Handles both hyphenated (12-3456789) and plain (123456789) EIN formats.
 * @param ein - The EIN or local registration number (with or without hyphen)
 * @returns The charity record or null if not found
 */
export async function getCharityRecordByEin(
  ein: string,
): Promise<CharityRecord | null> {
  const trimmed = ein?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("get_charity_record_by_ein", {
      lookup_ein: trimmed,
    });

    if (error) {
      Logger.error("Error fetching charity record", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        ein: trimmed,
      });
      return null;
    }

    const rows = (data || []) as CharityRecord[];
    return rows[0] || null;
  } catch (error) {
    Logger.error("Charity record fetch failed", {
      error: error instanceof Error ? error.message : String(error),
      ein: trimmed,
    });
    return null;
  }
}

/**
 * Submits a removal request for an organization.
 * @param ein - The EIN of the organization
 * @param reason - The reason for requesting removal
 * @returns True if submitted successfully
 */
export async function submitRemovalRequest(
  ein: string,
  reason: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("removal_requests")
      .insert({ ein: ein.replace(/-/g, ""), reason });

    if (error) {
      Logger.error("Error submitting removal request", { error, ein });
      return false;
    }
    return true;
  } catch (error) {
    Logger.error("Removal request submission failed", {
      error: error instanceof Error ? error.message : String(error),
      ein,
    });
    return false;
  }
}

/**
 * Submits a request for an unclaimed charity organization.
 * Records the user's interest so the platform can prioritize outreach.
 * @param ein - The EIN of the organization
 * @param userId - The authenticated user's ID
 * @param contactEmail - Optional contact email for follow-up confirmation
 * @returns True if submitted successfully, false on error or duplicate
 */
export async function submitCharityRequest(
  ein: string,
  userId: string,
  contactEmail?: string,
): Promise<boolean> {
  try {
    const normalizedEin = ein.replace(/-/g, "");

    // Check for existing row first to prevent duplicate submissions
    const { data: existing, error: checkError } = await supabase
      .from("charity_requests")
      .select("id")
      .eq("ein", normalizedEin)
      .eq("user_id", userId)
      .limit(1);

    if (checkError) {
      Logger.error("Error checking existing charity request", {
        error: checkError,
        ein,
      });
      return false;
    }

    // Already requested — idempotent success
    if (Array.isArray(existing) && existing.length > 0) {
      return true;
    }

    const row: Record<string, string> = { ein: normalizedEin, user_id: userId };
    if (contactEmail) {
      row.contact_email = contactEmail;
    }

    const { error } = await supabase.from("charity_requests").insert(row);

    if (error) {
      Logger.error("Error submitting charity request", { error, ein });
      return false;
    }
    return true;
  } catch (error) {
    Logger.error("Charity request submission failed", {
      error: error instanceof Error ? error.message : String(error),
      ein,
    });
    return false;
  }
}

/**
 * Checks whether the current user has already requested a specific charity.
 * Used to show the "Requested" disabled state on return visits.
 * @param ein - The EIN of the organization
 * @param userId - The authenticated user's ID
 * @returns True if the user has already requested this charity
 */
export async function hasUserRequestedCharity(
  ein: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("charity_requests")
      .select("id")
      .eq("ein", ein.replace(/-/g, ""))
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      Logger.error("Error checking charity request", { error, ein });
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    Logger.error("Charity request check failed", {
      error: error instanceof Error ? error.message : String(error),
      ein,
    });
    return false;
  }
}
