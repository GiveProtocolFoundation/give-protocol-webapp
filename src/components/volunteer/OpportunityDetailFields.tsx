import React from "react";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/hooks/useTranslation";

/** Optional detail fields captured for a volunteer opportunity. */
export interface OpportunityDetailValues {
  schedule: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  volunteersNeeded: string;
  minimumAge: string;
  requirements: string;
  benefits: string;
  backgroundCheckRequired: boolean;
  trainingProvided: boolean;
}

interface OpportunityDetailFieldsProps {
  values: OpportunityDetailValues;
  errors: Record<string, string>;
  onChange: (
    _e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

const TEXTAREA_CLASS =
  "block w-full border-[1.5px] border-slate-300 rounded-[10px] px-[0.9rem] py-[0.7rem] text-[0.9rem] bg-white focus:border-emerald-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]";

/** Schedule, dates, capacity, eligibility, requirements and benefits inputs. */
export const OpportunityDetailFields: React.FC<
  OpportunityDetailFieldsProps
> = ({ values, errors, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Input
        label={t("volunteer.field.schedule", "Schedule")}
        name="schedule"
        value={values.schedule}
        onChange={onChange}
        variant="enhanced"
        placeholder={t(
          "volunteer.field.schedulePlaceholder",
          "e.g., Tuesdays 6-8pm, flexible weekends",
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Input
          type="date"
          label={t("volunteer.field.startDate", "Start date")}
          name="startDate"
          value={values.startDate}
          onChange={onChange}
          variant="enhanced"
        />
        <Input
          type="date"
          label={t("volunteer.field.endDate", "End date")}
          name="endDate"
          value={values.endDate}
          onChange={onChange}
          variant="enhanced"
          helperText={t(
            "volunteer.field.endDateHelp",
            "Leave blank if ongoing",
          )}
          error={errors["endDate"]}
        />
        <Input
          type="date"
          label={t(
            "volunteer.field.applicationDeadline",
            "Application deadline",
          )}
          name="applicationDeadline"
          value={values.applicationDeadline}
          onChange={onChange}
          variant="enhanced"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          type="number"
          min={1}
          label={t("volunteer.field.volunteersNeeded", "Volunteers needed")}
          name="volunteersNeeded"
          value={values.volunteersNeeded}
          onChange={onChange}
          variant="enhanced"
          error={errors["volunteersNeeded"]}
        />
        <Input
          type="number"
          min={0}
          max={120}
          label={t("volunteer.field.minimumAge", "Minimum age")}
          name="minimumAge"
          value={values.minimumAge}
          onChange={onChange}
          variant="enhanced"
          error={errors["minimumAge"]}
        />
      </div>

      <div>
        <label
          htmlFor="opportunity-requirements"
          className="block text-[0.8rem] font-semibold text-slate-700 mb-1"
        >
          {`${t("volunteer.field.requirements", "Requirements")} (${t("volunteer.field.onePerLine", "one per line")})`}
        </label>
        <textarea
          id="opportunity-requirements"
          name="requirements"
          rows={4}
          value={values.requirements}
          onChange={onChange}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="opportunity-benefits"
          className="block text-[0.8rem] font-semibold text-slate-700 mb-1"
        >
          {`${t("volunteer.field.benefits", "Benefits")} (${t("volunteer.field.onePerLine", "one per line")})`}
        </label>
        <textarea
          id="opportunity-benefits"
          name="benefits"
          rows={3}
          value={values.benefits}
          onChange={onChange}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="backgroundCheckRequired"
            checked={values.backgroundCheckRequired}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
          />
          {t(
            "volunteer.field.backgroundCheckRequired",
            "Background check required",
          )}
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="trainingProvided"
            checked={values.trainingProvided}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
          />
          {t("volunteer.field.trainingProvided", "Training provided")}
        </label>
      </div>
    </div>
  );
};
