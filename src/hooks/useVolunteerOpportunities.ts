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
  requirements: string | null;
  benefits: string | null;
  schedule: string | null;
  /** ISO dates (YYYY-MM-DD). A null end date means ongoing. */
  startDate: string | null;
  endDate: string | null;
  applicationDeadline: string | null;
  volunteersNeeded: number | null;
  minimumAge: number | null;
  backgroundCheckRequired: boolean;
  trainingProvided: boolean;
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
  requirements: string | null;
  benefits: string | null;
  schedule: string | null;
  start_date: string | null;
  end_date: string | null;
  application_deadline: string | null;
  volunteers_needed: number | null;
  minimum_age: number | null;
  background_check_required: boolean | null;
  training_provided: boolean | null;
}

interface CharityRef {
  name: string;
  ein: string;
}

/** Shown when an opportunity has no uploaded header image. */
export const DEFAULT_OPPORTUNITY_IMAGE = "/images/charities/default.jpg";

const OPPORTUNITY_COLUMNS =
  "id, charity_id, title, description, skills, commitment, location, type, work_language, image_url, requirements, benefits, schedule, start_date, end_date, application_deadline, volunteers_needed, minimum_age, background_check_required, training_provided";

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
 * Converts opportunity rows to display objects, attaching charity info.
 * @param rows - Rows from volunteer_opportunities
 * @returns Display objects in the same order
 */
async function toItems(
  rows: OpportunityRow[],
): Promise<VolunteerOpportunityItem[]> {
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
      requirements: row.requirements ?? null,
      benefits: row.benefits ?? null,
      schedule: row.schedule ?? null,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      applicationDeadline: row.application_deadline ?? null,
      volunteersNeeded: row.volunteers_needed ?? null,
      minimumAge: row.minimum_age ?? null,
      backgroundCheckRequired: row.background_check_required === true,
      trainingProvided: row.training_provided === true,
    };
  });
}

/**
 * Fetches active, visible volunteer opportunities and attaches charity info.
 * @returns Opportunity display objects, newest first
 */
async function loadOpportunities(): Promise<VolunteerOpportunityItem[]> {
  const { data, error } = await supabase
    .from("volunteer_opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("status", "active")
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false });

  if (error) {
    Logger.error("Error fetching volunteer opportunities", { error });
    throw error;
  }

  return toItems((data ?? []) as OpportunityRow[]);
}

/**
 * Fetches one active, visible opportunity by id.
 * @param id - volunteer_opportunities.id
 * @returns The opportunity, or null when it does not exist or is not public
 */
async function loadOpportunity(
  id: string,
): Promise<VolunteerOpportunityItem | null> {
  const { data, error } = await supabase
    .from("volunteer_opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("id", id)
    .eq("status", "active")
    .eq("moderation_status", "visible")
    .maybeSingle();

  if (error) {
    Logger.error("Error fetching volunteer opportunity", { error, id });
    throw error;
  }
  if (!data) return null;

  const [item] = await toItems([data as OpportunityRow]);
  return item ?? null;
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

interface UseVolunteerOpportunityReturn {
  opportunity: VolunteerOpportunityItem | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook that loads a single opportunity for the detail page.
 * @param id - Opportunity id from the route, if present
 * @returns The opportunity (null when not found) with loading and error state
 */
export function useVolunteerOpportunity(
  id?: string,
): UseVolunteerOpportunityReturn {
  const [opportunity, setOpportunity] =
    useState<VolunteerOpportunityItem | null>(null);
  const [loading, setLoading] = useState(id !== undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadOpportunity(id)
      .then((data) => {
        if (cancelled) return;
        setOpportunity(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load volunteer opportunity");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { opportunity, loading, error };
}
