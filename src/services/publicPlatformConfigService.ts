import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

export interface PublicPlatformConfig {
  supportedNetworks: number[];
  supportedTokens: string[];
}

interface RawPublicConfig {
  supported_networks: unknown;
  supported_tokens: unknown;
}

/**
 * Parses the supported_networks field from the DB.
 * Handles both plain number[] and {chainId, name}[] shapes produced by
 * the admin TokenNetworkSettings serialiser.
 * @param value - Raw value from get_public_platform_config RPC
 * @returns Array of numeric chain IDs
 */
function parseNetworks(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "number") return item;
    if (item !== null && typeof item === "object" && "chainId" in item) {
      const id = Number((item as { chainId: unknown }).chainId);
      return Number.isNaN(id) ? [] : id;
    }
    return [];
  });
}

/**
 * Parses the supported_tokens field from the DB.
 * @param value - Raw value from get_public_platform_config RPC
 * @returns Array of token symbol strings
 */
function parseTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string");
}

/**
 * Fetches the publicly-readable subset of platform_config
 * (supported_networks and supported_tokens only). The underlying RPC is
 * SECURITY DEFINER and accessible by anon + authenticated roles — donors do
 * not need admin claims. Throws on RPC failure so callers can fall back to
 * the full hard-coded chain/token lists.
 * @returns Parsed PublicPlatformConfig with supportedNetworks and supportedTokens
 * @throws Error if the RPC call fails or returns null
 */
export async function getPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  const { data, error } = await supabase.rpc("get_public_platform_config");

  if (error) {
    Logger.error("getPublicPlatformConfig failed", { error });
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("get_public_platform_config returned null");
  }

  const raw = data as RawPublicConfig;
  return {
    supportedNetworks: parseNetworks(raw.supported_networks),
    supportedTokens: parseTokens(raw.supported_tokens),
  };
}
