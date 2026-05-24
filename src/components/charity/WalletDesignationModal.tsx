import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Mail, Shield, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWalletDesignation } from "@/hooks/web3/useWalletDesignation";

interface WalletDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  charityProfileId: string;
  charityName: string;
  /** Called when the user reaches a terminal-success phase (email sent or pending Safe) so the parent can refresh. */
  onSubmitted?: () => void;
}

/**
 * Modal that walks a charity admin through designating an official receiving
 * wallet. Two visual steps:
 *   1. Confirmation + attestation checkbox + Sign button
 *   2. Result — one of: pending_email, pending_safe, error
 *
 * The sign action is gated on:
 *   - A connected wallet (uses Web3Context)
 *   - The attestation checkbox being checked
 */
export const WalletDesignationModal: React.FC<WalletDesignationModalProps> = ({
  isOpen,
  onClose,
  charityProfileId,
  charityName,
  onSubmitted,
}) => {
  const { isConnected, address } = useWeb3();
  const { phase, error, sentToEmail, candidateAddress, start, recheck, reset } =
    useWalletDesignation();
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset internal state every time the modal closes.
  useEffect(() => {
    if (!isOpen) {
      reset();
      setAcknowledged(false);
    }
  }, [isOpen, reset]);

  // Notify parent when we transition into a terminal-success phase.
  useEffect(() => {
    if (phase === "pending_email" || phase === "pending_safe") {
      onSubmitted?.();
    }
  }, [phase, onSubmitted]);

  const handleAcknowledgeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAcknowledged(e.target.checked);
    },
    [],
  );

  const handleSign = useCallback(() => {
    start(charityProfileId);
  }, [start, charityProfileId]);

  const handleRecheck = useCallback(() => {
    recheck(charityProfileId);
  }, [recheck, charityProfileId]);

  const handleRetry = useCallback(() => {
    reset();
    setAcknowledged(false);
  }, [reset]);

  const inFlight =
    phase === "requesting_nonce" ||
    phase === "awaiting_signature" ||
    phase === "submitting";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Designate official wallet"
      size="lg"
      closeOnBackdrop={!inFlight}
      closeOnEscape={!inFlight}
    >
      {phase === "pending_email" ? (
        <PendingEmailPanel sentToEmail={sentToEmail} onClose={onClose} />
      ) : phase === "pending_safe" ? (
        <PendingSafePanel
          candidateAddress={candidateAddress ?? address ?? ""}
          onRecheck={handleRecheck}
          onClose={onClose}
        />
      ) : phase === "error" ? (
        <ErrorPanel error={error} onRetry={handleRetry} onClose={onClose} />
      ) : (
        <DesignationForm
          charityName={charityName}
          isConnected={isConnected}
          connectedAddress={address}
          acknowledged={acknowledged}
          onAcknowledgeChange={handleAcknowledgeChange}
          onSign={handleSign}
          onClose={onClose}
          phase={phase}
        />
      )}
    </Modal>
  );
};

interface DesignationFormProps {
  charityName: string;
  isConnected: boolean;
  connectedAddress: string | null;
  acknowledged: boolean;
  onAcknowledgeChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSign: () => void;
  onClose: () => void;
  phase: "idle" | "requesting_nonce" | "awaiting_signature" | "submitting";
}

/** Step 1: the attestation form, shown until the user clicks Sign. */
function DesignationForm({
  charityName,
  isConnected,
  connectedAddress,
  acknowledged,
  onAcknowledgeChange,
  onSign,
  onClose,
  phase,
}: DesignationFormProps) {
  const inFlight =
    phase === "requesting_nonce" ||
    phase === "awaiting_signature" ||
    phase === "submitting";
  const phaseLabel = {
    idle: "Sign to designate",
    requesting_nonce: "Preparing message…",
    awaiting_signature: "Open your wallet to sign…",
    submitting: "Verifying signature…",
  }[phase];

  return (
    <div className="space-y-5">
      <p className="text-sm text-content-secondary">
        You are setting the official receiving wallet for{" "}
        <strong className="text-content-primary">{charityName}</strong>.
        Donations will be sent directly to this address. After signing, an email
        confirmation link is sent to your authorized signer email.
      </p>

      <div className="rounded-lg border border-line-subtle bg-surface-sunken p-4 flex items-start gap-3">
        <Wallet
          className="h-5 w-5 text-content-secondary flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-content-muted mb-1">
            Wallet you are designating
          </p>
          {isConnected && connectedAddress ? (
            <p className="font-mono text-sm text-content-primary break-all">
              {connectedAddress}
            </p>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No wallet connected. Connect a wallet first, then reopen this
              dialog.
            </p>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={onAcknowledgeChange}
          disabled={inFlight}
          className="mt-0.5 h-4 w-4 rounded border-line-subtle text-accent-base focus:ring-accent-base"
        />
        <span className="text-sm text-content-secondary">
          I confirm this wallet is controlled by{" "}
          <strong className="text-content-primary">{charityName}</strong>, not
          by me personally. Donations sent to it are intended for the charity
          and may be subject to legal and tax recordkeeping requirements.
        </span>
      </label>

      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3 flex items-start gap-2">
        <Shield
          className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Smart-contract wallets (e.g. Gnosis Safe) are supported. If your Safe
          needs multiple signers, sign here first — we will wait for the
          threshold to be reached before sending the email confirmation.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={inFlight}>
          Cancel
        </Button>
        <Button
          onClick={onSign}
          disabled={!isConnected || !acknowledged || inFlight}
          icon={
            inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
          }
        >
          {phaseLabel}
        </Button>
      </div>
    </div>
  );
}

/** Step 2a: signature accepted, email sent. */
function PendingEmailPanel({
  sentToEmail,
  onClose,
}: {
  sentToEmail: string | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-accent-subtle flex items-center justify-center">
        <Mail className="h-6 w-6 text-accent-base" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-content-primary">
          Check your email
        </h3>
        <p className="mt-2 text-sm text-content-secondary">
          We sent a confirmation link
          {sentToEmail ? (
            <>
              {" "}
              to <strong className="text-content-primary">{sentToEmail}</strong>
            </>
          ) : null}
          . Click the link within 24 hours to activate this wallet. Donations
          remain disabled until activation.
        </p>
      </div>
      <div className="pt-2">
        <Button onClick={onClose} fullWidth>
          Done
        </Button>
      </div>
    </div>
  );
}

/** Step 2b: contract wallet signature not yet at threshold. */
function PendingSafePanel({
  candidateAddress,
  onRecheck,
  onClose,
}: {
  candidateAddress: string;
  onRecheck: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-accent-subtle flex items-center justify-center">
        <Loader2
          className="h-6 w-6 text-accent-base animate-spin"
          aria-hidden="true"
        />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-content-primary">
          Waiting for your Safe signers
        </h3>
        <p className="mt-2 text-sm text-content-secondary">
          Your signature was recorded, but the Safe at{" "}
          <span className="font-mono text-xs">{candidateAddress}</span> still
          needs additional approvals to meet its threshold. We will email a
          confirmation link once the threshold is reached.
        </p>
        <p className="mt-2 text-xs text-content-muted">
          You can also click below to recheck on-chain right now.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          I&apos;ll come back later
        </Button>
        <Button onClick={onRecheck}>Re-check now</Button>
      </div>
    </div>
  );
}

/** Step 2c: error state. */
function ErrorPanel({
  error,
  onRetry,
  onClose,
}: {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertTriangle
          className="h-6 w-6 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-content-primary">
          Designation failed
        </h3>
        <p className="mt-2 text-sm text-content-secondary">
          {error ?? "Something went wrong."}
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}
