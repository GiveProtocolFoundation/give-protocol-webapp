import React, { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCharityWallets } from "@/hooks/useCharityWallets";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAvailableEVMChains,
  DEFAULT_EVM_CHAIN_ID,
} from "@/config/chains/evm";
import type { CharityWallet } from "@/types/charityWallet";

type Step = "risk" | "sign" | "confirm";

interface SingleSignerFlowProps {
  charityProfileId: string;
  onBack: () => void;
  onComplete: (_wallet: CharityWallet) => void;
}

/**
 * Three-step single-signer (EOA) wallet setup with deliberate friction.
 * Step 1: Full-screen risk acknowledgment modal
 * Step 2: Connect wallet + sign nonce
 * Step 3: Two checkboxes + register button
 * @param props - Component props
 * @returns The single signer flow component
 */
export const SingleSignerFlow: React.FC<SingleSignerFlowProps> = ({
  charityProfileId,
  onBack,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { signer, address, isConnected, connect } = useWeb3();
  const { addVerifiedWallet, loading, error } = useCharityWallets();

  const [step, setStep] = useState<Step>("risk");
  const [chainId, setChainId] = useState<number>(DEFAULT_EVM_CHAIN_ID);
  const [signature, setSignature] = useState<string | null>(null);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [riskUnderstood, setRiskUnderstood] = useState(false);
  const [authorizedByOrg, setAuthorizedByOrg] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const chains = useMemo(() => getAvailableEVMChains(false), []);

  const handleChainChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setChainId(Number(e.target.value));
    },
    [],
  );

  // Step 1: Accept risk
  const handleAcceptRisk = useCallback(() => {
    setStep("sign");
  }, []);

  const handleDeclineRisk = useCallback(() => {
    onBack();
  }, [onBack]);

  // Step 2: Connect + sign
  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch {
      // User rejected — handled by Web3Context
    }
  }, [connect]);

  const handleSign = useCallback(async () => {
    setLocalError(null);

    if (!signer || !address) {
      setLocalError(
        t(
          "wallet.eoa.connectFirst",
          "Please connect your wallet first.",
        ),
      );
      return;
    }

    const nonce = crypto.randomUUID();
    const message = `Give Protocol EOA verification\nCharity: ${charityProfileId}\nWallet: ${address}\nChain: ${chainId}\nNonce: ${nonce}`;

    try {
      const sig = await signer.signMessage(message);
      setSignature(sig);
      setSignedMessage(message);
      setStep("confirm");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("user rejected") ||
          err.message.includes("ACTION_REJECTED"))
      ) {
        setLocalError(
          t("wallet.eoa.rejected", "Signature request was rejected."),
        );
      } else {
        setLocalError(
          t(
            "wallet.eoa.signError",
            "Failed to sign message. Please try again.",
          ),
        );
      }
    }
  }, [signer, address, charityProfileId, chainId, t]);

  // Step 3: Register
  const handleRegister = useCallback(async () => {
    setLocalError(null);

    if (!signature || !signedMessage || !address) {
      setLocalError(
        t(
          "wallet.eoa.missingSignature",
          "Missing signature. Please go back and sign again.",
        ),
      );
      return;
    }

    const wallet = await addVerifiedWallet({
      charity_profile_id: charityProfileId,
      wallet_address: address,
      chain_id: chainId,
      wallet_type: "eoa",
      signature,
      message: signedMessage,
    });

    if (wallet) {
      onComplete(wallet);
    }
  }, [
    signature,
    signedMessage,
    address,
    addVerifiedWallet,
    charityProfileId,
    chainId,
    onComplete,
    t,
  ]);

  const handleToggleRiskUnderstood = useCallback(() => {
    setRiskUnderstood((prev) => !prev);
  }, []);

  const handleToggleAuthorizedByOrg = useCallback(() => {
    setAuthorizedByOrg((prev) => !prev);
  }, []);

  const displayError = localError ?? error;

  // Step 1: Risk acknowledgment — full-screen amber modal
  if (step === "risk") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-surface-overlay rounded-2xl shadow-2xl max-w-lg w-full p-8 border-2 border-amber-400/50">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-content-primary mb-2">
              {t(
                "wallet.eoa.riskTitle",
                "Single-signer wallet: important risks",
              )}
            </h2>

            <div className="text-sm text-content-secondary text-left space-y-3 mb-6">
              <p>
                {t(
                  "wallet.eoa.riskParagraph1",
                  "A single-signer (EOA) wallet is controlled by one private key. If that key is lost, stolen, or compromised, all funds sent to this wallet are permanently unrecoverable.",
                )}
              </p>
              <p>
                {t(
                  "wallet.eoa.riskParagraph2",
                  "For organizational funds, we strongly recommend using a multisig Safe wallet instead. Multisig wallets require multiple approvals for every transaction, protecting against single points of failure.",
                )}
              </p>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {t(
                  "wallet.eoa.riskParagraph3",
                  "By proceeding, you acknowledge that Give Protocol is not responsible for any loss of funds due to private key compromise, loss, or mismanagement.",
                )}
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleDeclineRisk}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-content-primary bg-surface-sunken hover:bg-surface-base border border-line-subtle rounded-lg transition-colors"
              >
                {t("wallet.eoa.useMultisig", "Use a multisig instead")}
              </button>
              <button
                onClick={handleAcceptRisk}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                {t("wallet.eoa.proceedAnyway", "I understand, proceed")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Connect + sign
  if (step === "sign") {
    return (
      <div className="bg-surface-raised rounded-xl p-6 shadow-md">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("common.back", "Back")}
        </button>

        <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
          {t("wallet.eoa.signTitle", "Connect and sign")}
        </h2>
        <p className="text-sm text-content-secondary mb-6">
          {t(
            "wallet.eoa.signSubtitle",
            "Connect your wallet and sign a message to prove you control this address.",
          )}
        </p>

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
              htmlFor="eoa-chain"
              className="block text-sm font-medium text-content-primary mb-1"
            >
              {t("wallet.eoa.chain", "Network")}
            </label>
            <select
              id="eoa-chain"
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

          {/* Connect wallet */}
          <div>
            <p className="text-sm font-medium text-content-primary mb-1">
              {t("wallet.eoa.walletConnection", "Wallet")}
            </p>
            {isConnected && address ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <code className="font-mono text-content-primary">
                  {address.slice(0, 6)}&hellip;{address.slice(-4)}
                </code>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-base hover:bg-accent-hover rounded-lg transition-colors"
              >
                {t("wallet.eoa.connectWallet", "Connect wallet")}
              </button>
            )}
          </div>

          {/* Sign button */}
          <button
            onClick={handleSign}
            disabled={!isConnected}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {t("wallet.eoa.signMessage", "Sign verification message")}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Confirm + register
  return (
    <div className="bg-surface-raised rounded-xl p-6 shadow-md">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content-primary mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("common.back", "Back")}
      </button>

      <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-1">
        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
        {t("wallet.eoa.confirmTitle", "Final confirmation")}
      </h2>
      <p className="text-sm text-content-secondary mb-6">
        {t(
          "wallet.eoa.confirmSubtitle",
          "Please confirm the following before registering this wallet.",
        )}
      </p>

      {displayError && (
        <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {displayError}
        </div>
      )}

      {/* Connected wallet display */}
      {address && (
        <div className="mb-4 p-3 bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg">
          <p className="text-xs text-content-muted mb-0.5">
            {t("wallet.eoa.walletToRegister", "Wallet to register")}
          </p>
          <code className="text-sm font-mono text-content-primary">
            {address}
          </code>
        </div>
      )}

      {/* Checkboxes — deliberate friction */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={riskUnderstood}
            onChange={handleToggleRiskUnderstood}
            className="mt-0.5 h-4 w-4 rounded border-line-subtle text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-content-primary">
            {t(
              "wallet.eoa.checkRisk",
              "I understand that a single-signer wallet carries higher risk than a multisig, and that loss of the private key means permanent loss of funds.",
            )}
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={authorizedByOrg}
            onChange={handleToggleAuthorizedByOrg}
            className="mt-0.5 h-4 w-4 rounded border-line-subtle text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-content-primary">
            {t(
              "wallet.eoa.checkAuthorized",
              "I am authorized by my organization to designate this wallet as a receiving address for charitable donations.",
            )}
          </span>
        </label>
      </div>

      {/* Register button */}
      <button
        onClick={handleRegister}
        disabled={loading || !riskUnderstood || !authorizedByOrg}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("wallet.eoa.registering", "Registering...")}
          </>
        ) : (
          t("wallet.eoa.register", "Register wallet")
        )}
      </button>
    </div>
  );
};
