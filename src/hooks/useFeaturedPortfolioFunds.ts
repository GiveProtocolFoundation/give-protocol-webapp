import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** Display shape for a featured portfolio fund in the carousel. */
export interface FeaturedPortfolioFund {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  charityCount: number;
}

interface UseFeaturedPortfolioFundsReturn {
  funds: FeaturedPortfolioFund[];
  loading: boolean;
  error: string | null;
}

interface PortfolioFundRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  charity_ids: string[] | null;
}

const FEATURED_LIMIT = 12;

/**
 * Fetches active portfolio funds from Supabase.
 * @returns Array of featured portfolio fund display objects
 */
async function loadFeaturedPortfolioFunds(): Promise<FeaturedPortfolioFund[]> {
  const { data, error } = await supabase
    .from("portfolio_funds")
    .select("id, name, description, category, image_url, charity_ids")
    .eq("status", "active")
    .limit(FEATURED_LIMIT);

  if (error) {
    Logger.error("Error fetching featured portfolio funds", { error });
    throw error;
  }

  return ((data ?? []) as PortfolioFundRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "General",
    imageUrl: row.image_url ?? "",
    charityCount: Array.isArray(row.charity_ids) ? row.charity_ids.length : 0,
  }));
}

/**
 * Hook that fetches active portfolio funds for the featured carousel.
 * @returns Featured portfolio funds with loading and error state
 */
export function useFeaturedPortfolioFunds(): UseFeaturedPortfolioFundsReturn {
  const [funds, setFunds] = useState<FeaturedPortfolioFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadFeaturedPortfolioFunds()
      .then((data) => {
        if (!mountedRef.current) return;
        setFunds(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load portfolio funds");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { funds, loading, error };
}
