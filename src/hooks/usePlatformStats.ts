import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import {
  SUPPORTED_EVM_CHAIN_IDS,
  SUPPORTED_SOLANA_CLUSTERS,
} from "@/config/chains";

/** Aggregate platform counts shown in the /browse hero. */
export interface PlatformStats {
  /** Mainnet networks the app is configured for (EVM chains + Solana). */
  networks: number;
  /** Charity profiles that have completed Give Protocol verification. */
  verifiedOrganizations: number;
  /** Distinct NTEE major categories among verified charities. */
  charitableSectors: number;
  /** Total approved volunteer hours. */
  verifiedVolunteerHours: number;
}

/** Row shape returned by the get_public_platform_stats RPC. */
interface PlatformStatsRow {
  verified_organizations: number | string | null;
  charitable_sectors: number | string | null;
  verified_volunteer_hours: number | string | null;
}

/** Networks come from app configuration, so they never need a network call. */
export const CONFIGURED_NETWORK_COUNT =
  SUPPORTED_EVM_CHAIN_IDS.length + SUPPORTED_SOLANA_CLUSTERS.length;

/**
 * Coerces a numeric value from Postgres (BIGINT/NUMERIC arrive as strings) to a
 * finite, non-negative number.
 * @param value - Raw RPC value
 * @returns A finite number, or 0 when the value is missing or invalid
 */
function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Fetches aggregate platform counts via the get_public_platform_stats RPC.
 * @returns Parsed stats
 * @throws When the RPC errors or returns no row
 */
async function loadPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc("get_public_platform_stats");

  if (error) {
    Logger.error("Error fetching platform stats", { error });
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | PlatformStatsRow
    | null
    | undefined;
  if (!row) {
    throw new Error("Platform stats RPC returned no data");
  }

  return {
    networks: CONFIGURED_NETWORK_COUNT,
    verifiedOrganizations: toCount(row.verified_organizations),
    charitableSectors: toCount(row.charitable_sectors),
    verifiedVolunteerHours: toCount(row.verified_volunteer_hours),
  };
}

interface UsePlatformStatsReturn {
  /** Null until loaded, or when the fetch failed. */
  stats: PlatformStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook that loads the real aggregate counts for the /browse hero. Callers should
 * render a neutral placeholder while `stats` is null rather than invent numbers.
 * @returns Stats with loading and error state
 */
export function usePlatformStats(): UsePlatformStatsReturn {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadPlatformStats()
      .then((data) => {
        if (!mountedRef.current) return;
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load platform stats");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { stats, loading, error };
}
