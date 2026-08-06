import React, { useState, useCallback } from "react";
import { CheckCircle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVolunteerVerification } from "@/hooks/useVolunteerVerification";
import { useTranslation } from "@/hooks/useTranslation";
import { Logger } from "@/utils/logger";

interface ApplicationAcceptanceProps {
  applicationId: string;
  applicantName: string;
  opportunityTitle: string;
  onAccepted?: (_hash: string) => void;
}

/** Panel for charity admins to accept a volunteer application and record it on-chain. */
export const ApplicationAcceptance: React.FC<ApplicationAcceptanceProps> = ({
  applicationId,
  applicantName,
  opportunityTitle,
  onAccepted,
}) => {
  const { acceptApplication, loading, error } = useVolunteerVerification();
  const [acceptanceHash, setAcceptanceHash] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const { t } = useTranslation();

  const handleAccept = useCallback(async () => {
    try {
      const hash = await acceptApplication(applicationId);
      if (hash) {
        setAcceptanceHash(hash);
        setIsAccepted(true);
        onAccepted?.(hash);
      }
    } catch (err) {
      Logger.error("Acceptance failed:", err);
    }
  }, [acceptApplication, applicationId, onAccepted]);

  const handleReject = useCallback(() => {
    // Rejection logic placeholder
    // Full implementation pending rejection workflow
  }, []);

  if (isAccepted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-green-800">
            {t("volunteer.applicationAccepted", "Application Accepted")}
          </h3>
        </div>
        <p className="text-sm text-green-700 mb-3">
          {t(
            "volunteer.applicationRecorded",
            "The volunteer application has been accepted and recorded on the blockchain.",
          )}
        </p>
        {acceptanceHash && (
          <div className="bg-white p-3 rounded border border-green-200">
            <p className="text-xs text-gray-500 mb-1">
              {t("volunteer.acceptanceHash", "Acceptance Hash")}
            </p>
            <div className="flex items-center">
              <code className="text-xs font-mono text-gray-800 break-all">
                {acceptanceHash}
              </code>
              <a
                href={`https://basescan.org/tx/${acceptanceHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-emerald-600 hover:text-emerald-800"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{applicantName}</h3>
          <p className="text-sm text-gray-500">
            {t("volunteer.appliedFor")}: {opportunityTitle}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading
              ? t("volunteer.processing", "Processing...")
              : t("volunteer.accept")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleReject}
            className="flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            {t("volunteer.reject")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};
