import { supabase } from "@/lib/supabase";
import type {
  AdminUpdateConfigInput,
  PlatformConfigAuditEntry,
  PlatformConfigAuditRow,
  PlatformConfigEntry,
  PlatformConfigKey,
  PlatformConfigRow,
  PlatformConfigValue,
} from "@/types/adminPlatformConfig";
import { Logger } from "@/utils/logger";

/**
 * Maps a raw database row (snake_case) to a camelCase PlatformConfigEntry.
 * @param row - Raw row from admin_get_config RPC
 * @returns Mapped PlatformConfigEntry
 */
function mapConfigRow(row: PlatformConfigRow): PlatformConfigEntry {
  return {
    key: row.key as PlatformConfigKey,
    value: row.value,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a raw audit row (snake_case) to a camelCase PlatformConfigAuditEntry.
 * @param row - Raw row from admin_get_config_audit RPC
 * @returns Mapped PlatformConfigAuditEntry
 */
function mapAuditRow(row: PlatformConfigAuditRow): PlatformConfigAuditEntry {
  return {
    id: row.id,
    configKey: row.config_key as PlatformConfigKey,
    oldValue: row.old_value,
    newValue: row.new_value,
    adminUserId: row.admin_user_id,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all platform configuration entries via admin_get_config RPC.
 * Requires the current user to have admin JWT claims.
 * @returns Array of platform config entries, or empty array on failure
 */
export async function getConfig(): Promise<PlatformConfigEntry[]> {
  const { data, error } = await supabase.rpc("admin_get_config");

  if (error) {
    Logger.error("Error fetching platform config", { error });
    throw new Error(
      `admin_get_config RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as PlatformConfigRow[];
  return rows.map(mapConfigRow);
}

/**
 * Updates a single platform configuration entry via admin_update_config RPC.
 * Atomically inserts an audit row into platform_config_audit and admin_audit_log.
 * Requires admin JWT claims.
 * @param input - key and new value to set
 * @returns true on success, false on failure
 */
export async function updateConfig(
  input: AdminUpdateConfigInput,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_update_config", {
      p_key: input.key,
      p_value: input.value,
    });

    if (error) {
      Logger.error("Error updating platform config", { error, input });
      return false;
    }

    return true;
  } catch (error) {
    Logger.error("Platform config update failed", {
      error: error instanceof Error ? error.message : String(error),
      input,
    });
    return false;
  }
}

/**
 * Fetches the audit history for platform configuration changes via admin_get_config_audit RPC.
 * Returns the most recent changes first. Requires admin JWT claims.
 * @param limit - Maximum number of audit rows to return (default 50)
 * @returns Array of audit entries, or empty array on failure
 */
export async function getConfigAudit(
  limit = 50,
): Promise<PlatformConfigAuditEntry[]> {
  const { data, error } = await supabase.rpc("admin_get_config_audit", {
    p_limit: limit,
  });

  if (error) {
    Logger.error("Error fetching platform config audit", { error });
    throw new Error(
      `admin_get_config_audit RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as PlatformConfigAuditRow[];
  return rows.map(mapAuditRow);
}

/**
 * Returns a human-readable label for a platform config key.
 * @param key - The platform config key
 * @returns Display label string
 */
export function configKeyLabel(key: PlatformConfigKey): string {
  const labels: Record<PlatformConfigKey, string> = {
    min_donation_usd: "Minimum Donation (USD)",
    max_causes_per_charity: "Max Active Causes per Charity",
    max_opportunities_per_charity: "Max Volunteer Opportunities per Charity",
    validation_window_days: "Validation Window (Days)",
    supported_tokens: "Supported Tokens (JSON)",
    supported_networks: "Supported Networks (JSON)",
  };
  return labels[key] ?? key;
}

/**
 * Returns the input type appropriate for a config value when displayed in a form.
 * @param value - The current config value
 * @returns "number" | "json"
 */
export function configValueInputType(
  value: PlatformConfigValue,
): "number" | "json" {
  if (typeof value === "number") return "number";
  return "json";
}
