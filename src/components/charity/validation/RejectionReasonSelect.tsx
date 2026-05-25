import React, { useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  RejectionReason,
  REJECTION_REASON_LABELS,
} from "@/types/selfReportedHours";

interface RejectionReasonSelectProps {
  value: RejectionReason | "";
  notes: string;
  onReasonChange: (_reason: RejectionReason | "") => void;
  onNotesChange: (_notes: string) => void;
  error?: string;
}

/**
 * Select component for choosing a rejection reason
 * @param props - Component props
 * @returns JSX element
 */
export const RejectionReasonSelect: React.FC<RejectionReasonSelectProps> = ({
  value,
  notes,
  onReasonChange,
  onNotesChange,
  error,
}) => {
  const { t } = useTranslation();
  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onReasonChange(e.target.value as RejectionReason | "");
    },
    [onReasonChange],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onNotesChange(e.target.value);
    },
    [onNotesChange],
  );

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="rejection-reason"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("validation.rejection.reasonLabel")}{" "}
          <span className="text-red-500">*</span>
        </label>
        <select
          id="rejection-reason"
          value={value}
          onChange={handleReasonChange}
          className={`block w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            error ? "border-red-300" : "border-gray-300"
          }`}
        >
          <option value="">
            {t("validation.rejection.reasonPlaceholder")}
          </option>
          {Object.entries(REJECTION_REASON_LABELS).map(
            ([reasonValue, label]) => (
              <option key={reasonValue} value={reasonValue}>
                {label}
              </option>
            ),
          )}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <label
          htmlFor="rejection-notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("validation.rejection.notesLabel")}{" "}
          <span className="text-gray-400 font-normal">
            {t("validation.rejection.optional")}
          </span>
        </label>
        <textarea
          id="rejection-notes"
          value={notes}
          onChange={handleNotesChange}
          rows={3}
          className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder={t("validation.rejection.notesPlaceholder")}
        />
      </div>
    </div>
  );
};

export default RejectionReasonSelect;
