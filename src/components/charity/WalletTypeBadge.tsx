import React, { useState, useCallback } from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { CharityWalletType } from "@/types/charityWallet";

interface WalletTypeBadgeProps {
  /** Wallet tier classification. */
  walletType: CharityWalletType;
  /** Safe multisig approval threshold. Required when walletType='safe'. */
  signerThreshold?: number | null;
  /** Total Safe multisig signers. Required when walletType='safe'. */
  signerCount?: number | null;
  /** Custodian name for institutional wallets. Required when walletType='institutional'. */
  custodianName?: string | null;
}

/**
 * Display-only badge showing the wallet type for Safe and Institutional wallets.
 * EOA wallets intentionally render nothing.
 * @param props - Component props
 * @returns The rendered badge or null for EOA
 */
export const WalletTypeBadge: React.FC<WalletTypeBadgeProps> = ({
  walletType,
  signerThreshold,
  signerCount,
  custodianName,
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleTap = useCallback(() => {
    setShowTooltip((prev) => !prev);
  }, []);

  if (walletType === "eoa") return null;

  if (walletType === "safe") {
    const label = t(
      "charity.walletBadge.safeLabel",
      "Multisig treasury · {{threshold}}-of-{{count}} signers",
      { threshold: signerThreshold ?? 0, count: signerCount ?? 0 },
    );
    const tooltip = t(
      "charity.walletBadge.safeTooltip",
      "Donations go to a multi-signature wallet requiring multiple approvals before funds can move.",
    );

    return (
      <div
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        role="status"
        aria-label={label}
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-help">
          <CheckCircle className="h-3.5 w-3.5" />
          {label}
        </span>
        {showTooltip && (
          <div
            className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-xs p-2.5 shadow-lg"
            role="tooltip"
          >
            {tooltip}
          </div>
        )}
      </div>
    );
  }

  if (walletType === "institutional") {
    const label = t(
      "charity.walletBadge.institutionalLabel",
      "Held at {{custodianName}}",
      { custodianName: custodianName ?? "Custodian" },
    );
    const tooltip = t(
      "charity.walletBadge.institutionalTooltip",
      "Donations go to a wallet held by a qualified institutional custodian.",
    );

    return (
      <div
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        role="status"
        aria-label={label}
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 cursor-help">
          <ShieldCheck className="h-3.5 w-3.5" />
          {label}
        </span>
        {showTooltip && (
          <div
            className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-xs p-2.5 shadow-lg"
            role="tooltip"
          >
            {tooltip}
          </div>
        )}
      </div>
    );
  }

  return null;
};
