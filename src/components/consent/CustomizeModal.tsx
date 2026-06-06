import React, { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useConsent } from "@/lib/consent/ConsentProvider";
import { Modal } from "@/components/ui/Modal";

interface CustomizeModalProps {
  onClose: () => void;
  /**
   * Whether to show the X close button in the modal header.
   * Set to false for the banner-triggered flow (Save / Cancel are the only
   * exit paths before a decision is made).
   * Set to true (default) for the footer-triggered re-entry path where
   * post-decision withdrawal via close is acceptable.
   */
  showCloseButton?: boolean;
}

/**
 * Cookie preferences dialog.
 *
 * Uses src/components/ui/Modal as its shell (Portal + focus trap + ESC +
 * backdrop already handled there). This component owns only the consent
 * row UI and Save / Cancel actions.
 *
 * - ESC and backdrop close the modal without writing consent.
 * - Save calls accept() and closes.
 * - Cancel closes without writing.
 * - showCloseButton=false hides the X icon (banner flow); =true shows it
 *   (footer re-entry flow).
 */
export function CustomizeModal({
  onClose,
  showCloseButton = false,
}: CustomizeModalProps) {
  const { t } = useTranslation();
  const { categories, accept } = useConsent();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    categories.analytics,
  );

  function handleSave() {
    accept({ essential: true, analytics: analyticsEnabled });
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("consent.modal.title")}
      showCloseButton={showCloseButton}
      closeOnBackdrop
      closeOnEscape
    >
      <div className="space-y-5 pt-3">
        {/* Essential row — always on, toggle disabled */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("consent.modal.essentialTitle")}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("consent.modal.essentialDesc")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="true"
            disabled
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full bg-emerald-600 opacity-60 focus:outline-none"
            aria-label={t("consent.modal.essentialAlwaysOn")}
          >
            <span className="pointer-events-none inline-block h-5 w-5 mt-0.5 ml-0.5 translate-x-5 rounded-full bg-white shadow" />
          </button>
        </div>

        {/* Analytics row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("consent.modal.analyticsTitle")}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("consent.modal.analyticsDesc")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={analyticsEnabled}
            onClick={() => setAnalyticsEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              analyticsEnabled ? "bg-emerald-600" : "bg-gray-200"
            }`}
            aria-label={t(
              analyticsEnabled
                ? "consent.modal.analyticsOn"
                : "consent.modal.analyticsOff",
            )}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                analyticsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {t("consent.modal.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {t("consent.modal.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
