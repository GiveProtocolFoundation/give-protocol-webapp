import React from "react";
import {
  CheckCircle,
  Clock,
  Calendar,
  User,
  Building,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/utils/date";
import { useTranslation } from "@/hooks/useTranslation";

interface VolunteerVerificationCardProps {
  verification: {
    id: string;
    applicantName?: string;
    opportunityTitle?: string;
    charityName?: string;
    acceptanceHash?: string;
    verificationHash?: string;
    acceptedAt?: string;
    verifiedAt?: string;
    blockchainReference?: {
      network: string;
      transactionId: string;
      blockNumber: number;
    };
  };
}

/** Card displaying volunteer verification details with blockchain transaction links. */
export const VolunteerVerificationCard: React.FC<
  VolunteerVerificationCardProps
> = ({ verification }) => {
  const { t } = useTranslation();

  /** Returns the block explorer URL for a given transaction ID and network. */
  const getExplorerUrl = (txId: string, network = "moonbase") => {
    const explorers = {
      moonbase: "https://moonbase.moonscan.io/tx/",
      moonbeam: "https://moonscan.io/tx/",
      polkadot: "https://polkadot.subscan.io/extrinsic/",
    };

    return `${explorers[network as keyof typeof explorers] || explorers.moonbase}${txId}`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">
          {t(
            "volunteer.contributionVerification",
            "Volunteer Contribution Verification",
          )}
        </h3>
      </div>

      <div className="space-y-4">
        {verification.applicantName && (
          <dl className="flex items-start">
            <User className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
            <dt className="text-sm font-medium text-gray-500">
              {t("volunteer.volunteerLabel", "Volunteer")}
              <dd className="text-base text-gray-900 mt-1">
                {verification.applicantName}
              </dd>
            </dt>
          </dl>
        )}

        {verification.opportunityTitle && (
          <dl className="flex items-start">
            <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
            <dt className="text-sm font-medium text-gray-500">
              {t("volunteer.opportunityLabel", "Opportunity")}
              <dd className="text-base text-gray-900 mt-1">
                {verification.opportunityTitle}
              </dd>
            </dt>
          </dl>
        )}

        {verification.charityName && (
          <dl className="flex items-start">
            <Building className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
            <dt className="text-sm font-medium text-gray-500">
              {t("volunteer.organizationLabel", "Organization")}
              <dd className="text-base text-gray-900 mt-1">
                {verification.charityName}
              </dd>
            </dt>
          </dl>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verification.acceptedAt && (
            <dl className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <dt className="text-sm font-medium text-gray-500">
                {t("volunteer.acceptedOn", "Accepted On")}
                <dd className="text-base text-gray-900 mt-1">
                  {formatDate(verification.acceptedAt, true)}
                </dd>
              </dt>
            </dl>
          )}

          {verification.verifiedAt && (
            <dl className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <dt className="text-sm font-medium text-gray-500">
                {t("volunteer.verifiedOn", "Verified On")}
                <dd className="text-base text-gray-900 mt-1">
                  {formatDate(verification.verifiedAt, true)}
                </dd>
              </dt>
            </dl>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            {t("volunteer.verificationHashes", "Verification Hashes")}
          </h4>

          {verification.acceptanceHash && (
            <div className="mb-2">
              <p className="text-xs text-gray-500">
                {t("volunteer.acceptanceHash", "Acceptance Hash")}
              </p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {verification.acceptanceHash}
              </p>
            </div>
          )}

          {verification.verificationHash && (
            <div className="mb-2">
              <p className="text-xs text-gray-500">
                {t("volunteer.verificationHash", "Verification Hash")}
              </p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {verification.verificationHash}
              </p>
            </div>
          )}

          {verification.blockchainReference && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                {t("volunteer.blockchainReference", "Blockchain Reference")}
              </p>
              <div className="flex items-center mt-1">
                <a
                  href={getExplorerUrl(
                    verification.blockchainReference.transactionId,
                    verification.blockchainReference.network,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center"
                >
                  <span className="font-mono mr-1">
                    {verification.blockchainReference.transactionId.substring(
                      0,
                      10,
                    )}
                    ...
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-gray-500 ml-2">
                  {t("blockchain.block", "Block")} #
                  {verification.blockchainReference.blockNumber}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
