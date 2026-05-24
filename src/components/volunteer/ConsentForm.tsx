import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Mail } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

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
  <header className="bg-gradient-to-r from-emerald-600 to-emerald-600 text-gray-900 p-8 text-center">
    <h1 id="consent-modal-title" className="text-3xl font-light mb-2">
      {t("volunteer.applicationTitle", "Volunteer Opportunity Application")}
    </h1>
    <p className="text-lg opacity-90">
      {t("volunteer.applicationSubtitle", "Help create sustainable impact through verified contributions")}
    </p>
  </header>
  );
};

/**
 * List of consent understanding items - extracted to reduce nesting depth
 */
const ConsentUnderstandingList: React.FC = () => (
  <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-6">
    <li>
      My personal information will be processed for the purposes of evaluating
      my volunteer application, managing volunteer assignments, and related
      activities.
    </li>
    <li>
      GIVE PROTOCOL may collect various categories of my personal information,
      including identity information, contact details, background information,
      availability, references, and where relevant and permitted by law, certain
      special categories of data.
    </li>
    <li>
      My personal information may be shared with authorized personnel within the
      charity organization offering the volunteer opportunity, service
      providers, and third parties as outlined in the Privacy Notice.
    </li>
    <li>
      My personal information may be transferred internationally with
      appropriate safeguards in place.
    </li>
    <li>
      I have certain rights regarding my personal information, which vary
      depending on my location, including the rights to access, rectify, delete,
      restrict processing, data portability, and object to processing.
    </li>
    <li className="flex flex-wrap items-center gap-1">
      I can withdraw my consent at any time by contacting{" "}
      <a
        href="mailto:legal@giveprotocol.io"
        className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
      >
        legal@giveprotocol.io <Mail className="h-3 w-3" aria-hidden="true" />
      </a>
      {", "}
      though this will not affect the lawfulness of processing based on my
      consent before withdrawal. Withdrawing consent may impact the
      organization&apos;s ability to consider my volunteer application.
    </li>
  </ol>
);

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
      className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
    />
    <div className="ml-4">
      <strong className="font-semibold text-gray-900">{title}</strong>
      <p className="text-gray-700 mt-1">{description}</p>
      {note && <p className="text-gray-500 italic text-sm mt-2">{note}</p>}
    </div>
  </label>
);

/** Dialog body containing consent checkboxes, acknowledgments, and action buttons. */
const ConsentDialog: React.FC<{
  essentialProcessing: boolean;
  onEssentialProcessingChange: (
    _e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  internationalTransfers: boolean;
  onInternationalTransfersChange: (
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
  internationalTransfers,
  onInternationalTransfersChange,
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
    className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl max-w-4xl w-[95%] max-h-[90dvh] overflow-hidden z-50 p-0 m-0"
    open
    aria-modal="true"
    aria-labelledby="consent-modal-title"
  >
    <ConsentModalHeader />
    <article className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t("volunteer.consentHeader", "Volunteer Application Consent")}
      </h2>
      <p className="mb-6 text-gray-700 leading-relaxed">
        By completing and submitting this form, I consent to GIVE PROTOCOL
        collecting, processing, and storing my personal information as described
        in the Volunteer Application Privacy Notice, which I have read and
        understood.
      </p>
      <p className="font-semibold text-gray-900 mb-3">{t("volunteer.consentUnderstand", "I understand that:")}</p>
      <ConsentUnderstandingList />

      <div className="border-t border-gray-200 pt-6 mb-6">
        <p className="font-semibold text-gray-900 mb-4">{t("volunteer.specificConsents", "SPECIFIC CONSENTS")}</p>
        <p className="text-gray-600 text-sm mb-6">
          {t("volunteer.specificConsentsDesc", "Please review and indicate your consent to each of the following:")}
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 mb-4 border-l-4 border-emerald-600 space-y-6">
        <ConsentCheckbox
          id="essential-processing"
          checked={essentialProcessing}
          onChange={onEssentialProcessingChange}
          title={t("volunteer.essentialProcessingTitle", "Essential Processing (Required):")}
          description="I consent to GIVE PROTOCOL collecting and processing my personal information for the purpose of evaluating my volunteer application and, if successful, managing my volunteer engagement."
          note="Note: This consent is necessary to process your volunteer application. If you do not provide this consent, we will not be able to consider your application."
          className="hover:bg-white"
        />
        <ConsentCheckbox
          id="international-transfers"
          checked={internationalTransfers}
          onChange={onInternationalTransfersChange}
          title={t("volunteer.internationalTransfersTitle", "International Transfers (if applicable):")}
          description="I consent to GIVE PROTOCOL transferring my personal information to countries outside my country of residence, including countries that may not provide the same level of data protection, with appropriate safeguards in place as described in the Privacy Notice."
          className="hover:bg-white"
        />
      </div>

      <section className="border-t border-gray-200 pt-6">
        <p className="font-semibold text-gray-900 mb-4">{t("volunteer.acknowledgmentTitle", "ACKNOWLEDGMENT")}</p>
        <ConsentCheckbox
          id="age-confirmation"
          checked={ageConfirmation}
          onChange={onAgeConfirmationChange}
          title={t("volunteer.ageConfirmationTitle", "Age Confirmation:")}
          description="I confirm that I am at least 16 years of age."
          note="(If you are under 16 years of age, parental or guardian consent is required)"
          className="mb-4 hover:bg-gray-50"
        />
        <ConsentCheckbox
          id="privacy-notice"
          checked={privacyNotice}
          onChange={onPrivacyNoticeChange}
          title={t("volunteer.privacyNoticeTitle", "Privacy Notice:")}
          description="I confirm that I have read and understood the Privacy Notice."
          className="hover:bg-gray-50"
        />
      </section>

      {validationError && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-red-700">{validationError}</p>
        </div>
      )}

      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
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

      <p className="mt-6 text-center text-sm text-gray-500">
        By submitting this application, you acknowledge that you have read and
        understood Give Protocol&apos;s privacy policy and volunteer guidelines.
        Your data will be processed in accordance with applicable data
        protection regulations.
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
  const [internationalTransfers, setInternationalTransfers] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleAccept = useCallback(() => {
    // Validate required checkboxes
    if (!essentialProcessing) {
      setValidationError(t("volunteer.validation.essentialRequired", "Essential Processing consent is required to proceed"));
      return;
    }

    if (!ageConfirmation || !privacyNotice) {
      setValidationError(
        t("volunteer.validation.agePrivacyRequired", "You must confirm your age and that you have read the Privacy Notice"),
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
        validationError?.includes("Essential Processing")
      ) {
        setValidationError(null);
      }
    },
    [validationError],
  );

  const handleInternationalTransfersChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternationalTransfers(e.target.checked);
    },
    [],
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
        internationalTransfers={internationalTransfers}
        onInternationalTransfersChange={handleInternationalTransfersChange}
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
