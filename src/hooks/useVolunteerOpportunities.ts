import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { WorkLanguage } from "@/types/volunteer";

/** Display shape for a volunteer opportunity card. */
export interface VolunteerOpportunityItem {
  id: string;
  charityId: string;
  title: string;
  organization: string;
  /** Route to the hosting charity's profile, when it can be resolved. */
  charityPath?: string;
  description: string;
  skills: string[];
  commitment: string;
  location: string;
  type: "onsite" | "remote" | "hybrid";
  workLanguage: WorkLanguage;
  imageUrl: string;
}

interface UseVolunteerOpportunitiesReturn {
  opportunities: VolunteerOpportunityItem[];
  loading: boolean;
  error: string | null;
}

interface OpportunityRow {
  id: string;
  charity_id: string;
  title: string;
  description: string;
  skills: string[] | null;
  commitment: string;
  location: string;
  type: string;
  work_language: string;
  image_url: string | null;
}

interface CharityRef {
  name: string;
  ein: string;
}

/** Shown when an opportunity has no uploaded header image. */
export const DEFAULT_OPPORTUNITY_IMAGE = "/images/charities/default.jpg";

const WORK_TYPES = new Set(["onsite", "remote", "hybrid"]);
const WORK_LANGUAGES = new Set<string>(Object.values(WorkLanguage));

/**
 * Resolves charity name and EIN for each charity_id. The id may be a
 * charity_profiles.id (seeded/unclaimed charities) or a profiles.id (charities
 * that signed up and post from the portal), so ids missing from
 * charity_profiles are mapped through profiles -> charity_profiles.claimed_by.
 * Resolution is an enrichment: failures yield an empty map, not an error.
 * @param charityIds - Distinct charity_id values from the opportunity rows
 * @returns Map of charity_id to name and EIN
 */
async function resolveCharities(
  charityIds: string[],
): Promise<Map<string, CharityRef>> {
  const refs = new Map<string, CharityRef>();

  const { data: direct } = await supabase
    .from("charity_profiles")
    .select("id, ein, name")
    .in("id", charityIds);
  for (const row of (direct ?? []) as Array<{
    id: string;
    ein: string;
    name: string;
  }>) {
    refs.set(row.id, { name: row.name, ein: row.ein });
  }

  const unresolved = charityIds.filter((id) => !refs.has(id));
  if (unresolved.length === 0) return refs;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, name")
    .in("id", unresolved);
  const profileRows = (profiles ?? []) as Array<{
    id: string;
    user_id: string;
    name: string | null;
  }>;
  if (profileRows.length === 0) return refs;

  const { data: claimed } = await supabase
    .from("charity_profiles")
    .select("ein, name, claimed_by")
    .in(
      "claimed_by",
      profileRows.map((p) => p.user_id),
    );
  const byUser = new Map<string, CharityRef>();
  for (const row of (claimed ?? []) as Array<{
    ein: string;
    name: string;
    claimed_by: string;
  }>) {
    byUser.set(row.claimed_by, { name: row.name, ein: row.ein });
  }

  for (const p of profileRows) {
    const ref = byUser.get(p.user_id);
    if (ref) {
      refs.set(p.id, ref);
    } else if (p.name) {
      refs.set(p.id, { name: p.name, ein: "" });
    }
  }
  return refs;
}

/**
 * Fetches active, visible volunteer opportunities and attaches charity info.
 * @returns Opportunity display objects, newest first
 */
async function loadOpportunities(): Promise<VolunteerOpportunityItem[]> {
  const { data, error } = await supabase
    .from("volunteer_opportunities")
    .select(
      "id, charity_id, title, description, skills, commitment, location, type, work_language, image_url",
    )
    .eq("status", "active")
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false });

  if (error) {
    Logger.error("Error fetching volunteer opportunities", { error });
    throw error;
  }

  const rows = (data ?? []) as OpportunityRow[];
  if (rows.length === 0) return [];

  let charities = new Map<string, CharityRef>();
  try {
    charities = await resolveCharities([
      ...new Set(rows.map((r) => r.charity_id)),
    ]);
  } catch (err) {
    Logger.error("Error resolving opportunity charities", { error: err });
  }

  return rows.map((row) => {
    const charity = charities.get(row.charity_id);
    return {
      id: row.id,
      charityId: row.charity_id,
      title: row.title,
      organization: charity?.name ?? "",
      charityPath: charity?.ein ? `/charity/${charity.ein}` : undefined,
      description: row.description,
      skills: row.skills ?? [],
      commitment: row.commitment,
      location: row.location,
      type: WORK_TYPES.has(row.type)
        ? (row.type as VolunteerOpportunityItem["type"])
        : "remote",
      workLanguage: WORK_LANGUAGES.has(row.work_language)
        ? (row.work_language as WorkLanguage)
        : WorkLanguage.ENGLISH,
      imageUrl: row.image_url ?? DEFAULT_OPPORTUNITY_IMAGE,
    };
  });
}

/**
 * Hook that loads the volunteer opportunities shown on /opportunities.
 * @returns Opportunities with loading and error state
 */
export function useVolunteerOpportunities(): UseVolunteerOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<
    VolunteerOpportunityItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadOpportunities()
      .then((data) => {
        if (!mountedRef.current) return;
        setOpportunities(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("Failed to load volunteer opportunities");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { opportunities, loading, error };
}
