import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

interface PrivacySettings {
  showDonations?: boolean;
  showVolunteerHours?: boolean;
  showSkillEndorsements?: boolean;
  publicProfile?: boolean;
}

interface UserPreferenceRow {
  user_id: string;
  privacy_settings: PrivacySettings | null;
}

/**
 * Fetches the set of user IDs who have opted out of public visibility
 * for a specific privacy field. Users are considered private if either
 * `publicProfile` is false OR the specific field is false.
 *
 * @param field - The privacy field to check (e.g., "showDonations", "showVolunteerHours")
 * @returns A Set of user IDs who should be excluded from public views
 */
export async function getPrivateUserIds(
  field: "showDonations" | "showVolunteerHours" | "showSkillEndorsements",
): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("user_id, privacy_settings");

    if (error) {
      Logger.warn("Error fetching user privacy preferences", { error });
      return new Set();
    }

    if (!data) return new Set();

    const privateIds = new Set<string>();

    (data as UserPreferenceRow[]).forEach((row) => {
      const settings = row.privacy_settings;
      if (!settings) return;

      if (settings.publicProfile === false || settings[field] === false) {
        privateIds.add(row.user_id);
      }
    });

    return privateIds;
  } catch (error) {
    Logger.warn("Failed to fetch privacy settings, defaulting to no exclusions", { error });
    return new Set();
  }
}

/**
 * Reads whether the given user has hidden their contributions from public
 * rankings. A user counts as hidden when both `showDonations` and
 * `showVolunteerHours` are explicitly false.
 *
 * @param userId - The auth user id (user_preferences.user_id)
 * @returns True when the user's contributions are hidden from rankings
 */
export async function getRankingsHidden(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("privacy_settings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    Logger.warn("Error fetching rankings visibility", { error });
    throw new Error("Failed to load privacy settings");
  }

  const settings = (data as { privacy_settings: PrivacySettings | null } | null)
    ?.privacy_settings;
  return (
    settings?.showDonations === false && settings?.showVolunteerHours === false
  );
}

/**
 * Hides or shows the given user's donations and volunteer hours in public
 * rankings, preserving any other privacy settings already saved.
 *
 * @param userId - The auth user id (user_preferences.user_id)
 * @param hidden - True to hide contributions, false to show them
 * @returns Resolves when the setting has been saved
 */
export async function setRankingsHidden(
  userId: string,
  hidden: boolean,
): Promise<void> {
  const { data, error: readError } = await supabase
    .from("user_preferences")
    .select("privacy_settings")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    Logger.warn("Error reading privacy settings before update", {
      error: readError,
    });
    throw new Error("Failed to save privacy settings");
  }

  const existing =
    (data as { privacy_settings: PrivacySettings | null } | null)
      ?.privacy_settings ?? {};

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      privacy_settings: {
        ...existing,
        showDonations: !hidden,
        showVolunteerHours: !hidden,
      },
    },
    { onConflict: "user_id" },
  );

  if (error) {
    Logger.warn("Error saving rankings visibility", { error });
    throw new Error("Failed to save privacy settings");
  }
}
