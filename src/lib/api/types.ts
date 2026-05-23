/**
 * Core API types shared across data-fetching hooks.
 * These map to the shape of rows returned by Supabase table queries.
 */

export interface CharityData {
  id: string;
  name: string;
  mission: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  ntee_code: string | null;
  status: string;
  ein: string;
  description: string | null;
  contact_email: string | null;
  founded: string | null;
  employees: number | null;
  created_at: string;
  updated_at: string;
}

/** Raw Supabase row shape for a charity cause. */
export interface CauseData {
  id: string;
  charity_id: string;
  name: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  category: string;
  image_url: string | null;
  location: string;
  timeline: string | null;
  status: string;
  created_at: string;
}
