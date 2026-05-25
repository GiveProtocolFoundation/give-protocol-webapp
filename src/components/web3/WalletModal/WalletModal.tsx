/**
 * WalletModal - Main wallet connection modal.
 * Two-step flow: Step 1 is network selection, Step 2 is wallet provider selection.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { ChainType, UnifiedWalletProvider } from "@/types/wallet";
import type { ChainId, ChainConfig } from "@/contexts/ChainContext";
import { useChain } from "@/contexts/ChainContext";
import { WalletOption } from "./WalletOption";
import { NetworkGrid } from "../NetworkGrid";
import { Portal } from "@/components/ui/Portal";
import { Logger } from "@/utils/logger";

/** Two-step modal flow: network selection then wallet selection. */
type ModalStep = "network" | "wallet";

/** Chain type tab configuration. */
const CHAIN_TABS: { type: ChainType; label: string; activeClass: string }[] = [
  { type: "evm", label: "EVM", activeClass: "bg-blue-600 text-white" },
  { type: "solana", label: "Solana", activeClass: "bg-emerald-600 text-white" },
  {
    type: "polkadot",
    label: "Polkadot",
    activeClass: "bg-pink-600 text-white",
  },
];

/** Network selection step dialog content. */
const NetworkDialogContent: React.FC<{
  chains: ChainConfig[];
  selectedNetworkId: ChainId | null;
  onNetworkSelect: (_e: React.MouseEvent<HTMLButtonElement>) => void;
  onContinue: () => void;
  onClose: () => void;
}> = ({ chains, selectedNetworkId, onNetworkSelect, onContinue, onClose }) => {
  const { t } = useTranslation();
  return (
    <dialog
      open
      className="relative w-full max-w-md mx-4 bg-white/80 backdrop-blur-[10px] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-white/30"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
        <h3
          id="wallet-modal-title"
          className="text-lg font-semibold text-gray-900"
        >
          {t("modal.network.title")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          aria-label={t("modal.close")}
        >
          &times;
        </button>
      </div>

      {/* Network Stack */}
      <div className="px-4 py-4">
        <NetworkGrid
          chains={chains}
          selectedChainId={selectedNetworkId}
          onChainSelect={onNetworkSelect}
          comingSoonCount={0}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200/50">
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedNetworkId === null}
          className="w-full px-8 py-3 bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {t("modal.network.nextStep")}
        </button>
        <div className="mt-3 text-center">
          <a
            href="/network-selection"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t("modal.network.learnMore")}
          </a>
        </div>
      </div>
    </dialog>
  );
};

/** Dialog content for wallet modal with chain tabs, wallet list, and footer. */
const WalletDialogContent: React.FC<{
  selectedChainType: ChainType;
  onChainTabClick: (_e: React.MouseEvent<HTMLButtonElement>) => void;
  onBack: () => void;
  onClose: () => void;
  isConnecting: boolean;
  error: string | null;
  filteredWallets: UnifiedWalletProvider[];
  connectingWallet: string | null;
  onSelectWallet: (_wallet: UnifiedWalletProvider) => void;
}> = ({
  selectedChainType,
  onChainTabClick,
  onBack,
  onClose,
  isConnecting,
  error,
  filteredWallets,
  connectingWallet,
  onSelectWallet,
}) => {
  const { t } = useTranslation();
  return (
    <dialog
      open
      className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t("modal.connect.backAria")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3
            id="wallet-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t("modal.connect.title")}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isConnecting}
          className="p-1 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 text-xl leading-none"
          aria-label={t("modal.close")}
        >
          &times;
        </button>
      </div>

      {/* Chain Type Tabs */}
      <div
        className="flex px-6 pt-4 gap-2"
        role="tablist"
        aria-label={t("modal.connect.chainTypeAria")}
      >
        {CHAIN_TABS.map(({ type, label, activeClass }) => (
          <button
            key={type}
            role="tab"
            aria-selected={selectedChainType === type}
            data-chain-type={type}
            onClick={onChainTabClick}
            className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-colors
            ${
              selectedChainType === type
                ? activeClass
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error !== null && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Unified Wallet List */}
      <div className="px-3 py-4 max-h-96 overflow-y-auto space-y-1" role="menu">
        {filteredWallets.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            {t("modal.connect.noWallets", {
              chainType: selectedChainType.toUpperCase(),
            })}
            <span className="block text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t("modal.connect.tryDifferentChain")}
            </span>
          </p>
        ) : (
          filteredWallets.map((wallet) => (
            <WalletOption
              key={wallet.name}
              wallet={wallet}
              selectedChainType={selectedChainType}
              isConnecting={isConnecting}
              connectingWallet={connectingWallet}
              onSelect={onSelectWallet}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl text-center space-y-2">
        <a
          href="https://ethereum.org/en/wallets/find-wallet/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t("modal.connect.viewOtherWallets")}
        </a>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t("modal.connect.termsAgreement")}{" "}
          <a
            href="/terms"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t("modal.connect.termsLink")}
          </a>
        </p>
      </div>
    </dialog>
  );
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: UnifiedWalletProvider[];
  onConnect: (
    _wallet: UnifiedWalletProvider,
    _chainType: ChainType,
  ) => Promise<void>;
  initialChainType?: ChainType;
}

/**
 * Full-featured wallet selection modal with a two-step flow:
 * Step 1 — network selection via NetworkGrid.
 * Step 2 — wallet provider selection with chain type filter tabs.
 * @param isOpen - Whether modal is visible
 * @param onClose - Callback to close modal
 * @param wallets - Available wallet providers
 * @param onConnect - Callback when connecting to a wallet
 * @param initialChainType - Initial selected chain type for Step 2 (defaults to EVM)
 */
export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onConnect,
  initialChainType = "evm",
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<ModalStep>("network");
  const [selectedNetworkId, setSelectedNetworkId] = useState<ChainId | null>(
    null,
  );
  const [selectedChainType, setSelectedChainType] =
    useState<ChainType>(initialChainType);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { availableChains, selectChain } = useChain();

  // Mainnet chains only for Step 1
  const mainnetChains = useMemo(
    () => availableChains.filter((chain) => !chain.isTestnet),
    [availableChains],
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("network");
      setSelectedNetworkId(null);
      setSelectedChainType(initialChainType);
      setIsConnecting(false);
      setConnectingWallet(null);
      setError(null);
    }
  }, [isOpen, initialChainType]);

  // Filter wallets by selected chain type, installed first
  const filteredWallets = useMemo(() => {
    const matching = wallets.filter((w) =>
      w.supportedChainTypes.includes(selectedChainType),
    );
    // Sort: installed wallets first, then alphabetical within each group
    return matching.sort((a, b) => {
      const aInstalled = a.isInstalled() ? 0 : 1;
      const bInstalled = b.isInstalled() ? 0 : 1;
      if (aInstalled !== bInstalled) return aInstalled - bInstalled;
      return a.name.localeCompare(b.name);
    });
  }, [wallets, selectedChainType]);

  const handleNetworkSelect = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const chainIdStr = e.currentTarget.dataset.chainId;
      if (chainIdStr) {
        setSelectedNetworkId(Number(chainIdStr) as ChainId);
      }
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (selectedNetworkId !== null) {
      selectChain(selectedNetworkId);
      // Determine chain type from selected network config
      const selectedConfig = mainnetChains.find(
        (c) => c.id === selectedNetworkId,
      );
      setSelectedChainType(selectedConfig?.chainType ?? "evm");
      setStep("wallet");
    }
  }, [selectedNetworkId, selectChain, mainnetChains]);

  const handleBack = useCallback(() => {
    setStep("network");
  }, []);

  const handleChainTabClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const chainType = e.currentTarget.dataset.chainType as ChainType;
      if (chainType) {
        setSelectedChainType(chainType);
        setError(null);
      }
    },
    [],
  );

  const handleSelectWallet = useCallback(
    async (wallet: UnifiedWalletProvider) => {
      setIsConnecting(true);
      setConnectingWallet(wallet.name);
      setError(null);

      try {
        await onConnect(wallet, selectedChainType);
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("modal.connect.failedConnect");
        setError(message);
        Logger.error("Wallet connection failed in modal", {
          wallet: wallet.name,
          error: err,
        });
      } finally {
        setIsConnecting(false);
        setConnectingWallet(null);
      }
    },
    [onConnect, selectedChainType, onClose, t],
  );

  const handleBackdropClick = useCallback(() => {
    if (!isConnecting) {
      onClose();
    }
  }, [onClose, isConnecting]);

  // Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    /** Dismiss modal on Escape key press. */
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConnecting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isConnecting, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {/* Backdrop dismiss */}
        <button
          type="button"
          className="absolute inset-0 w-full h-full cursor-default"
          onClick={handleBackdropClick}
          aria-label={t("modal.close")}
          tabIndex={-1}
        />

        {step === "network" ? (
          <NetworkDialogContent
            chains={mainnetChains}
            selectedNetworkId={selectedNetworkId}
            onNetworkSelect={handleNetworkSelect}
            onContinue={handleContinue}
            onClose={onClose}
          />
        ) : (
          <WalletDialogContent
            selectedChainType={selectedChainType}
            onChainTabClick={handleChainTabClick}
            onBack={handleBack}
            onClose={onClose}
            isConnecting={isConnecting}
            error={error}
            filteredWallets={filteredWallets}
            connectingWallet={connectingWallet}
            onSelectWallet={handleSelectWallet}
          />
        )}
      </div>
    </Portal>
  );
};

export default WalletModal;
