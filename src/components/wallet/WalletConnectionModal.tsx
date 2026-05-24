import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, ShieldCheck, ArrowRight, X, AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWallet, type WalletProvider } from "@/hooks/useWallet";
import { Logger } from "@/utils/logger";

interface WalletConnectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close (dismiss) */
  onClose: () => void;
  /** Callback when wallet is successfully connected */
  onConnected?: () => void;
}

/**
 * Modal prompting users to connect their wallet after login
 * Displays available wallets and handles the connection flow
 *
 * @param props - WalletConnectionModalProps
 * @returns Modal JSX element
 */
export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const { t } = useTranslation();
  const { connect, isConnecting } = useWeb3();
  const { getInstalledWallets } = useWallet();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const installedWallets = getInstalledWallets();

  const handleWalletConnect = useCallback(
    async (wallet: WalletProvider) => {
      try {
        setConnectionError(null);
        setSelectedWallet(wallet.name);

        await connect(wallet.provider);

        Logger.info("Wallet connected via modal", { wallet: wallet.name });

        if (onConnected) {
          onConnected();
        }
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("modal.wallet.failedConnect");

        // Don't show error for user rejection
        if (message.toLowerCase().includes("user rejected")) {
          setSelectedWallet(null);
          return;
        }

        setConnectionError(message);
        Logger.error("Wallet connection failed", {
          wallet: wallet.name,
          error: err,
        });
      } finally {
        setSelectedWallet(null);
      }
    },
    [connect, onClose, onConnected, t]
  );

  const handleWalletButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const walletName = e.currentTarget.dataset.walletName;
      const wallet = installedWallets.find((w) => w.name === walletName);
      if (wallet) {
        handleWalletConnect(wallet);
      }
    },
    [installedWallets, handleWalletConnect]
  );

  const handleSkip = useCallback(() => {
    Logger.info("User dismissed wallet connection modal");
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      size="md"
      closeOnBackdrop={false}
      showCloseButton={false}
    >
      {/* Header with icon */}
      <div className="text-center mb-6">
        <span className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
        </span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("modal.wallet.title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t("modal.wallet.description")}
        </p>
      </div>

      {/* Benefits list */}
      <ul className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 space-y-3">
        <li className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("modal.wallet.benefit1")}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("modal.wallet.benefit2")}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("modal.wallet.benefit3")}
          </span>
        </li>
      </ul>

      {/* Error message */}
      {connectionError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {connectionError}
          </p>
        </div>
      )}

      {/* Wallet options */}
      {installedWallets.length > 0 ? (
        installedWallets.map((wallet) => (
          <button
            key={wallet.name}
            data-wallet-name={wallet.name}
            onClick={handleWalletButtonClick}
            disabled={isConnecting}
            className={`
              w-full flex items-center gap-3 p-4 mb-2
              bg-white dark:bg-gray-800
              border-2 rounded-xl
              transition-all duration-200
              ${
                selectedWallet === wallet.name
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700"
              }
              ${isConnecting ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"}
            `}
          >
            <img
              src={`/icons/${wallet.icon}.svg`}
              alt=""
              className="w-10 h-10 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="flex-1 text-left">
              <span className="block font-semibold text-gray-900 dark:text-gray-100">
                {wallet.name}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {selectedWallet === wallet.name && isConnecting
                  ? t("modal.wallet.connecting")
                  : t("modal.wallet.clickToConnect")}
              </span>
            </span>
            <ArrowRight
              className={`h-5 w-5 flex-shrink-0 transition-transform ${
                selectedWallet === wallet.name && isConnecting
                  ? "animate-pulse"
                  : ""
              } text-gray-400 dark:text-gray-500`}
            />
          </button>
        ))
      ) : (
        <p className="text-center py-6 mb-6 text-gray-600 dark:text-gray-400">
          {t("modal.wallet.noExtension")}{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
          >
            {t("modal.wallet.installMetaMask")}
          </a>
        </p>
      )}

      {/* Skip button */}
      <div className="flex justify-center mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={isConnecting}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4 mr-1" />
          {t("modal.wallet.skip")}
        </Button>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
        {t("modal.wallet.footerNote")}
      </p>
    </Modal>
  );
};

export default WalletConnectionModal;
