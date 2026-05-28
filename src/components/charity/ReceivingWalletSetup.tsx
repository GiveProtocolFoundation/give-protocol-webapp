import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  Building2,
  AlertTriangle,
  Wallet,
  Plus,
  Trash2,
  Star,
  ExternalLink,
} from "lucide-react";
import { useCharityWallets } from "@/hooks/useCharityWallets";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getEVMChainConfig } from "@/config/chains/evm";
import type { CharityWallet, CharityWalletType } from "@/types/charityWallet";
import { SafeSetupFlow } from "./wallet-tiers/SafeSetupFlow";
import { InstitutionalSetupFlow } from "./wallet-tiers/InstitutionalSetupFlow";
import { SingleSignerFlow } from "./wallet-tiers/SingleSignerFlow";

/** Wallet type badge label and color. */
const TIER_CONFIG: Record<
  CharityWalletType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  safe: {
    label: "Multisig (Safe)",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: <Shield className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  institutional: {
    label: "Institutional Custody",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: <Building2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  eoa: {
    label: "Single Signer (EOA)",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

type SetupView = "chooser" | "safe" | "institutional" | "eoa";

interface ReceivingWalletSetupProps {
  /** The charity profile UUID. */
  charityProfileId: string;
}

/**
 * Three-path receiving wallet setup UI with state machine:
 * - No wallet: shows 3-path chooser
 * - Has wallets: wallet card list with type badge, signer info, "Add another" / "Replace primary"
 * @param props - Component props
 * @returns The wallet setup component
 */
export const ReceivingWalletSetup: React.FC<ReceivingWalletSetupProps> = ({
  charityProfileId,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { wallets, loading, error, fetchWallets, setPrimary, deleteWallet } =
    useCharityWallets();
  const [view, setView] = useState<SetupView>("chooser");

  useEffect(() => {
    fetchWallets(charityProfileId);
  }, [charityProfileId, fetchWallets]);

  const handleBackToList = useCallback(() => {
    setView("chooser");
  }, []);

  const handleWalletAdded = useCallback(
    (_wallet: CharityWallet) => {
      showToast(
        "success",
        t("wallet.setup.walletAdded", "Wallet registered successfully"),
      );
      setView("chooser");
      fetchWallets(charityProfileId);
    },
    [showToast, t, fetchWallets, charityProfileId],
  );

  const handleSetPrimary = useCallback(
    async (walletId: string) => {
      const ok = await setPrimary(walletId);
      if (ok) {
        showToast(
          "success",
          t("wallet.setup.primaryUpdated", "Primary wallet updated"),
        );
        fetchWallets(charityProfileId);
      } else {
        showToast(
          "error",
          t("wallet.setup.primaryFailed", "Failed to update primary wallet"),
        );
      }
    },
    [setPrimary, showToast, t, fetchWallets, charityProfileId],
  );

  const handleDelete = useCallback(
    async (walletId: string) => {
      const ok = await deleteWallet(walletId);
      if (ok) {
        showToast("success", t("wallet.setup.walletDeleted", "Wallet removed"));
        fetchWallets(charityProfileId);
      } else {
        showToast(
          "error",
          t("wallet.setup.deleteFailed", "Failed to remove wallet"),
        );
      }
    },
    [deleteWallet, showToast, t, fetchWallets, charityProfileId],
  );

  const handleChooseSafe = useCallback(() => {
    setView("safe");
  }, []);

  const handleChooseInstitutional = useCallback(() => {
    setView("institutional");
  }, []);

  const handleChooseEoa = useCallback(() => {
    setView("eoa");
  }, []);

  // Sub-flow views
  if (view === "safe") {
    return (
      <SafeSetupFlow
        charityProfileId={charityProfileId}
        onBack={handleBackToList}
        onComplete={handleWalletAdded}
      />
    );
  }

  if (view === "institutional") {
    return (
      <InstitutionalSetupFlow
        charityProfileId={charityProfileId}
        onBack={handleBackToList}
        onComplete={handleWalletAdded}
      />
    );
  }

  if (view === "eoa") {
    return (
      <SingleSignerFlow
        charityProfileId={charityProfileId}
        onBack={handleBackToList}
        onComplete={handleWalletAdded}
      />
    );
  }

  // Loading state
  if (loading && wallets.length === 0) {
    return (
      <div className="bg-surface-raised rounded-xl p-6 shadow-md animate-pulse">
        <div className="h-6 bg-surface-sunken rounded w-48 mb-4" />
        <div className="h-32 bg-surface-sunken rounded" />
      </div>
    );
  }

  // No wallets — show chooser
  if (wallets.length === 0) {
    return (
      <section
        className="bg-surface-raised rounded-xl p-6 shadow-md"
        aria-label={t("wallet.setup.title", "Set up your receiving wallet")}
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent-base" aria-hidden="true" />
            {t("wallet.setup.title", "Set up your receiving wallet")}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t(
              "wallet.setup.subtitle",
              "Choose how your charity will receive crypto donations. We recommend a multisig wallet for maximum security.",
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg">
            {error}
          </div>
        )}

        <WalletPathChooser
          onChooseSafe={handleChooseSafe}
          onChooseInstitutional={handleChooseInstitutional}
          onChooseEoa={handleChooseEoa}
        />
      </section>
    );
  }

  // Has wallets — show wallet list
  return (
    <section
      className="bg-surface-raised rounded-xl p-6 shadow-md"
      aria-label={t("wallet.setup.walletsTitle", "Receiving wallets")}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
          <Wallet className="h-5 w-5 text-accent-base" aria-hidden="true" />
          {t("wallet.setup.walletsTitle", "Receiving wallets")}
        </h2>
        <button
          onClick={handleChooseSafe}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-base hover:text-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("wallet.setup.addAnother", "Add another")}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </section>
  );
};

/** Three-path wallet type chooser cards. */
function WalletPathChooser({
  onChooseSafe,
  onChooseInstitutional,
  onChooseEoa,
}: {
  onChooseSafe: () => void;
  onChooseInstitutional: () => void;
  onChooseEoa: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Safe / Multisig — Recommended */}
      <button
        onClick={onChooseSafe}
        className="relative flex flex-col items-start text-left p-5 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors group"
      >
        <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
          {t("wallet.setup.recommended", "Recommended")}
        </span>
        <Shield
          className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-content-primary mb-1">
          {t("wallet.setup.safeTitle", "Multisig Safe")}
        </span>
        <span className="text-xs text-content-secondary leading-relaxed">
          {t(
            "wallet.setup.safeDesc",
            "Multiple signers required for every transaction. Highest security for organizational funds.",
          )}
        </span>
      </button>

      {/* Institutional Custody */}
      <button
        onClick={onChooseInstitutional}
        className="flex flex-col items-start text-left p-5 rounded-xl border-2 border-line-subtle dark:border-line-subtle/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
      >
        <Building2
          className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-content-primary mb-1">
          {t("wallet.setup.institutionalTitle", "Institutional Custody")}
        </span>
        <span className="text-xs text-content-secondary leading-relaxed">
          {t(
            "wallet.setup.institutionalDesc",
            "Managed by a qualified custodian (Fireblocks, Anchorage, etc.). Requires attestation document.",
          )}
        </span>
      </button>

      {/* Single Signer (EOA) */}
      <button
        onClick={onChooseEoa}
        className="flex flex-col items-start text-left p-5 rounded-xl border-2 border-line-subtle dark:border-line-subtle/30 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group"
      >
        <AlertTriangle
          className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-3"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-content-primary mb-1">
          {t("wallet.setup.eoaTitle", "Single Signer (EOA)")}
        </span>
        <span className="text-xs text-content-secondary leading-relaxed">
          {t(
            "wallet.setup.eoaDesc",
            "A standard wallet controlled by one private key. Simplest but least secure for organizational use.",
          )}
        </span>
      </button>
    </div>
  );
}

/** Display card for a registered wallet. */
function WalletCard({
  wallet,
  onSetPrimary,
  onDelete,
}: {
  wallet: CharityWallet;
  onSetPrimary: (_id: string) => void;
  onDelete: (_id: string) => void;
}) {
  const { t } = useTranslation();
  const tier = TIER_CONFIG[wallet.wallet_type];
  const chainConfig = getEVMChainConfig(wallet.chain_id);
  const chainName = chainConfig?.name ?? `Chain ${wallet.chain_id}`;

  const truncatedAddress = useMemo(
    () =>
      `${wallet.wallet_address.slice(0, 6)}\u2026${wallet.wallet_address.slice(-4)}`,
    [wallet.wallet_address],
  );

  const handleSetPrimary = useCallback(() => {
    onSetPrimary(wallet.id);
  }, [wallet.id, onSetPrimary]);

  const handleDelete = useCallback(() => {
    onDelete(wallet.id);
  }, [wallet.id, onDelete]);

  const explorerUrl = useMemo(() => {
    if (!chainConfig?.blockExplorerUrls?.[0]) return null;
    return `${chainConfig.blockExplorerUrls[0]}/address/${wallet.wallet_address}`;
  }, [chainConfig, wallet.wallet_address]);

  return (
    <li className="flex items-center gap-4 p-4 rounded-lg border border-line-subtle dark:border-line-subtle/20 bg-surface-base">
      <div className="flex-1 min-w-0">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mr-2 mb-1 ${tier.color}`}
        >
          {tier.icon}
          {tier.label}
        </span>
        {wallet.is_primary && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mr-2 mb-1 bg-accent-subtle/60 text-accent-base dark:bg-accent-subtle/30">
            <Star className="h-3 w-3" aria-hidden="true" />
            {t("wallet.setup.primary", "Primary")}
          </span>
        )}
        <span className="text-xs text-content-muted mb-1">{chainName}</span>
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-content-primary">
            {truncatedAddress}
          </code>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-muted hover:text-accent-base transition-colors"
              aria-label={t(
                "wallet.setup.viewExplorer",
                "View on block explorer",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {wallet.wallet_type === "safe" &&
          wallet.signer_count !== null &&
          wallet.signer_threshold !== null && (
            <p className="text-xs text-content-muted mt-1">
              {t("wallet.setup.safeSigners", "Signers")}:{" "}
              {wallet.signer_threshold}/{wallet.signer_count}
            </p>
          )}
        {wallet.wallet_type === "institutional" && wallet.custodian_name && (
          <p className="text-xs text-content-muted mt-1">
            {t("wallet.setup.custodian", "Custodian")}: {wallet.custodian_name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!wallet.is_primary && (
          <>
            <button
              onClick={handleSetPrimary}
              className="p-2 text-content-secondary hover:text-accent-base hover:bg-accent-subtle/30 rounded-lg transition-colors"
              title={t("wallet.setup.makePrimary", "Make primary")}
              aria-label={t("wallet.setup.makePrimary", "Make primary")}
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-content-secondary hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
              title={t("wallet.setup.remove", "Remove wallet")}
              aria-label={t("wallet.setup.remove", "Remove wallet")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
