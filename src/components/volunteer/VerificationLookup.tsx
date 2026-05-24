import React, { useState, useCallback } from "react";
import { Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useVolunteerVerification } from "@/hooks/useVolunteerVerification";
import { VolunteerVerificationCard } from "./VolunteerVerificationCard";
import { Logger } from "@/utils/logger";
import { VolunteerVerification } from "@/types/volunteer";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Form that looks up a volunteer verification record by its hash and renders the result.
 * @returns The lookup form and, when a record is found, the corresponding verification card.
 */
export const VerificationLookup: React.FC = () => {
  const [hash, setHash] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { getVerificationByHash, loading, error } = useVolunteerVerification();
  const [verification, setVerification] =
    useState<VolunteerVerification | null>(null);
  const { t } = useTranslation();

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!hash.trim()) return;

      try {
        const result = await getVerificationByHash(hash);
        setVerification(result);
        setSearchPerformed(true);
      } catch (err) {
        Logger.error("Verification lookup failed:", err);
      }
    },
    [hash, getVerificationByHash],
  );

  const handleHashChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHash(e.target.value);
    },
    [],
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t("volunteer.verifyContribution", "Verify Volunteer Contribution")}
      </h2>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-grow">
            <Input
              value={hash}
              onChange={handleHashChange}
              placeholder={t(
                "volunteer.hashPlaceholder",
                "Enter verification hash",
              )}
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !hash.trim()}
            className="whitespace-nowrap"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading
              ? t("volunteer.searching", "Searching...")
              : t("volunteer.verifyHash", "Verify Hash")}
          </Button>
        </div>
      </form>

      {searchPerformed && (
        <div className="mt-6">
          {verification ? (
            <VolunteerVerificationCard
              verification={{
                id: verification.id,
                applicantName:
                  verification.profiles?.name ||
                  t("volunteer.unknown", "Unknown Volunteer"),
                opportunityTitle:
                  verification.volunteer_opportunities?.title ||
                  t("volunteer.unknownOpportunity", "Unknown Opportunity"),
                charityName:
                  verification.volunteer_opportunities?.charity_details?.name ||
                  t("volunteer.unknownOrganization", "Unknown Organization"),
                acceptanceHash: verification.acceptanceHash,
                verificationHash: verification.verificationHash,
                acceptedAt: verification.acceptedAt,
                verifiedAt: verification.verifiedAt,
                blockchainReference: verification.blockchainReference,
              }}
            />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  {t(
                    "volunteer.verificationNotFound",
                    "Verification Not Found",
                  )}
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {t(
                    "volunteer.verificationNotFoundMessage",
                    "The hash you provided could not be found in our records. Please check the hash and try again.",
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};
