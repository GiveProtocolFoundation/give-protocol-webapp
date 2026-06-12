import React, { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { AGE_AFFIRMATION_COPY } from "@/constants/ageAffirmation";

interface PostAuthAgeConfirmModalProps {
  /**
   * Called when the user confirms they are 16+.
   * The caller should proceed with account activation / the gated action.
   */
  onConfirm: () => void;
  /**
   * Called when the user declines.
   * The caller should abort the pending action and clear any entered PII.
   */
  onDecline: () => void;
}

/**
 * One-time age-affirmation modal for auth paths that bypass the inline form
 * checkbox (OAuth, passkey, wallet sign-up) and for legacy users whose
 * `ageAffirmedAt` is null on their first gated action (GIV-454).
 *
 * Usage:
 * - Show immediately after OAuth/passkey/wallet signup completes, before
 *   activating the account or redirecting to the dashboard.
 * - Show on the next gated action for legacy users when `ageAffirmedAt == null`.
 * - Short-circuit (do not show) when `ageAffirmedAt != null`.
 *
 * The parent component is responsible for persisting the affirmation via the
 * API (`ageAffirmed: true` on the appropriate payload) after `onConfirm` fires.
 */
export const PostAuthAgeConfirmModal: React.FC<
  PostAuthAgeConfirmModalProps
> = ({ onConfirm, onDecline }) => {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleDecline = useCallback(() => {
    onDecline();
  }, [onDecline]);

  // Prevent backdrop clicks from propagating to elements beneath the modal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-auth-age-title"
      aria-describedby="post-auth-age-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-5"
        onClick={handleBackdropClick}
      >
        <h2
          id="post-auth-age-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Age Confirmation Required
        </h2>

        <p
          id="post-auth-age-desc"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          {AGE_AFFIRMATION_COPY.positive}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Give Protocol is available to users aged 16 and over.{" "}
          <a
            href="/privacy"
            className="underline hover:text-gray-700 dark:hover:text-gray-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-700 shadow-none hover:from-emerald-600 hover:to-emerald-700 hover:shadow-none"
          >
            I confirm — I am 16 or older
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDecline}
            className="flex-1"
          >
            I am under 16
          </Button>
        </div>

        {/* Negative-path message shown inline so the user understands why declining blocks them */}
        <p
          className="text-xs text-center text-gray-400 dark:text-gray-500"
          aria-live="polite"
        >
          {AGE_AFFIRMATION_COPY.negative}
        </p>
      </div>
    </div>
  );
};
