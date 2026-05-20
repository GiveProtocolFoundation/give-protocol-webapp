import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  ShieldAlert,
  Timer,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  cancelWalletChange,
  getDesignationState,
  recheckPending,
  type WalletDesignationStatus,
} from "@/services/walletDesignationService";
import { WalletDesignationModal } from "./WalletDesignationModal";
import { Logger } from "@/utils/logger";

interface DesignatedWalletCardProps {
  charityProfileId: string;
  charityName: string;
  /** Called when the wallet status transitions to 'active' so parents can re-fetch related data. */
  onActivated?: () => void;
}

interface DesignationState {
  status: WalletDesignationStatus;
  walletAddress: string | null;
  walletKind: "eoa" | "contract" | null;
  designatedAt: string | null;
  pendingWalletAddress: string | null;
  pendingWalletEffectiveAt: string | null;
}

/**
 * Portal card showing the current designated-wallet state for a charity.
 * Renders one of five panels:
 *  - unset (CTA to start)
 *  - pending_signature_verification (Safe still collecting signers)
 *  - pending_email_confirmation (waiting for magic-link click)
 *  - active (donations enabled; offers a "Change wallet" CTA)
 *  - pending_change_cooldown (PR2: 72-hour cooling-off in progress)
 */
export const DesignatedWalletCard: React.FC<DesignatedWalletCardProps> = ({
  charityProfileId,
  charityName,
  onActivated,
}) => {
  const [state, setState] = useState<DesignationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getDesignationState(charityProfileId);
    setState(next);
    setLoading(false);
    if (next?.status === "active") {
      onActivated?.();
    }
  }, [charityProfileId, onActivated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    refresh();
  }, [refresh]);

  const handleRecheck = useCallback(async () => {
    setRechecking(true);
    const result = await recheckPending(charityProfileId);
    if (!result.ok) {
      Logger.warn("Recheck failed", { error: result.error });
    }
    await refresh();
    setRechecking(false);
  }, [charityProfileId, refresh]);

  const handleCancelChange = useCallback(async () => {
    setCancelling(true);
    const result = await cancelWalletChange(charityProfileId);
    if (!result.ok) {
      Logger.warn("Cancel pending change failed", { error: result.error });
    }
    await refresh();
    setCancelling(false);
  }, [charityProfileId, refresh]);

  return (
    <>
      <Card hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet
            className="h-5 w-5 text-content-secondary"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-content-primary">
            Official receiving wallet
          </h3>
        </div>

        {loading ? (
          <div className="h-16 bg-surface-sunken rounded animate-pulse" />
        ) : !state || state.status === "unset" ? (
          <UnsetPanel onStart={handleOpenModal} />
        ) : state.status === "pending_signature_verification" ? (
          <PendingSignaturePanel
            rechecking={rechecking}
            onRecheck={handleRecheck}
          />
        ) : state.status === "pending_email_confirmation" ? (
          <PendingEmailPanel walletAddress={state.walletAddress} />
        ) : state.status === "pending_change_cooldown" ? (
          <CooldownPanel
            state={state}
            cancelling={cancelling}
            onCancel={handleCancelChange}
          />
        ) : (
          <ActivePanel state={state} onChange={handleOpenModal} />
        )}
      </Card>

      <WalletDesignationModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        charityProfileId={charityProfileId}
        charityName={charityName}
        onSubmitted={refresh}
      />
    </>
  );
};

/** Panel shown when no wallet has been designated yet — primary CTA to start the flow. */
function UnsetPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-content-secondary">
        You haven&apos;t designated an official receiving wallet yet. Donations
        to this charity are disabled until you complete this step.
      </p>
      <Button onClick={onStart}>Designate wallet</Button>
    </div>
  );
}

/** Panel shown while a Safe signature is still collecting signers; offers a manual recheck. */
function PendingSignaturePanel({
  rechecking,
  onRecheck,
}: {
  rechecking: boolean;
  onRecheck: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
        <Clock
          className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <p className="font-medium">Waiting for Safe signers</p>
          <p className="mt-0.5">
            Your multi-sig Safe still needs additional approvals before we can
            activate the wallet. We&apos;ll email you once threshold is reached.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={onRecheck}
        disabled={rechecking}
        icon={
          rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
        }
      >
        {rechecking ? "Re-checking…" : "Re-check now"}
      </Button>
    </div>
  );
}

/** Panel shown while waiting for the authorized signer to click the email confirmation link. */
function PendingEmailPanel({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-accent-subtle/30 border border-line-accent/30 rounded-lg">
      <Mail
        className="h-4 w-4 text-accent-base flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-xs text-content-secondary">
        <p className="font-medium text-content-primary">
          Awaiting email confirmation
        </p>
        <p className="mt-0.5">
          Check your authorized signer&apos;s inbox for a confirmation link.
          {walletAddress ? (
            <>
              {" "}
              The pending address will be{" "}
              <span className="font-mono">{walletAddress}</span>.
            </>
          ) : null}{" "}
          Donations are disabled until the link is clicked.
        </p>
      </div>
    </div>
  );
}

/** Panel shown when the wallet is active — displays address, kind, and designation date. */
function ActivePanel({
  state,
  onChange,
}: {
  state: DesignationState;
  onChange: () => void;
}) {
  const formattedDate = state.designatedAt
    ? new Date(state.designatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const kindLabel =
    state.walletKind === "contract" ? "Smart-contract wallet" : "EOA";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <CheckCircle2
          className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-content-primary">
            Wallet active — donations enabled
          </p>
          <p className="font-mono text-xs text-content-secondary break-all mt-1">
            {state.walletAddress}
          </p>
          <p className="text-xs text-content-muted mt-1">
            {kindLabel}
            {formattedDate ? ` · designated ${formattedDate}` : null}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 p-2.5 bg-surface-sunken rounded text-xs text-content-muted">
        <ShieldAlert
          className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          Changing this wallet starts a 72-hour cooling-off period. Donations
          continue flowing to the current wallet until the new one is activated.
        </p>
      </div>
      <Button variant="secondary" onClick={onChange}>
        Change wallet
      </Button>
    </div>
  );
}

/** Format milliseconds remaining as "Xd Yh", "Xh Ym", or "<1m". */
function formatRemaining(ms: number): string {
  if (ms <= 60 * 1000) return "less than a minute";
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes - days * 60 * 24 - hours * 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Panel shown during the 72h cooldown — countdown, both addresses, cancel button. */
function CooldownPanel({
  state,
  cancelling,
  onCancel,
}: {
  state: DesignationState;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    state.pendingWalletEffectiveAt
      ? Math.max(
          0,
          new Date(state.pendingWalletEffectiveAt).getTime() - Date.now(),
        )
      : 0,
  );

  useEffect(() => {
    if (!state.pendingWalletEffectiveAt) return undefined;
    const target = new Date(state.pendingWalletEffectiveAt).getTime();
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, target - Date.now()));
    }, 30_000);
    return () => window.clearInterval(id);
  }, [state.pendingWalletEffectiveAt]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
        <Timer
          className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <p className="font-medium">
            Wallet change in {formatRemaining(remainingMs)}
          </p>
          <p className="mt-0.5">
            Donations continue to flow to your current wallet during the
            cooldown. Cancel below if this change wasn&apos;t authorized.
          </p>
        </div>
      </div>
      <dl className="text-xs space-y-1.5">
        <div className="flex gap-2">
          <dt className="text-content-muted w-28 flex-shrink-0">Current:</dt>
          <dd className="font-mono text-content-secondary break-all">
            {state.walletAddress}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-content-muted w-28 flex-shrink-0">Changing to:</dt>
          <dd className="font-mono text-emerald-700 dark:text-emerald-400 break-all">
            {state.pendingWalletAddress}
          </dd>
        </div>
      </dl>
      <Button
        variant="danger"
        onClick={onCancel}
        disabled={cancelling}
        icon={
          cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
        }
      >
        {cancelling ? "Cancelling…" : "Cancel this change"}
      </Button>
    </div>
  );
}
