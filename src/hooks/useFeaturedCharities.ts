import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { resolveCharityImageUrl } from "@/utils/charityAssets";
import { getTranslatableNteeCategory } from "@/utils/nteeCategories";

/** Display shape for a featured charity in the carousel. */
export interface FeaturedCharity {
  profileId: string;
  name: string;
  description: string;
  category: string;
  /** i18n key for the category label (falls back to `category`). */
  categoryKey: string;
  imageUrl: string;
  location?: string;
  /** Registry the charity was verified against (e.g. "IRS_BMF"); null when unknown. */
  registrySource: string | null;
  /** True when an organization representative has claimed the profile. */
  isClaimed: boolean;
  /** ISO 3166-1 alpha-2 country code from the registry record; null when unknown. */
  country: string | null;
}

interface CharityProfileRow {
  ein: string;
  name: string;
  mission: string | null;
  location: string | null;
  logo_url: string | null;
  ntee_code: string | null;
  claimed_by: string | null;
}

/** Minimal charity_organizations row used for registry + country lookups. */
interface RegistrySourceRow {
  ein: string;
  registry_source: string | null;
  country: string | null;
}

const FEATURED_LIMIT = 12;

/** Strips hyphens so profile and registry identifiers compare equal. */
function normalizeEin(ein: string): string {
  return ein.trim().replace(/-/g, "");
}

/**
 * Looks up which registry and country each charity belongs to. This is an
 * enrichment: on failure the map is empty and cards fall back to defaults.
 * @param eins - Charity identifiers from charity_profiles
 * @returns Map of hyphen-free identifier to { registrySource, country }
 */
async function fetchRegistryMetadata(
  eins: string[],
): Promise<Map<string, { registrySource: string | null; country: string | null }>> {
  const meta = new Map<string, { registrySource: string | null; country: string | null }>();
  const keys = Array.from(
    new Set(eins.flatMap((ein) => [ein.trim(), normalizeEin(ein)])),
  ).filter(Boolean);
  if (keys.length === 0) return meta;

  const { data, error } = await supabase
    .from("charity_organizations")
    .select("ein, registry_source, country")
    .in("ein", keys);

  if (error) {
    Logger.warn("Registry metadata lookup failed", { error });
    return meta;
  }

  for (const row of (data ?? []) as RegistrySourceRow[]) {
    meta.set(normalizeEin(row.ein), {
      registrySource: row.registry_source,
      country: row.country,
    });
  }
  return meta;
}

/**
 * Fetches verified charity profiles with logos and transforms them into the
 * presentation shape consumed by FeaturedCharitiesCarousel.
 * @returns Array of featured charity display objects
 */
async function loadFeaturedCharities(): Promise<FeaturedCharity[]> {
  const { data, error } = await supabase
    .from("charity_profiles")
    .select("ein, name, mission, location, logo_url, ntee_code, claimed_by")
    .eq("status", "verified")
    .not("logo_url", "is", null)
    .limit(FEATURED_LIMIT);

  if (error) {
    Logger.error("Error fetching featured charities", { error });
    throw error;
  }

  const rows = (data ?? []) as CharityProfileRow[];
  const registryMeta = await fetchRegistryMetadata(rows.map((r) => r.ein));

  return rows.map((row) => {
    const category = getTranslatableNteeCategory(row.ntee_code);
    const meta = registryMeta.get(normalizeEin(row.ein));
    return {
      profileId: row.ein,
      name: row.name,
      description: row.mission ?? "",
      category: category.label,
      categoryKey: category.key,
      imageUrl: resolveCharityImageUrl(row.logo_url, row.ein),
      location: row.location !== null ? row.location : undefined,
      registrySource: meta?.registrySource ?? null,
      isClaimed: row.claimed_by !== null,
      country: meta?.country ?? null,
    };
  });
}

interface UseFeaturedCharitiesReturn {
  charities: FeaturedCharity[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook that fetches platform-featured charities on mount and transforms them
 * into the presentation shape consumed by FeaturedCharitiesCarousel.
 * @returns Featured charities with loading and error state
 */
export function useFeaturedCharities(): UseFeaturedCharitiesReturn {
  const [charities, setCharities] = useState<FeaturedCharity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadFeaturedCharities()
      .then((data) => {
        if (!mountedRef.current) return;
        setCharities(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load featured charities");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { charities, loading, error };
}
