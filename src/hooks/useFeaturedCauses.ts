import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** Display shape for a featured cause in the carousel. */
export interface FeaturedCause {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  charityName: string;
  targetAmount: number;
  raisedAmount: number;
  location?: string;
}

interface UseFeaturedCausesReturn {
  causes: FeaturedCause[];
  loading: boolean;
  error: string | null;
}

interface CauseRow {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  target_amount: number;
  raised_amount: number;
  location: string | null;
  charity_id: string;
}

const FEATURED_LIMIT = 12;

/**
 * Fetches active causes and resolves charity names via charity_profiles.
 * @returns Array of featured cause display objects
 */
async function loadFeaturedCauses(): Promise<FeaturedCause[]> {
  const { data, error } = await supabase
    .from("causes")
    .select(
      "id, name, description, category, image_url, target_amount, raised_amount, location, charity_id",
    )
    .eq("status", "active")
    .limit(FEATURED_LIMIT);

  if (error) {
    Logger.error("Error fetching featured causes", { error });
    throw error;
  }

  const rows = (data ?? []) as CauseRow[];
  if (rows.length === 0) return [];

  // Resolve charity names from charity_profiles via profile id (charity_id)
  const charityIds = [...new Set(rows.map((r) => r.charity_id))];
  const { data: profiles } = await supabase
    .from("charity_profiles")
    .select("id, name")
    .in("id", charityIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameMap.set(p.id, p.name);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url ?? "",
    charityName: nameMap.get(row.charity_id) ?? "Unknown Charity",
    targetAmount: Number(row.target_amount),
    raisedAmount: Number(row.raised_amount),
    location: row.location !== null ? row.location : undefined,
  }));
}

/**
 * Hook that fetches active causes for the featured carousel.
 * @returns Featured causes with loading and error state
 */
export function useFeaturedCauses(): UseFeaturedCausesReturn {
  const [causes, setCauses] = useState<FeaturedCause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadFeaturedCauses()
      .then((data) => {
        if (!mountedRef.current) return;
        setCauses(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load featured causes");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { causes, loading, error };
}
