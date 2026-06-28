import React, { useState, useEffect, useCallback } from "react";
import { Target } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { ImpactProfileForm } from "./ImpactProfileForm";
import type { ImpactStat } from "@/types/charity";

interface ImpactProfileData {
  mission_statement: string;
  impact_stats: ImpactStat[];
  impact_highlights: string[];
}

interface ImpactProfileTabProps {
  profileId: string;
}

/** Tab panel for editing the charity's mission statement, impact stats, and highlights. */
export const ImpactProfileTab: React.FC<ImpactProfileTabProps> = ({
  profileId,
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<ImpactProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    /** Loads impact profile data (mission, stats, highlights) from Supabase. */
    const fetchData = async () => {
      try {
        const { data: row, error: fetchError } = await supabase
          .from("charity_details")
          .select("mission_statement, impact_stats, impact_highlights")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setData({
          mission_statement: (row?.mission_statement as string) || "",
          impact_stats: (row?.impact_stats as ImpactStat[]) || [],
          impact_highlights: (row?.impact_highlights as string[]) || [],
        });
      } catch (err) {
        Logger.error("Error fetching impact profile", { error: err });
        setError(t("impact.loadError", "Failed to load impact profile"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId, t]);

  const handleSave = useCallback(
    async (saveData: ImpactProfileData) => {
      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        const { error: updateError } = await supabase
          .from("charity_details")
          .upsert(
            [
              {
                profile_id: profileId,
                mission_statement: saveData.mission_statement,
                impact_stats: saveData.impact_stats,
                impact_highlights: saveData.impact_highlights,
              },
            ],
            { onConflict: "profile_id" },
          );

        if (updateError) throw updateError;

        setData(saveData);
        setSuccess(true);

        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        Logger.error("Error saving impact profile", { error: err });
        setError(t("impact.saveError", "Failed to save impact profile"));
      } finally {
        setSaving(false);
      }
    },
    [profileId, t],
  );

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-64 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            {t("impact.profile", "Impact Profile")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              "impact.profileDescription",
              "Showcase your organization's impact and mission",
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        {error && (
          <div
            className="mb-4 p-3 bg-red-50 text-red-600 rounded-md"
            role="alert"
          >
            {error}
          </div>
        )}
        {success && (
          <output className="mb-4 p-3 bg-green-50 text-green-600 rounded-md block">
            {t("impact.saveSuccess", "Impact profile saved successfully")}
          </output>
        )}

        <ImpactProfileForm
          initialData={data}
          onSave={handleSave}
          loading={saving}
        />
      </div>
    </div>
  );
};

export default ImpactProfileTab;
