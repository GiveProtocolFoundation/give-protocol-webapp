import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { AGE_AFFIRMATION_COPY } from "@/constants/ageAffirmation";

interface AgeGateAlertProps {
  /** Whether to render the alert. When false, returns null. */
  visible: boolean;
}

/**
 * Accessible negative-path validation alert for the age gate.
 * Uses role="alert" + aria-live="polite" so screen readers announce
 * the rejection message when it appears.
 *
 * @param props - Component props.
 * @param props.visible - Controls rendering.
 * @returns The alert element or null.
 */
export const AgeGateAlert: React.FC<AgeGateAlertProps> = ({ visible }) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30"
    >
      <AlertCircle
        className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5"
        aria-hidden="true"
      />
      <p className="text-sm text-red-700 dark:text-red-300">
        {t("ageGate.negative", AGE_AFFIRMATION_COPY.negative)}
      </p>
    </div>
  );
};
