/**
 * Hook for driving the wallet-designation flow from the charity portal UI.
 *
 * State machine:
 *   idle → requesting_nonce → awaiting_signature → submitting →
 *     - pending_email   (signature accepted, email sent — user must click link)
 *     - pending_safe    (Safe still collecting signers — re-poll later)
 *     - error           (any failure; surface message; user can retry)
 */

import { useCallback, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import {
  requestNonce,
  submitSignature,
  recheckPending,
} from "@/services/walletDesignationService";
import { Logger } from "@/utils/logger";

export type DesignationPhase =
  | "idle"
  | "requesting_nonce"
  | "awaiting_signature"
  | "submitting"
  | "pending_email"
  | "pending_safe"
  | "error";

export interface UseWalletDesignationResult {
  phase: DesignationPhase;
  error: string | null;
  sentToEmail: string | null;
  candidateAddress: string | null;
  /** Kick off the flow with the wallet currently connected via Web3Context. */
  start: (_charityProfileId: string) => Promise<void>;
  /** Manually re-check pending Safe signatures for this profile. */
  recheck: (_charityProfileId: string) => Promise<void>;
  /** Reset back to idle (e.g. when closing the modal). */
  reset: () => void;
}

/**
 * Drives the wallet-designation state machine from the charity portal UI.
 * Wraps the request-nonce → sign → submit flow with optional Safe polling.
 * @returns Phase, error, candidate address, and the start/recheck/reset controls.
 */
export function useWalletDesignation(): UseWalletDesignationResult {
  const { signer, address, isConnected } = useWeb3();
  const [phase, setPhase] = useState<DesignationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [candidateAddress, setCandidateAddress] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setSentToEmail(null);
    setCandidateAddress(null);
  }, []);

  const start = useCallback(
    async (charityProfileId: string) => {
      if (!isConnected || !signer || !address) {
        setError("Connect a wallet first");
        setPhase("error");
        return;
      }
      setError(null);
      setCandidateAddress(address);

      setPhase("requesting_nonce");
      const nonceResult = await requestNonce(charityProfileId, address);
      if (!nonceResult.ok) {
        setError(nonceResult.error);
        setPhase("error");
        return;
      }

      setPhase("awaiting_signature");
      let signature: string;
      try {
        signature = await signer.signMessage(nonceResult.data.message);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Signing failed";
        Logger.warn("User cancelled or wallet rejected signature", { message });
        setError(
          message.toLowerCase().includes("reject")
            ? "Signature was rejected"
            : message,
        );
        setPhase("error");
        return;
      }

      setPhase("submitting");
      const submitResult = await submitSignature(
        nonceResult.data.nonce,
        signature,
      );
      if (!submitResult.ok) {
        setError(submitResult.error);
        setPhase("error");
        return;
      }

      if (submitResult.data.status === "pending_email_confirmation") {
        setSentToEmail(submitResult.data.sentToEmail ?? null);
        setPhase("pending_email");
      } else {
        setPhase("pending_safe");
      }
    },
    [isConnected, signer, address],
  );

  const recheck = useCallback(async (charityProfileId: string) => {
    const result = await recheckPending(charityProfileId);
    if (!result.ok) {
      setError(result.error);
      setPhase("error");
      return;
    }
    const verified = result.data.results.find((r) => r.outcome === "verified");
    if (verified) {
      // Server has already sent the email; ask user to check inbox.
      setPhase("pending_email");
    }
    const expired = result.data.results.find((r) => r.outcome === "expired");
    if (expired && !verified) {
      setError(
        "The Safe signature window expired before threshold was reached. Please restart.",
      );
      setPhase("error");
    }
    // Otherwise: still_pending — leave phase as 'pending_safe'.
  }, []);

  return {
    phase,
    error,
    sentToEmail,
    candidateAddress,
    start,
    recheck,
    reset,
  };
}
