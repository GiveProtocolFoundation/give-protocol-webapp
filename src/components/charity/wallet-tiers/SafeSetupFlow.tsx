import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCharityWallets } from "@/hooks/useCharityWallets";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAvailableEVMChains,
  getEVMChainConfig,
  DEFAULT_EVM_CHAIN_ID,
} from "@/config/chains/evm";
import type { CharityWallet } from "@/types/charityWallet";

type Step = "source" | "verify";

const SAFE_INFO_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
];

interface SafeSetupFlowProps {
  charityProfileId: string;
  onBack: () => void;
  onComplete: (_wallet: CharityWallet) => void;
}

/**
 * Two-step Safe multisig setup wizard.
 * Step 1: "Create new Safe" (external link) or "I already have a Safe"
 * Step 2: Chain selector, Safe address, signer count & threshold, connect signer, verify via EIP-1271
 * @param props - Component props
 * @returns The Safe setup flow component
 */
export const SafeSetupFlow: React.FC<SafeSetupFlowProps> = ({
  charityProfileId,
  onBack,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { signer, address, isConnected, connect } = useWeb3();
  const { addVerifiedWallet, loading, error } = useCharityWallets();

  const [step, setStep] = useState<Step>("source");
  const [chainId, setChainId] = useState<number>(DEFAULT_EVM_CHAIN_ID);
  const [safeAddress, setSafeAddress] = useState("");
  const [signerCount, setSignerCount] = useState<number>(2);
  const [signerThreshold, setSignerThreshold] = useState<number>(1);
  const [detectedOwners, setDetectedOwners] = useState<string[] | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const chains = useMemo(() => getAvailableEVMChains(false), []);

  const handleHaveSafe = useCallback(() => {
    setStep("verify");
  }, []);

  const handleChainChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setChainId(Number(e.target.value));
    },
    [],
  );

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSafeAddress(e.target.value.trim());
      setLocalError(null);
    },
    [],
  );

  const handleSignerCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setSignerCount(isNaN(val) ? 2 : val);
      setLocalError(null);
    },
    [],
  );

  const handleThresholdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setSignerThreshold(isNaN(val) ? 1 : val);
      setLocalError(null);
    },
    [],
  );

  // On-chain Safe configuration detection
  useEffect(() => {
    let active = true;
    if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
      setDetectedOwners(null);
      return;
    }

    const chainConfig = getEVMChainConfig(chainId);
    const rpcUrl = chainConfig?.rpcUrls?.[0];
    if (!rpcUrl) return;

    const detectSafe = async () => {
      try {
        setIsDetecting(true);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(
          safeAddress,
          SAFE_INFO_ABI,
          provider,
        );
        const [owners, threshold] = await Promise.all([
          contract.getOwners() as Promise<string[]>,
          contract.getThreshold() as Promise<bigint>,
        ]);
        if (!active) return;
        const normalizedOwners = owners.map((o) => o.toLowerCase());
        setDetectedOwners(normalizedOwners);
        setSignerCount(normalizedOwners.length);
        setSignerThreshold(Number(threshold));
      } catch {
        if (active) {
          setDetectedOwners(null);
        }
      } finally {
        if (active) {
          setIsDetecting(false);
        }
      }
    };

    detectSafe();

    return () => {
      active = false;
    };
  }, [safeAddress, chainId]);

  const isOwnerConnected = useMemo(() => {
    if (!address || !detectedOwners) return null;
    return detectedOwners.includes(address.toLowerCase());
  }, [address, detectedOwners]);

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch {
      // User rejected or error — handled by Web3Context
    }
  }, [connect]);

  const handleVerify = useCallback(async () => {
    setLocalError(null);

    if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
      setLocalError(
        t(
          "wallet.safe.invalidAddress",
          "Please enter a valid Ethereum address (0x...)",
        ),
      );
      return;
    }

    if (signerCount < 2) {
      setLocalError(
        t(
          "wallet.safe.minSigners",
          "Safe multisigs require at least 2 signers.",
        ),
      );
      return;
    }

    if (signerThreshold < 1 || signerThreshold > signerCount) {
      setLocalError(
        t(
          "wallet.safe.invalidThreshold",
          "Signer threshold must be between 1 and the total number of signers.",
        ),
      );
      return;
    }

    if (!signer || !address) {
      setLocalError(
        t(
          "wallet.safe.connectFirst",
          "Please connect your signer wallet first.",
        ),
      );
      return;
    }

    const nonce = crypto.randomUUID();
    const message = `Give Protocol Safe verification\nCharity: ${charityProfileId}\nSafe: ${safeAddress}\nChain: ${chainId}\nNonce: ${nonce}`;

    try {
      const signature = await signer.signMessage(message);

      const wallet = await addVerifiedWallet({
        charity_profile_id: charityProfileId,
        wallet_address: safeAddress,
        chain_id: chainId,
        wallet_type: "safe",
        signature,
        message,
        signer_count: signerCount,
        signer_threshold: signerThreshold,
      });

      if (wallet) {
        onComplete(wallet);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("user rejected") ||
          err.message.includes("ACTION_REJECTED"))
      ) {
        setLocalError(
          t("wallet.safe.rejected", "Signature request was rejected."),
        );
      } else {
        setLocalError(
          t(
            "wallet.safe.signError",
            "Failed to sign verification message. Please try again.",
          ),
        );
      }
    }
  }, [
    safeAddress,
    signerCount,
    signerThreshold,
    signer,
    address,
    charityProfileId,
    chainId,
    addVerifiedWallet,
    onComplete,
    t,
  ]);

  const displayError = localError ?? error;

  // Step 1: Choose source
  if (step === "source") {
    return (
      <div className="bg-surface-raised rounded-xl p-6 shadow-md">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("common.back", "Back")}
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            {t("wallet.safe.title", "Set up a Safe multisig wallet")}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t(
              "wallet.safe.subtitle",
              "A Safe requires multiple signers to approve every transaction, providing the highest level of security for your charity's funds.",
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://app.safe.global/new-safe/create"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-start text-left p-5 rounded-xl border-2 border-line-subtle dark:border-line-subtle/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
          >
            <ExternalLink
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-3"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-content-primary mb-1">
              {t("wallet.safe.createNew", "Create a new Safe")}
            </span>
            <span className="text-xs text-content-secondary leading-relaxed">
              {t(
                "wallet.safe.createNewDesc",
                "Opens app.safe.global where you can create a new multisig. Come back here once it's deployed.",
              )}
            </span>
          </a>

          <button
            onClick={handleHaveSafe}
            className="flex flex-col items-start text-left p-5 rounded-xl border-2 border-line-subtle dark:border-line-subtle/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
          >
            <CheckCircle2
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-3"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-content-primary mb-1">
              {t("wallet.safe.haveOne", "I already have a Safe")}
            </span>
            <span className="text-xs text-content-secondary leading-relaxed">
              {t(
                "wallet.safe.haveOneDesc",
                "Enter your Safe address and verify control by signing a message from a signer wallet.",
              )}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Verify
  return (
    <div className="bg-surface-raised rounded-xl p-6 shadow-md">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content-primary mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("common.back", "Back")}
      </button>

      <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        {t("wallet.safe.verifyTitle", "Verify Safe ownership")}
      </h2>

      {displayError && (
        <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {displayError}
        </div>
      )}

      <div className="space-y-4">
        {/* Chain selector */}
        <div>
          <label
            htmlFor="safe-chain"
            className="block text-sm font-medium text-content-primary mb-1"
          >
            {t("wallet.safe.chain", "Network")}
          </label>
          <select
            id="safe-chain"
            value={chainId}
            onChange={handleChainChange}
            className="w-full px-3 py-2 text-sm bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-base/30"
          >
            {chains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Safe address */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="safe-address"
              className="block text-sm font-medium text-content-primary"
            >
              {t("wallet.safe.address", "Safe address")}
            </label>
            {isDetecting && (
              <span className="flex items-center gap-1 text-xs text-content-muted">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                {t("wallet.safe.detecting", "Detecting Safe configuration...")}
              </span>
            )}
          </div>
          <input
            id="safe-address"
            type="text"
            value={safeAddress}
            onChange={handleAddressChange}
            placeholder="0x..."
            className="w-full px-3 py-2 text-sm font-mono bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent-base/30"
          />
        </div>

        {/* Detected Safe info */}
        {detectedOwners && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  "wallet.safe.detectedConfig",
                  `Detected Safe configuration: ${signerThreshold} of ${signerCount} signers`,
                )}
              </span>
            </div>
            {address && isOwnerConnected === true && (
              <p className="text-emerald-700 dark:text-emerald-400">
                {t(
                  "wallet.safe.ownerConfirmed",
                  "Connected wallet is a confirmed owner of this Safe.",
                )}
              </p>
            )}
            {address && isOwnerConnected === false && (
              <p className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                {t(
                  "wallet.safe.notOwner",
                  "Connected wallet is not listed as an owner. Verification requires an owner signature or Safe contract approval.",
                )}
              </p>
            )}
          </div>
        )}

        {/* Signer configuration inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="safe-signer-count"
              className="block text-xs font-medium text-content-primary mb-1"
            >
              {t("wallet.safe.signerCount", "Total signers (min 2)")}
            </label>
            <input
              id="safe-signer-count"
              type="number"
              min={2}
              value={signerCount}
              onChange={handleSignerCountChange}
              className="w-full px-3 py-1.5 text-sm bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-base/30"
            />
          </div>
          <div>
            <label
              htmlFor="safe-signer-threshold"
              className="block text-xs font-medium text-content-primary mb-1"
            >
              {t("wallet.safe.signerThreshold", "Threshold (min 1)")}
            </label>
            <input
              id="safe-signer-threshold"
              type="number"
              min={1}
              max={signerCount}
              value={signerThreshold}
              onChange={handleThresholdChange}
              className="w-full px-3 py-1.5 text-sm bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-base/30"
            />
          </div>
        </div>

        {/* Connect signer wallet */}
        <div>
          <p className="text-sm font-medium text-content-primary mb-1">
            {t("wallet.safe.signerWallet", "Signer wallet")}
          </p>
          {isConnected && address ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className="h-4 w-4 text-emerald-600"
                aria-hidden="true"
              />
              <code className="font-mono text-content-primary">
                {address.slice(0, 6)}&hellip;{address.slice(-4)}
              </code>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-base hover:bg-accent-hover rounded-lg transition-colors"
            >
              {t("wallet.safe.connectSigner", "Connect signer wallet")}
            </button>
          )}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || !isConnected || !safeAddress}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("wallet.safe.verifying", "Verifying...")}
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {t("wallet.safe.signVerify", "Sign to verify control")}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
