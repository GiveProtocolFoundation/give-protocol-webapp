import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** A charity that belongs to a portfolio fund. */
export interface PortfolioFundCharity {
  id: string;
  ein: string;
  name: string;
  mission: string;
  location: string;
  imageUrl: string;
  verified: boolean;
}

/** Display shape for a single portfolio fund detail page. */
export interface PortfolioFundDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  charities: PortfolioFundCharity[];
}

interface UsePortfolioFundReturn {
  fund: PortfolioFundDetails | null;
  loading: boolean;
  error: string | null;
}

interface FundRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  charity_ids: string[] | null;
}

interface CharityProfileRow {
  id: string;
  ein: string;
  name: string;
  mission: string | null;
  location: string | null;
  logo_url: string | null;
  status: string | null;
}

/**
 * Loads one active portfolio fund plus the charity profiles it groups.
 * @param id - Portfolio fund UUID from the route
 * @returns The fund with its member charities, or null when not found
 */
async function loadPortfolioFund(
  id: string,
): Promise<PortfolioFundDetails | null> {
  const { data, error } = await supabase
    .from("portfolio_funds")
    .select("id, name, description, category, image_url, charity_ids")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    Logger.error("Error fetching portfolio fund", { error, id });
    throw error;
  }
  if (!data) return null;

  const row = data as FundRow;
  const charityIds = Array.isArray(row.charity_ids) ? row.charity_ids : [];

  let charities: PortfolioFundCharity[] = [];
  if (charityIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("charity_profiles")
      .select("id, ein, name, mission, location, logo_url, status")
      .in("id", charityIds);

    if (profilesError) {
      Logger.error("Error fetching portfolio fund charities", {
        error: profilesError,
        id,
      });
      throw profilesError;
    }

    charities = ((profiles ?? []) as CharityProfileRow[]).map((profile) => ({
      id: profile.id,
      ein: profile.ein,
      name: profile.name,
      mission: profile.mission ?? "",
      location: profile.location ?? "",
      imageUrl: profile.logo_url ?? "",
      verified: profile.status === "verified",
    }));
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "General",
    imageUrl: row.image_url ?? "",
    charities,
  };
}

/**
 * Hook that fetches a single portfolio fund and its member charities by id.
 * @param id - Portfolio fund UUID from the route params
 * @returns The fund detail record with loading and error state
 */
export function usePortfolioFund(id: string | undefined): UsePortfolioFundReturn {
  const [fund, setFund] = useState<PortfolioFundDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (id === undefined || id === "") {
      setFund(null);
      setError("Portfolio fund not found");
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    setLoading(true);
    setError(null);

    loadPortfolioFund(id)
      .then((data) => {
        if (!mountedRef.current) return;
        if (!data) {
          setFund(null);
          setError("Portfolio fund not found");
        } else {
          setFund(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load portfolio fund");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [id]);

  return { fund, loading, error };
}
