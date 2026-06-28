import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { CausePageTemplate } from "@/components/charity/CausePageTemplate";
import type { CauseProfileData } from "@/types/charity";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Logger } from "@/utils/logger";

interface CauseRow {
  id: string;
  name: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  charity_id: string;
  category: string;
  image_url: string | null;
  impact: string[] | null;
  timeline: string | null;
  location: string | null;
  partners: string[] | null;
  status: string;
}

/**
 * Dynamic cause detail page that fetches cause data from Supabase by ID.
 * Replaces the hardcoded cause pages (CleanWaterInitiative, etc.).
 */
const CauseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [cause, setCause] = useState<CauseProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!id) {
      setError("Cause not found");
      setLoading(false);
      return undefined;
    }

    /** Fetches the cause row by id and maps it onto local state. */
    const fetchCause = async () => {
      const { data, error: fetchError } = await supabase
        .from("causes")
        .select("*")
        .eq("id", id)
        .single();

      if (!mountedRef.current) return;

      if (fetchError || !data) {
        Logger.error("Error fetching cause detail", { error: fetchError, id });
        setError("Cause not found");
        setLoading(false);
        return;
      }

      const row = data as CauseRow;
      setCause({
        id: row.id,
        name: row.name,
        description: row.description,
        targetAmount: Number(row.target_amount),
        raisedAmount: Number(row.raised_amount),
        charityId: row.charity_id,
        category: row.category,
        image: row.image_url ?? "",
        impact: row.impact ?? [],
        timeline: row.timeline ?? "",
        location: row.location ?? "",
        partners: row.partners ?? [],
        status: row.status as "active" | "completed" | "paused",
      });
      setLoading(false);
    };

    fetchCause();

    return () => {
      mountedRef.current = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !cause) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Cause Not Found
          </h1>
          <p className="text-gray-500">
            The cause you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return <CausePageTemplate cause={cause} />;
};

export default CauseDetail;
