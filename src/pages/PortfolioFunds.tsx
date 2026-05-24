import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  usePortfolioFunds,
  PortfolioFund,
} from "../hooks/web3/usePortfolioFunds";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { Heart, Users, AlertCircle } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface DonationModalProps {
  fund: PortfolioFund;
  onClose: () => void;
  onSuccess: () => void;
}

/** Radio button selector for choosing between native and token donation types. */
const DonationTypeSelector: React.FC<{
  donationType: "native" | "token";
  onSelectNative: () => void;
  onSelectToken: () => void;
}> = ({ donationType, onSelectNative, onSelectToken }) => {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700 mb-2">
        {t("portfolio.donationType", "Donation Type")}
      </legend>
      <div className="flex gap-2" role="radiogroup">
        <label
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium cursor-pointer text-center ${
            donationType === "native"
              ? "bg-blue-600 text-gray-900"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <input
            type="radio"
            name="donationType"
            value="native"
            checked={donationType === "native"}
            onChange={onSelectNative}
            className="sr-only"
          />
          <span>{t("portfolio.devNative", "DEV (Native)")}</span>
        </label>
        <label
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium cursor-pointer text-center ${
            donationType === "token"
              ? "bg-blue-600 text-gray-900"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <input
            type="radio"
            name="donationType"
            value="token"
            checked={donationType === "token"}
            onChange={onSelectToken}
            className="sr-only"
          />
          <span>{t("portfolio.testToken", "TEST Token")}</span>
        </label>
      </div>
    </fieldset>
  );
};

/** Breakdown summary showing donation amount, platform fee, and per-charity share. */
const DonationSummary: React.FC<{
  amount: string;
  fee: string;
  net: string;
  donationType: "native" | "token";
  platformFee: number;
  charityCount: number;
}> = ({ amount, fee, net, donationType, platformFee, charityCount }) => {
  const { t } = useTranslation();
  const tokenLabel = donationType === "native" ? "DEV" : "TEST";
  return (
    <div className="mb-4 bg-gray-50 p-3 rounded-md text-sm">
      <div className="flex justify-between">
        <span>{t("portfolio.donationAmount", "Donation Amount:")}</span>
        <span>
          {amount} {tokenLabel}
        </span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>
          {t("portfolio.platformFee", "Platform Fee ({{percentage}}%):", {
            percentage: platformFee / 100,
          })}
        </span>
        <span>
          {fee} {tokenLabel}
        </span>
      </div>
      <div className="flex justify-between font-medium border-t pt-1">
        <span>{t("portfolio.toCharities", "To Charities:")}</span>
        <span>
          {net} {tokenLabel}
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        {t("portfolio.eachCharityReceives", "Each charity receives:")}{" "}
        {(Number.parseFloat(net) / charityCount).toFixed(6)} {tokenLabel}
      </div>
    </div>
  );
};

/** Modal for donating to a portfolio fund with native or token currency */
const DonationModal: React.FC<DonationModalProps> = ({
  fund,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [donationType, setDonationType] = useState<"native" | "token">(
    "native",
  );
  const { donateToFund, donateNativeToFund, loading, getPlatformFee } =
    usePortfolioFunds();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [platformFee, setPlatformFee] = useState(100); // 1% default

  useEffect(() => {
    /** Fetch the current platform fee percentage from the contract */
    const loadPlatformFee = async () => {
      const fee = await getPlatformFee();
      setPlatformFee(fee);
    };
    loadPlatformFee();
  }, [getPlatformFee]);

  const handleDonation = useCallback(async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showToast(
        "error",
        t("portfolio.invalidAmount", "Please enter a valid amount"),
      );
      return;
    }

    try {
      if (donationType === "native") {
        await donateNativeToFund(fund.id, amount);
      } else {
        // For token donations, you would need the token contract address
        // This is a placeholder - replace with actual token address
        const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Your MockERC20
        await donateToFund(fund.id, tokenAddress, amount);
      }

      showToast(
        "success",
        t("portfolio.donationSuccess", "Donation successful!"),
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Donation failed:", error);
      showToast(
        "error",
        t("portfolio.donationFailed", "Donation failed. Please try again."),
      );
    }
  }, [
    amount,
    donationType,
    fund.id,
    donateToFund,
    donateNativeToFund,
    showToast,
    t,
    onSuccess,
    onClose,
  ]);

  /** Calculate the platform fee and net amount for the current donation */
  const calculateFee = () => {
    if (!amount) return { fee: "0", net: "0" };
    const donationAmount = Number.parseFloat(amount);
    const feeAmount = (donationAmount * platformFee) / 10000;
    const netAmount = donationAmount - feeAmount;
    return {
      fee: feeAmount.toFixed(6),
      net: netAmount.toFixed(6),
    };
  };

  const { fee, net } = calculateFee();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  const handleSetDonationTypeNative = useCallback(() => {
    setDonationType("native");
  }, []);

  const handleSetDonationTypeToken = useCallback(() => {
    setDonationType("token");
  }, []);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
    },
    [],
  );

  return (
    <>
      <button
        className="fixed inset-0 bg-black bg-opacity-50 z-50 cursor-pointer border-none p-0 m-0"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        aria-label="Close modal overlay"
        type="button"
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl max-w-md w-[95%] z-50 p-6">
        <h2 className="text-2xl font-bold mb-4">
          {t("portfolio.donateToFund", "Donate to {{name}}", {
            name: fund.name,
          })}
        </h2>

        <p className="text-gray-600 text-sm mb-4">{fund.description}</p>
        <p className="text-sm text-blue-800 bg-blue-50 p-3 rounded-lg mb-4">
          <strong>
            {t("portfolio.equalDistribution", "Equal Distribution")}:
          </strong>{" "}
          {t(
            "portfolio.equalDistributionNote",
            "Your donation will be split equally among {{count}} verified charities.",
            { count: fund.charities.length },
          )}
        </p>

        <DonationTypeSelector
          donationType={donationType}
          onSelectNative={handleSetDonationTypeNative}
          onSelectToken={handleSetDonationTypeToken}
        />

        <label
          htmlFor="donation-amount"
          className="block text-sm font-medium text-gray-700 mb-1 mt-4"
        >
          {t("portfolio.amountLabel", "Amount ({{currency}})", {
            currency: donationType === "native" ? "DEV" : "TEST",
          })}
        </label>
        <input
          id="donation-amount"
          type="number"
          value={amount}
          onChange={handleAmountChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-4"
          placeholder="0.0"
          step="0.001"
          min="0"
        />

        {amount && (
          <DonationSummary
            amount={amount}
            fee={fee}
            net={net}
            donationType={donationType}
            platformFee={platformFee}
            charityCount={fund.charities.length}
          />
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleDonation}
            className="flex-1"
            disabled={loading || !amount || Number.parseFloat(amount) <= 0}
          >
            {loading
              ? t("common.processing", "Processing...")
              : t("common.donate", "Donate")}
          </Button>
        </div>
      </div>
    </>
  );
};

/** Distribution info banner showing how donations are split among charities. */
const DistributionInfo: React.FC<{ charityCount: number }> = ({
  charityCount,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-start">
      <AlertCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
      <div className="text-sm">
        <p className="text-blue-800 font-medium">
          {t("portfolio.equalDistribution", "Equal Distribution")}
        </p>
        <p className="text-blue-700">
          {t(
            "portfolio.eachCharityPercentage",
            "Each charity receives {{percentage}}% of donations",
            { percentage: 100 / charityCount },
          )}
        </p>
      </div>
    </div>
  );
};

/** Card displaying a single portfolio fund with description and donate button. */
const FundCard: React.FC<{ fund: PortfolioFund; onDonate: () => void }> = ({
  fund,
  onDonate,
}) => {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{fund.name}</h3>
        <span className="flex items-center text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
          <Heart className="h-3 w-3 mr-1" />
          {t("common.active", "Active")}
        </span>
      </div>
      <p className="text-gray-600 mb-4 text-sm leading-relaxed">
        {fund.description}
      </p>
      <p className="flex items-center text-sm text-gray-500 mb-3">
        <Users className="h-4 w-4 mr-2" />
        {t("portfolio.verifiedCharities", "{{count}} Verified Charities", {
          count: fund.charities.length,
        })}
      </p>
      <DistributionInfo charityCount={fund.charities.length} />
      <Button
        onClick={onDonate}
        className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
      >
        {t("portfolio.donateToFundButton", "Donate to Fund")}
      </Button>
    </Card>
  );
};

/** Page listing all portfolio funds with donation functionality */
const PortfolioFunds: React.FC = () => {
  const [funds, setFunds] = useState<PortfolioFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<PortfolioFund | null>(null);
  const { getAllFunds } = usePortfolioFunds();
  const { t } = useTranslation();

  const loadFunds = useCallback(async () => {
    setLoading(true);
    try {
      const allFunds = await getAllFunds();
      setFunds(allFunds);
    } catch (error) {
      console.error("Failed to load funds:", error);
    } finally {
      setLoading(false);
    }
  }, [getAllFunds]);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  const handleDonateClick = useCallback((fund: PortfolioFund) => {
    setSelectedFund(fund);
  }, []);

  const handleDonationSuccess = useCallback(() => {
    loadFunds(); // Refresh funds after successful donation
  }, [loadFunds]);

  const createDonateHandler = useCallback(
    (fund: PortfolioFund) => {
      return () => handleDonateClick(fund);
    },
    [handleDonateClick],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedFund(null);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div
              key="skeleton-fund-1"
              className="h-64 bg-gray-200 rounded-lg"
            />
            <div
              key="skeleton-fund-2"
              className="h-64 bg-gray-200 rounded-lg"
            />
            <div
              key="skeleton-fund-3"
              className="h-64 bg-gray-200 rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t("portfolio.title", "Portfolio Funds")}
          </h1>
        </div>

        <ScrollReveal direction="up" delay={100}>
          <p className="text-lg text-gray-600 max-w-3xl">
            {t(
              "portfolio.description",
              "Donate to curated groups of verified charities with equal distribution. Each fund focuses on a specific cause area with maximum impact.",
            )}
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={200}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {funds.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                onDonate={createDonateHandler(fund)}
              />
            ))}
          </div>
        </ScrollReveal>

        {funds.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">
              {t("portfolio.noFundsAvailable", "No portfolio funds available")}
            </p>
            <p className="text-sm">
              {t(
                "portfolio.checkBackLater",
                "Check back later for new funding opportunities",
              )}
            </p>
          </div>
        )}
      </div>

      {selectedFund && (
        <DonationModal
          fund={selectedFund}
          onClose={handleCloseModal}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
};

export default PortfolioFunds;
