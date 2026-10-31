import React, { useState, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  FileText,
  PenTool,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SignaturePad } from "./SignaturePad";
import {
  useCfiaAcceptance,
  CFIA_CURRENT_VERSION,
} from "@/hooks/useCfiaAcceptance";

interface CfiaAcceptanceModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** The charity profile UUID */
  charityProfileId: string;
  /** Pre-filled signer name (from charity profile authorized_signer_name) */
  defaultSignerName?: string;
  /** Pre-filled signer email */
  defaultSignerEmail?: string;
  /** Pre-filled signer title */
  defaultSignerTitle?: string;
  /** Called after a successful acceptance */
  onAccepted?: () => void;
}

/**
 * Modal that walks the authorized signer through the CFIA acceptance flow:
 * 1. Review the legal text (placeholder until finalized)
 * 2. Confirm signer identity
 * 3. Draw signature
 * 4. Submit
 *
 * @param props - CfiaAcceptanceModalProps
 * @returns The CFIA acceptance modal element
 */
export const CfiaAcceptanceModal: React.FC<CfiaAcceptanceModalProps> = ({
  isOpen,
  onClose,
  charityProfileId,
  defaultSignerName = "",
  defaultSignerEmail = "",
  defaultSignerTitle = "",
  onAccepted,
}) => {
  const { t } = useTranslation();
  const {
    flowState,
    acceptance,
    submit,
    proceedToSigning,
    backToReviewing,
    errorMessage,
  } = useCfiaAcceptance(charityProfileId);

  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [signatureData, setSignatureData] = useState("");
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const canProceedToSign = useMemo(
    () => hasScrolledToEnd,
    [hasScrolledToEnd],
  );

  const canSubmit = useMemo(
    () =>
      signerName.trim().length > 0 &&
      signerTitle.trim().length > 0 &&
      signerEmail.trim().length > 0 &&
      signatureData.length > 0,
    [signerName, signerTitle, signerEmail, signatureData],
  );

  /** Tracks scroll position in the legal text container. */
  const handleLegalScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (hasScrolledToEnd) return;
      const el = e.currentTarget;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      if (atBottom) {
        setHasScrolledToEnd(true);
      }
    },
    [hasScrolledToEnd],
  );

  const handleProceedToSigning = useCallback(() => {
    proceedToSigning();
  }, [proceedToSigning]);

  const handleBackToReviewing = useCallback(() => {
    backToReviewing();
  }, [backToReviewing]);

  const handleSignerNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignerName(e.target.value);
    },
    [],
  );

  const handleSignerTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignerTitle(e.target.value);
    },
    [],
  );

  const handleSignerEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignerEmail(e.target.value);
    },
    [],
  );

  const handleSignatureChange = useCallback((dataUri: string) => {
    setSignatureData(dataUri);
  }, []);

  const handleSubmit = useCallback(async () => {
    const success = await submit({
      signerName: signerName.trim(),
      signerTitle: signerTitle.trim(),
      signerEmail: signerEmail.trim(),
      signatureData,
    });
    if (success) {
      onAccepted?.();
    }
  }, [submit, signerName, signerTitle, signerEmail, signatureData, onAccepted]);

  const handleCloseAfterAccepted = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("cfia.modal.title", "Charitable Fundraising Industry Agreement")}
      size="lg"
      closeOnBackdrop={false}
    >
      {flowState === "loading" && <LoadingView />}
      {(flowState === "pending" || flowState === "reviewing") && (
        <ReviewStep
          hasScrolledToEnd={canProceedToSign}
          onScroll={handleLegalScroll}
          onProceed={handleProceedToSigning}
        />
      )}
      {flowState === "signing" && (
        <SigningStep
          signerName={signerName}
          signerTitle={signerTitle}
          signerEmail={signerEmail}
          onSignerNameChange={handleSignerNameChange}
          onSignerTitleChange={handleSignerTitleChange}
          onSignerEmailChange={handleSignerEmailChange}
          onSignatureChange={handleSignatureChange}
          canSubmit={canSubmit}
          onBack={handleBackToReviewing}
          onSubmit={handleSubmit}
        />
      )}
      {flowState === "submitting" && <SubmittingView />}
      {flowState === "accepted" && (
        <AcceptedView
          acceptance={acceptance}
          onClose={handleCloseAfterAccepted}
        />
      )}
      {flowState === "error" && (
        <ErrorView
          message={errorMessage}
          onRetry={handleBackToReviewing}
        />
      )}
    </Modal>
  );
};

/** Spinner shown while checking for an existing acceptance. */
function LoadingView() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2
        className="h-8 w-8 text-emerald-600 animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("cfia.modal.loading", "Loading agreement status...")}
      </p>
    </div>
  );
}

/** Step 1: Read the CFIA legal text. Must scroll to bottom before proceeding. */
function ReviewStep({
  hasScrolledToEnd,
  onScroll,
  onProceed,
}: {
  hasScrolledToEnd: boolean;
  onScroll: (_e: React.UIEvent<HTMLDivElement>) => void;
  onProceed: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t(
          "cfia.modal.reviewIntro",
          "Please read the agreement below in full. You must scroll to the end before proceeding.",
        )}
      </p>
      <div
        className="h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50"
        onScroll={onScroll}
      >
        <LegalTextPlaceholder />
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>
          {t("cfia.modal.version", "Version: {{version}}", {
            version: CFIA_CURRENT_VERSION,
          })}
        </span>
      </div>
      <Button
        onClick={onProceed}
        disabled={!hasScrolledToEnd}
        fullWidth
      >
        {hasScrolledToEnd
          ? t("cfia.modal.proceedToSign", "I have read the agreement - proceed to sign")
          : t("cfia.modal.scrollToEnd", "Scroll to the end to continue")}
      </Button>
    </div>
  );
}

/** Step 2: Capture signer identity + drawn signature. */
function SigningStep({
  signerName,
  signerTitle,
  signerEmail,
  onSignerNameChange,
  onSignerTitleChange,
  onSignerEmailChange,
  onSignatureChange,
  canSubmit,
  onBack,
  onSubmit,
}: {
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  onSignerNameChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignerTitleChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignerEmailChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignatureChange: (_dataUri: string) => void;
  canSubmit: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t(
          "cfia.modal.signingIntro",
          "Confirm your identity as the authorized signer and provide your signature below.",
        )}
      </p>

      {/* Signer identity fields */}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">
          {t("cfia.modal.signerLegend", "Authorized signer details")}
        </legend>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("cfia.modal.signerName", "Full name")}
          </span>
          <input
            type="text"
            value={signerName}
            onChange={onSignerNameChange}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t("cfia.modal.signerNamePlaceholder", "Jane Smith")}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("cfia.modal.signerTitle", "Title / Role")}
          </span>
          <input
            type="text"
            value={signerTitle}
            onChange={onSignerTitleChange}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t(
              "cfia.modal.signerTitlePlaceholder",
              "Executive Director",
            )}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("cfia.modal.signerEmail", "Email")}
          </span>
          <input
            type="email"
            value={signerEmail}
            onChange={onSignerEmailChange}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t(
              "cfia.modal.signerEmailPlaceholder",
              "jane@example.org",
            )}
            required
          />
        </label>
      </fieldset>

      {/* Signature capture */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
          {t("cfia.modal.signatureLabel", "Signature")}
        </span>
        <SignaturePad onSignatureChange={onSignatureChange} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack}>
          {t("cfia.modal.back", "Back")}
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit} fullWidth>
          {t("cfia.modal.submit", "Accept and Sign")}
        </Button>
      </div>
    </div>
  );
}

/** Spinner shown during submission. */
function SubmittingView() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2
        className="h-8 w-8 text-emerald-600 animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("cfia.modal.submitting", "Recording your acceptance...")}
      </p>
    </div>
  );
}

/** Success state — shows confirmation details. */
function AcceptedView({
  acceptance,
  onClose,
}: {
  acceptance: { signer_name: string; accepted_at: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <CheckCircle2
        className="h-12 w-12 text-emerald-600"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("cfia.modal.acceptedTitle", "Agreement Accepted")}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
        {t(
          "cfia.modal.acceptedBody",
          "The Charitable Fundraising Industry Agreement has been accepted by {{name}} on {{date}}.",
          {
            name: acceptance?.signer_name ?? "",
            date: acceptance?.accepted_at
              ? new Date(acceptance.accepted_at).toLocaleDateString()
              : "",
          },
        )}
      </p>
      <Button onClick={onClose}>
        {t("cfia.modal.close", "Close")}
      </Button>
    </div>
  );
}

/** Error state with retry option. */
function ErrorView({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <AlertCircle
        className="h-12 w-12 text-red-500"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("cfia.modal.errorTitle", "Something went wrong")}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
        {message ??
          t("cfia.modal.errorDefault", "An error occurred. Please try again.")}
      </p>
      <Button onClick={onRetry}>
        {t("cfia.modal.retry", "Try Again")}
      </Button>
    </div>
  );
}

/**
 * Placeholder for the CFIA legal text.
 * This will be replaced with the actual finalized legal text
 * once the legal-drafting session delivers it.
 */
function LegalTextPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">
        {t(
          "cfia.legalText.title",
          "Charitable Fundraising Industry Agreement",
        )}
      </h3>
      <p className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs font-medium">
        {t(
          "cfia.legalText.draftNotice",
          "This is a placeholder. The final legal text has not yet been delivered. This agreement cannot be activated until the legal text is finalized.",
        )}
      </p>
      <p>
        {t(
          "cfia.legalText.placeholder1",
          "This Charitable Fundraising Industry Agreement (the \"Agreement\") is entered into between Give Protocol Foundation (\"Platform\") and the undersigned charitable organization (\"Charity\").",
        )}
      </p>
      <p>
        {t(
          "cfia.legalText.placeholder2",
          "By signing below, the Charity acknowledges and agrees to the terms and conditions governing the use of the Give Protocol platform for the purpose of receiving charitable donations.",
        )}
      </p>
      <p>
        {t(
          "cfia.legalText.placeholder3",
          "[Full legal text will be inserted here upon finalization by legal counsel. Sections will cover: platform obligations, charity obligations, fee structure, data handling, dispute resolution, termination, and governing law.]",
        )}
      </p>
      <p className="text-xs text-gray-400 italic">
        {t(
          "cfia.legalText.endMarker",
          "--- End of agreement text ---",
        )}
      </p>
    </div>
  );
}
