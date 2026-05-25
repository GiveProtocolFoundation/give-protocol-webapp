import React, { useCallback, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Wallet, ArrowRight } from "lucide-react";
import { NetworkGrid } from "./NetworkGrid";
import { useChain, type ChainId } from "@/contexts/ChainContext";
import { useWeb3 } from "@/contexts/Web3Context";

interface ChainSelectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when selection is complete */
  onComplete: () => void;
  /** Optional: Pre-detected chain ID from wallet */
  detectedChainId?: number;
}

/**
 * Modal for first-time chain selection during onboarding
 * @param props - Component props
 * @returns Chain selection modal component
 */
export const ChainSelectionModal: React.FC<ChainSelectionModalProps> = ({
  isOpen,
  onComplete,
  detectedChainId,
}) => {
  const { t } = useTranslation();
  const { availableChains, selectChain, isSupported } = useChain();
  const { isConnected, switchChain, chainId: walletChainId } = useWeb3();

  // Initialize with detected chain if supported, otherwise null
  const [selectedId, setSelectedId] = useState<ChainId | null>(() => {
    if (detectedChainId && isSupported(detectedChainId)) {
      return detectedChainId as ChainId;
    }
    return null;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChainSelect = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const chainId = Number(e.currentTarget.dataset.chainId) as ChainId;
      setSelectedId(chainId);
      setError(null);
    },
    [],
  );

  const handleContinue = useCallback(async () => {
    if (!selectedId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Store the selection in app state
      selectChain(selectedId);

      // If wallet is connected and on a different chain, switch to selected network
      if (isConnected && walletChainId !== selectedId) {
        await switchChain(selectedId);
      }

      onComplete();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("modal.chain.failedSelect");
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedId,
    selectChain,
    onComplete,
    isConnected,
    walletChainId,
    switchChain,
    t,
  ]);

  if (!isOpen) return null;

  // Filter to only show mainnet chains in the selection
  const mainnetChains = availableChains.filter((chain) => !chain.isTestnet);

  return (
    <dialog
      open
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      aria-modal="true"
      aria-labelledby="chain-selection-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl animate-slideIn overflow-hidden
          bg-white/[0.05] backdrop-blur-xl border border-white/[0.10]
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-white/[0.08]">
          <div className="w-14 h-14 bg-white/[0.08] border border-white/[0.12] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-gray-300" />
          </div>
          <h2
            id="chain-selection-title"
            className="text-xl font-semibold text-white mb-1"
          >
            {t("modal.chain.title")}
          </h2>
          <p className="text-sm text-gray-400">{t("modal.chain.subtitle")}</p>
        </div>

        {/* Network Grid */}
        <div className="p-6">
          <NetworkGrid
            chains={mainnetChains}
            selectedChainId={selectedId}
            onChainSelect={handleChainSelect}
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mb-4">
            {t("modal.chain.footerNote")}
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedId || isProcessing}
            className="w-full py-3 text-base font-medium rounded-xl
              bg-white/[0.08] backdrop-blur-sm border border-white/[0.12]
              text-white transition-all duration-200
              hover:bg-white/[0.14] hover:border-white/[0.20]
              focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.08]
              inline-flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {t("modal.chain.connecting")}
              </>
            ) : (
              <>
                {t("modal.chain.continue")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
};
