import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import type { CharityVerificationStatus } from "@/services/charityVerificationService";

interface OnboardingMeta {
  dismissed?: boolean;
  completedItems?: string[];
}

export const META_KEY = "onboarding_checklist";

/** Persisted onboarding checklist state. */
export interface OnboardingState {
  dismissed: boolean;
  completedItems: string[];
}

/**
 * Loads the persisted onboarding checklist state from `profiles.meta`.
 *
 * @param profileId - The profile row ID from the `profiles` table
 * @returns The saved state (empty defaults if none saved), or null on failure
 */
export async function loadOnboardingState(
  profileId: string,
): Promise<OnboardingState | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("meta")
      .eq("id", profileId)
      .single();

    if (error) {
      Logger.warn("Could not load onboarding state", { error, profileId });
      return null;
    }

    const meta = (data?.meta as Record<string, unknown>) || {};
    const checklist = (meta[META_KEY] as OnboardingMeta) || {};
    return {
      dismissed: Boolean(checklist.dismissed),
      completedItems: Array.isArray(checklist.completedItems)
        ? checklist.completedItems
        : [],
    };
  } catch (err) {
    Logger.warn("Exception loading onboarding state", {
      error: err,
      profileId,
    });
    return null;
  }
}

/** Statuses that restrict the charity from normal dashboard actions. */
const RESTRICTED_STATUSES: CharityVerificationStatus[] = [
  "pending",
  "rejected",
  "suspended",
];

/**
 * Whether a verification status blocks onboarding and creation actions.
 *
 * @param status - The charity's verification status, if known
 * @returns True for pending, rejected, or suspended charities
 */
export function isRestrictedVerificationStatus(
  status?: CharityVerificationStatus | null,
): boolean {
  return status !== null && status !== undefined
    ? RESTRICTED_STATUSES.includes(status)
    : false;
}
