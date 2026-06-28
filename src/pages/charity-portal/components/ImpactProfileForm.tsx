import React, { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { BarChart3, FileText, Star, Plus, X } from "lucide-react";
import type { ImpactStat } from "@/types/charity";

interface ImpactProfileFormData {
  stats: ImpactStat[];
  missionStatement: string;
  highlights: string[];
}

interface ImpactProfileFormProps {
  initialData: {
    mission_statement?: string;
    impact_stats?: ImpactStat[];
    impact_highlights?: string[];
  } | null;
  onSave: (_data: {
    mission_statement: string;
    impact_stats: ImpactStat[];
    impact_highlights: string[];
  }) => Promise<void>;
  loading: boolean;
}

const MISSION_MAX_LENGTH = 500;
const MAX_HIGHLIGHTS = 5;

const DEFAULT_STATS: ImpactStat[] = [
  { label: "", value: "" },
  { label: "", value: "" },
  { label: "", value: "" },
];

const STAT_PLACEHOLDERS = [
  { label: "People Reached", value: "500,000+" },
  { label: "Projects Completed", value: "120" },
  { label: "Countries Served", value: "15" },
];

/**
 * Form component for managing charity impact profile data.
 * @param props - Component props
 * @returns The ImpactProfileForm component
 */
export const ImpactProfileForm: React.FC<ImpactProfileFormProps> = ({
  initialData,
  onSave,
  loading,
}) => {
  const { t } = useTranslation();

  const initialFormData = useMemo((): ImpactProfileFormData => {
    const stats =
      initialData?.impact_stats?.length === 3
        ? initialData.impact_stats
        : DEFAULT_STATS;

    return {
      stats: stats.map((s) => ({ label: s.label || "", value: s.value || "" })),
      missionStatement: initialData?.mission_statement || "",
      highlights: initialData?.impact_highlights || [],
    };
  }, [initialData]);

  const [formData, setFormData] =
    useState<ImpactProfileFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleStatLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = Number(e.currentTarget.dataset.index);
      setFormData((prev) => {
        const newStats = [...prev.stats];
        newStats[index] = { ...newStats[index], label: e.target.value };
        return { ...prev, stats: newStats };
      });
      setErrors((prev) => {
        const { [`stat_${index}`]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [],
  );

  const handleStatValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = Number(e.currentTarget.dataset.index);
      setFormData((prev) => {
        const newStats = [...prev.stats];
        newStats[index] = { ...newStats[index], value: e.target.value };
        return { ...prev, stats: newStats };
      });
      setErrors((prev) => {
        const { [`stat_${index}`]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [],
  );

  const handleMissionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MISSION_MAX_LENGTH) {
        setFormData((prev) => ({ ...prev, missionStatement: value }));
        setErrors((prev) => {
          const { mission: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [],
  );

  const handleHighlightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = Number(e.currentTarget.dataset.index);
      setFormData((prev) => {
        const newHighlights = [...prev.highlights];
        newHighlights[index] = e.target.value;
        return { ...prev, highlights: newHighlights };
      });
    },
    [],
  );

  const handleAddHighlight = useCallback(() => {
    setFormData((prev) => {
      if (prev.highlights.length >= MAX_HIGHLIGHTS) return prev;
      return { ...prev, highlights: [...prev.highlights, ""] };
    });
  }, []);

  const handleRemoveHighlight = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const index = Number(e.currentTarget.dataset.index);
      setFormData((prev) => ({
        ...prev,
        highlights: prev.highlights.filter((_, i) => i !== index),
      }));
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    formData.stats.forEach((stat, index) => {
      const hasLabel = Boolean(stat.label.trim());
      const hasValue = Boolean(stat.value.trim());
      if (hasLabel !== hasValue) {
        newErrors[`stat_${index}`] = t(
          "impact.statIncomplete",
          "Both label and value are required",
        );
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      await onSave({
        mission_statement: formData.missionStatement.trim(),
        impact_stats: formData.stats,
        impact_highlights: formData.highlights.filter((h) => h.trim() !== ""),
      });
    },
    [formData, onSave, validate],
  );

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, [initialFormData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Impact Statistics Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("impact.statistics", "Impact Statistics")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            "impact.statisticsHelp",
            "Showcase 3 key metrics that demonstrate your organization's impact.",
          )}
        </p>
        <div className="space-y-4">
          {formData.stats.map((stat, index) => (
            <div
              key={`stat-${String(index)}`}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Input
                variant="enhanced"
                label={`${t("impact.statLabel", "Label")} ${String(index + 1)}`}
                value={stat.label}
                onChange={handleStatLabelChange}
                data-index={index}
                placeholder={STAT_PLACEHOLDERS[index].label}
                error={errors[`stat_${index}`]}
              />
              <Input
                variant="enhanced"
                label={`${t("impact.statValue", "Value")} ${String(index + 1)}`}
                value={stat.value}
                onChange={handleStatValueChange}
                data-index={index}
                placeholder={STAT_PLACEHOLDERS[index].value}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Mission Statement Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("impact.missionStatement", "Mission Statement")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            "impact.missionHelp",
            "Write a concise statement about your organization's core purpose.",
          )}
        </p>
        <div>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-vertical min-h-[120px]"
            value={formData.missionStatement}
            onChange={handleMissionChange}
            placeholder={t("impact.missionPlaceholder", "Our mission is to...")}
            maxLength={MISSION_MAX_LENGTH}
            aria-label={t("impact.missionStatement", "Mission Statement")}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {formData.missionStatement.length}/{MISSION_MAX_LENGTH}
          </p>
        </div>
      </section>

      {/* Impact Highlights Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("impact.highlights", "Impact Highlights")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            "impact.highlightsHelp",
            "Add up to 5 key achievements or impact highlights.",
          )}
        </p>
        <div className="space-y-3">
          {formData.highlights.map((highlight, index) => (
            <div
              key={`highlight-${String(index)}`}
              className="flex items-center gap-2"
            >
              <div className="flex-1">
                <Input
                  variant="enhanced"
                  value={highlight}
                  onChange={handleHighlightChange}
                  data-index={index}
                  aria-label={`${t("impact.highlight", "Impact highlight")} ${String(index + 1)}`}
                  placeholder={t(
                    "impact.highlightPlaceholder",
                    "e.g., Built 50 homes for families in need",
                  )}
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveHighlight}
                data-index={index}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label={t("common.remove", "Remove")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {formData.highlights.length < MAX_HIGHLIGHTS && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddHighlight}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("impact.addHighlight", "Add Highlight")}
            </Button>
          )}
        </div>
      </section>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={handleReset}
          disabled={loading}
        >
          {t("common.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={loading} className="min-w-[150px]">
          {loading
            ? t("common.saving", "Saving...")
            : t("common.saveChanges", "Save Changes")}
        </Button>
      </div>
    </form>
  );
};

export default ImpactProfileForm;
