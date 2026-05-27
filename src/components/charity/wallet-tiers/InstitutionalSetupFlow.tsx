import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Building2,
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCharityWallets } from "@/hooks/useCharityWallets";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAvailableEVMChains,
  DEFAULT_EVM_CHAIN_ID,
} from "@/config/chains/evm";
import type { CharityWallet } from "@/types/charityWallet";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const CUSTODIANS = [
  "Fireblocks",
  "Anchorage",
  "Coinbase Prime",
  "BitGo",
  "Other",
];

interface InstitutionalSetupFlowProps {
  charityProfileId: string;
  onBack: () => void;
  onComplete: (_wallet: CharityWallet) => void;
}

/**
 * Single-step institutional custody wallet setup form.
 * Chain selector, wallet address, custodian dropdown, PDF upload.
 * @param props - Component props
 * @returns The institutional setup flow component
 */
export const InstitutionalSetupFlow: React.FC<InstitutionalSetupFlowProps> = ({
  charityProfileId,
  onBack,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { addInstitutionalWallet, loading, error } = useCharityWallets();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chainId, setChainId] = useState<number>(DEFAULT_EVM_CHAIN_ID);
  const [walletAddress, setWalletAddress] = useState("");
  const [custodian, setCustodian] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const chains = useMemo(() => getAvailableEVMChains(false), []);

  const handleChainChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setChainId(Number(e.target.value));
    },
    [],
  );

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setWalletAddress(e.target.value.trim());
      setLocalError(null);
    },
    [],
  );

  const handleCustodianChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCustodian(e.target.value);
    },
    [],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      if (!ALLOWED_TYPES.has(selected.type)) {
        setLocalError(
          t(
            "wallet.institutional.invalidFileType",
            "Please upload a PDF, JPEG, or PNG file.",
          ),
        );
        return;
      }

      if (selected.size > MAX_FILE_SIZE) {
        setLocalError(
          t(
            "wallet.institutional.fileTooLarge",
            "File must be smaller than 10MB.",
          ),
        );
        return;
      }

      setFile(selected);
      setLocalError(null);
    },
    [t],
  );

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);

      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        setLocalError(
          t(
            "wallet.institutional.invalidAddress",
            "Please enter a valid Ethereum address (0x...)",
          ),
        );
        return;
      }

      if (!custodian) {
        setLocalError(
          t(
            "wallet.institutional.selectCustodian",
            "Please select a custodian.",
          ),
        );
        return;
      }

      if (!file) {
        setLocalError(
          t(
            "wallet.institutional.uploadRequired",
            "Please upload an attestation document.",
          ),
        );
        return;
      }

      const wallet = await addInstitutionalWallet({
        charity_profile_id: charityProfileId,
        wallet_address: walletAddress,
        chain_id: chainId,
        custodian_name: custodian,
        attestation_file: file,
      });

      if (wallet) {
        setSubmitted(true);
        onComplete(wallet);
      }
    },
    [
      walletAddress,
      custodian,
      file,
      addInstitutionalWallet,
      charityProfileId,
      chainId,
      onComplete,
      t,
    ],
  );

  const displayError = localError ?? error;

  // Confirmation screen
  if (submitted) {
    return (
      <div className="bg-surface-raised rounded-xl p-6 shadow-md text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-content-primary mb-2">
          {t(
            "wallet.institutional.submittedTitle",
            "Wallet submitted for review",
          )}
        </h2>
        <p className="text-sm text-content-secondary max-w-md mx-auto">
          {t(
            "wallet.institutional.submittedDesc",
            "Your institutional wallet registration is under review. You will receive an email within 3 business days.",
          )}
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent-base hover:text-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("wallet.institutional.backToWallets", "Back to wallets")}
        </button>
      </div>
    );
  }

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
        <Building2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
        {t(
          "wallet.institutional.title",
          "Register an institutional custody wallet",
        )}
      </h2>
      <p className="text-sm text-content-secondary mb-6">
        {t(
          "wallet.institutional.subtitle",
          "Provide your custodian-managed wallet details and upload an attestation document for verification.",
        )}
      </p>

      {displayError && (
        <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chain selector */}
        <div>
          <label
            htmlFor="inst-chain"
            className="block text-sm font-medium text-content-primary mb-1"
          >
            {t("wallet.institutional.chain", "Network")}
          </label>
          <select
            id="inst-chain"
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

        {/* Wallet address */}
        <div>
          <label
            htmlFor="inst-address"
            className="block text-sm font-medium text-content-primary mb-1"
          >
            {t("wallet.institutional.address", "Wallet address")}
          </label>
          <input
            id="inst-address"
            type="text"
            value={walletAddress}
            onChange={handleAddressChange}
            placeholder="0x..."
            className="w-full px-3 py-2 text-sm font-mono bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent-base/30"
          />
        </div>

        {/* Custodian dropdown */}
        <div>
          <label
            htmlFor="inst-custodian"
            className="block text-sm font-medium text-content-primary mb-1"
          >
            {t("wallet.institutional.custodian", "Custodian")}
          </label>
          <select
            id="inst-custodian"
            value={custodian}
            onChange={handleCustodianChange}
            className="w-full px-3 py-2 text-sm bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-base/30"
          >
            <option value="">
              {t(
                "wallet.institutional.selectCustodianOption",
                "Select custodian...",
              )}
            </option>
            {CUSTODIANS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-content-primary mb-1">
            {t(
              "wallet.institutional.attestation",
              "Attestation document",
            )}
          </label>
          <p className="text-xs text-content-muted mb-2">
            {t(
              "wallet.institutional.attestationHelp",
              "Upload a PDF, JPEG, or PNG (max 10MB) proving your custodial relationship.",
            )}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="sr-only"
            aria-label={t(
              "wallet.institutional.uploadFile",
              "Upload attestation file",
            )}
          />
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-surface-base border border-line-subtle dark:border-line-subtle/20 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary truncate">
                  {file.name}
                </p>
                <p className="text-xs text-content-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 text-content-muted hover:text-status-danger transition-colors"
                aria-label={t(
                  "wallet.institutional.removeFile",
                  "Remove file",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-line-subtle dark:border-line-subtle/30 rounded-lg text-sm text-content-secondary hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 transition-colors"
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
              {t(
                "wallet.institutional.chooseFile",
                "Choose file or drag & drop",
              )}
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !walletAddress || !custodian || !file}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("wallet.institutional.submitting", "Submitting...")}
            </>
          ) : (
            t("wallet.institutional.submit", "Submit for review")
          )}
        </button>
      </form>
    </div>
  );
};
