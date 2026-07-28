import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** A single admin user entry from admin_list_admin_users RPC */
export interface AdminUserEntry {
  userId: string;
  email: string | null;
  displayName: string | null;
  joinedAt: string | null;
}

/** Raw database row from admin_list_admin_users RPC (snake_case) */
interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
}

/**
 * Maps a raw database row to a camelCase AdminUserEntry.
 * @param row - Raw row from admin_list_admin_users RPC
 * @returns Mapped AdminUserEntry
 */
function mapAdminUserRow(row: AdminUserRow): AdminUserEntry {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    joinedAt: row.created_at,
  };
}

/**
 * Fetches the list of platform administrator accounts via admin_list_admin_users RPC.
 * Returns a read-only view of users with admin access to the platform.
 * Requires admin JWT claims.
 * @returns Array of admin user entries, or empty array on failure
 */
export async function listAdminUsers(): Promise<AdminUserEntry[]> {
  const { data, error } = await supabase.rpc("admin_list_admin_users");

  if (error) {
    Logger.error("Error fetching admin users", { error });
    throw new Error(
      `admin_list_admin_users RPC failed: ${error.message} (code: ${error.code})`,
    );
  }

  const rows = (data || []) as AdminUserRow[];
  return rows.map(mapAdminUserRow);
}
