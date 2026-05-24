import React, { useState, useCallback } from "react";
import { Heart, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DonationModal } from "@/components/web3/donation/DonationModal";
import { useTranslation } from "@/hooks/useTranslation";

interface DonateWidgetProps {
  ein: string;
  charityName: string;
  walletAddress: string | null | undefined;
  charityId: string;
  mode: "sidebar" | "modal";
  isVerified?: boolean;
  onClose?: () => void;
}

/**
 * Donation widget — a single "Donate" button that opens the full donation
 * modal (which handles crypto/fiat selection, amount, and wallet connection).
 * @param props - Component props
 * @returns The rendered donate widget
 */
export const DonateWidget: React.FC<DonateWidgetProps> = ({
  ein: _ein,
  charityName,
  walletAddress,
  charityId,
  mode,
  isVerified: _isVerified = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showDonationModal, setShowDonationModal] = useState(false);

  const handleDonate = useCallback(() => {
    setShowDonationModal(true);
  }, []);

  const handleCloseDonationModal = useCallback(() => {
    setShowDonationModal(false);
    onClose?.();
  }, [onClose]);

  const resolvedAddress = walletAddress ?? "";
  const hasWallet = Boolean(walletAddress);

  const body = (
    <div className="space-y-4">
      {!hasWallet && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {t(
              "charity.profile.donate.walletUnset",
              "This charity hasn't set up a wallet yet — your donation will be held by Give Protocol Foundation until claimed.",
            )}
          </p>
        </div>
      )}

      <Button
        fullWidth
        onClick={handleDonate}
        icon={<Heart className="h-4 w-4" />}
      >
        {t("browse.donate", "Donate")}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        {t(
          "charity.profile.donate.feeNote",
          "0% platform fee on direct donations. Network gas fees apply.",
        )}
      </p>
    </div>
  );

  return (
    <>
      {mode === "sidebar" ? (
        <Card hover={false} className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t("charity.profile.donate.support", "Support {{charityName}}", {
              charityName,
            })}
          </h3>
          {body}
        </Card>
      ) : (
        body
      )}

      {showDonationModal && (
        <DonationModal
          charityName={charityName}
          charityAddress={resolvedAddress}
          charityId={charityId}
          frequency="once"
          onClose={handleCloseDonationModal}
        />
      )}
    </>
  );
};
