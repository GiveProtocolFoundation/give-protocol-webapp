import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Mail } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { AGE_AFFIRMATION_COPY } from "@/constants/ageAffirmation";

// Sub-component for consent checkbox items
interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  description: string;
  note?: string;
  className?: string;
}

/**
 * Modal header component - extracted to reduce nesting depth
 */
const ConsentModalHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <header className="bg-gradient-to-r from-emerald-600 to-emerald-600 text-white p-8 text-center">
      <h1
        id="consent-modal-title"
        className="text-3xl font-light mb-2 text-white"
      >
        {t("volunteer.applicationTitle", "Volunteer Opportunity Application")}
      </h1>
      <p className="text-lg opacity-90">
        {t(
          "volunteer.applicationSubtitle",
          "Help create sustainable impact through verified contributions",
        )}
      </p>
    </header>
  );
};

/**
 * List of consent understanding items - extracted to reduce nesting depth
 */
const ConsentUnderstandingList: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
      <li>
        {t(
          "volunteer.understanding.item1",
          "My personal information will be processed to evaluate my volunteer application, manage volunteer assignments, and carry out related activities. This processing is necessary to take steps at my request before, and to perform, any volunteer arrangement (GDPR Art. 6(1)(b)); it does not rely on my consent.",
        )}
      </li>
      <li>
        {t(
          "volunteer.understanding.item2",
          "GIVE PROTOCOL may collect various categories of my personal information, including identity information, contact details, background information, availability, and references. I should not include special categories of data (such as information about health, racial or ethnic origin, religious or political beliefs, trade-union membership, or sex life or sexual orientation) in free-text fields, as such data is not required to evaluate my application.",
        )}
      </li>
      <li>
        {t(
          "volunteer.understanding.item3",
          "My personal information may be shared with authorized personnel within the charity organization offering the volunteer opportunity, service providers, and third parties as outlined in the Privacy Notice.",
        )}
      </li>
      <li>
        {t(
          "volunteer.understanding.item4",
          "Where a service provider is located outside my country of residence, my personal information may be transferred internationally under appropriate safeguards (such as Standard Contractual Clauses) as described in the Privacy Notice. These transfers do not rely on my consent.",
        )}
      </li>
      <li>
        {t(
          "volunteer.understanding.item5",
          "I have certain rights regarding my personal information, which vary depending on my location, including the rights to access, rectify, delete, restrict processing, data portability, and object to processing.",
        )}
      </li>
      <li className="flex flex-wrap items-center gap-1">
        {t(
          "volunteer.understanding.item6Before",
          "I can object to processing (GDPR Art. 21) and request erasure of my personal information (GDPR Art. 17) by contacting",
        )}{" "}
        <a
          href="mailto:legal@giveprotocol.io"
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1"
        >
          legal@giveprotocol.io <Mail className="h-3 w-3" aria-hidden="true" />
        </a>
        {t(
          "volunteer.understanding.item6After",
          ". Where any specific processing is based on my consent, I can withdraw that consent at any time without affecting the lawfulness of processing carried out before withdrawal. Objecting or requesting erasure may impact the organisation\u2019s ability to consider my volunteer application.",
        )}
      </li>
    </ol>
  );
};

/** Reusable consent checkbox with title, description, and optional note. */
const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  id,
  checked,
  onChange,
  title,
  description,
  note,
  className = "",
}) => (
  <label
    htmlFor={id}
    aria-label={title}
    className={`flex items-start rounded-lg p-4 transition-colors cursor-pointer ${className}`}
  >
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
    />
    <div className="ml-4">
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </strong>
      <p className="text-gray-700 dark:text-gray-300 mt-1">{description}</p>
      {note && (
        <p className="text-gray-500 dark:text-gray-400 italic text-sm mt-2">
          {note}
        </p>
      )}
    </div>
  </label>
);

/** Dialog body containing consent checkboxes, acknowledgments, and action buttons. */
const ConsentDialog: React.FC<{
  essentialProcessing: boolean;
  onEssentialProcessingChange: (
    _e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  ageConfirmation: boolean;
  onAgeConfirmationChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  privacyNotice: boolean;
  onPrivacyNoticeChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  validationError: string | null;
  isSubmitDisabled: boolean;
  onAccept: () => void;
  onDecline: () => void;
}> = ({
  essentialProcessing,
  onEssentialProcessingChange,
  ageConfirmation,
  onAgeConfirmationChange,
  privacyNotice,
  onPrivacyNoticeChange,
  validationError,
  isSubmitDisabled,
  onAccept,
  onDecline,
}) => {
  const { t } = useTranslation();
  return (
    <dialog
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-[95%] max-h-[90dvh] overflow-hidden z-50 p-0 m-0"
      open
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <ConsentModalHeader />
      <article className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 italic border border-gray-200 dark:border-gray-600 rounded px-3 py-2">
          This consent form is provided in English as the operative legal
          language of this agreement. In the event of any discrepancy between
          this English text and any translation, the English version shall
          prevail.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t("volunteer.consentHeader", "Volunteer Application Consent")}
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          GIVE PROTOCOL processes the personal information in this application
          to evaluate your volunteer application and, if successful, to manage
          your volunteer engagement. This processing is necessary to take steps
          at your request before, and to perform, any volunteer arrangement
          (GDPR Art. 6(1)(b)) and does not rely on your consent. Processing is
          carried out as described in the Volunteer Application Privacy Notice,
          which you should read before continuing.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t("volunteer.consentUnderstand", "I understand that:")}
        </p>
        <ConsentUnderstandingList />

        <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mb-6">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("volunteer.processingAckTitle", "PROCESSING ACKNOWLEDGMENT")}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {t(
              "volunteer.processingAckDesc",
              "Please review and acknowledge the following before continuing:",
            )}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-4 border-l-4 border-emerald-600 space-y-6">
          <ConsentCheckbox
            id="essential-processing"
            checked={essentialProcessing}
            onChange={onEssentialProcessingChange}
            title={t(
              "volunteer.essentialProcessingTitle",
              "Application Processing (Required to confirm):",
            )}
            description="I understand that GIVE PROTOCOL will process my personal information to evaluate my volunteer application and, if successful, to manage my volunteer engagement. This processing is necessary to act on my application and is carried out under GDPR Art. 6(1)(b) (steps prior to, and performance of, a volunteer arrangement); it is not based on my consent."
            note="Note: This processing is necessary to consider your application. Confirming indicates you have been informed; it is not a consent to processing. International transfers, where applicable, rely on appropriate safeguards described in the Privacy Notice, not on this confirmation."
            className="hover:bg-white dark:hover:bg-gray-600"
          />
        </div>

        <section className="border-t border-gray-200 dark:border-gray-600 pt-6">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("volunteer.acknowledgmentTitle", "ACKNOWLEDGMENT")}
          </p>
          <ConsentCheckbox
            id="age-confirmation"
            checked={ageConfirmation}
            onChange={onAgeConfirmationChange}
            title={t("volunteer.ageConfirmationTitle", "Age Confirmation:")}
            description={AGE_AFFIRMATION_COPY.positive}
            note="(If you are under 16 years of age, parental or guardian consent is required)"
            className="mb-4 hover:bg-gray-50 dark:hover:bg-gray-600"
          />
          <ConsentCheckbox
            id="privacy-notice"
            checked={privacyNotice}
            onChange={onPrivacyNoticeChange}
            title={t("volunteer.privacyNoticeTitle", "Privacy Notice:")}
            description="I confirm that I have read and understood the Privacy Notice."
            className="hover:bg-gray-50 dark:hover:bg-gray-600"
          />
        </section>

        {validationError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start"
          >
            <AlertCircle
              className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-red-700 dark:text-red-300">{validationError}</p>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-600">
          <Button variant="secondary" onClick={onDecline} className="px-8 py-3">
            {t("volunteer.doNotAccept", "Do Not Accept")}
          </Button>
          <Button
            onClick={onAccept}
            disabled={isSubmitDisabled}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-700 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t("volunteer.acceptAndContinue", "Accept and Continue")}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          By submitting this application, you acknowledge that you have read and
          understood Give Protocol&apos;s privacy policy and volunteer
          guidelines. Your data will be processed in accordance with applicable
          data protection regulations.
        </p>
      </article>
    </dialog>
  );
};

interface ConsentFormProps {
  onAccept: () => void;
  onDecline: () => void;
}

/** Volunteer application consent form with required checkboxes and GDPR acknowledgments. */
export const ConsentForm: React.FC<ConsentFormProps> = ({
  onAccept,
  onDecline,
}) => {
  const [essentialProcessing, setEssentialProcessing] = useState(false);
  const [ageConfirmation, setAgeConfirmation] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleAccept = useCallback(() => {
    // Validate required checkboxes
    if (!essentialProcessing) {
      setValidationError(
        t(
          "volunteer.validation.essentialRequired",
          "You must confirm the application-processing acknowledgment to proceed",
        ),
      );
      return;
    }

    if (!ageConfirmation || !privacyNotice) {
      setValidationError(
        t(
          "volunteer.validation.agePrivacyRequired",
          "You must confirm your age and that you have read the Privacy Notice",
        ),
      );
      return;
    }

    // Clear any validation errors and proceed
    setValidationError(null);
    onAccept();
  }, [essentialProcessing, ageConfirmation, privacyNotice, onAccept, t]);

  const handleEssentialProcessingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEssentialProcessing(e.target.checked);
      if (
        e.target.checked &&
        validationError?.includes("application-processing")
      ) {
        setValidationError(null);
      }
    },
    [validationError],
  );

  const handleAgeConfirmationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAgeConfirmation(e.target.checked);
      if (
        e.target.checked &&
        privacyNotice &&
        validationError?.includes("confirm your age")
      ) {
        setValidationError(null);
      }
    },
    [privacyNotice, validationError],
  );

  const handlePrivacyNoticeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPrivacyNotice(e.target.checked);
      if (
        e.target.checked &&
        ageConfirmation &&
        validationError?.includes("confirm your age")
      ) {
        setValidationError(null);
      }
    },
    [ageConfirmation, validationError],
  );

  const handleBackdropClick = useCallback(() => {
    onDecline();
  }, [onDecline]);

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onDecline();
      }
    },
    [onDecline],
  );

  const isSubmitDisabled =
    !essentialProcessing || !ageConfirmation || !privacyNotice;

  return (
    <>
      <button
        className="fixed inset-0 bg-black bg-opacity-50 z-50 cursor-default"
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        tabIndex={0}
        aria-label="Close modal"
        type="button"
      />
      <ConsentDialog
        essentialProcessing={essentialProcessing}
        onEssentialProcessingChange={handleEssentialProcessingChange}
        ageConfirmation={ageConfirmation}
        onAgeConfirmationChange={handleAgeConfirmationChange}
        privacyNotice={privacyNotice}
        onPrivacyNoticeChange={handlePrivacyNoticeChange}
        validationError={validationError}
        isSubmitDisabled={isSubmitDisabled}
        onAccept={handleAccept}
        onDecline={onDecline}
      />
    </>
  );
};
