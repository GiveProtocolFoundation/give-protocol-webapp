import { useState, useEffect, useCallback } from "react";
import type {
  CfiaAcceptance,
  CfiaAcceptanceFlowState,
  RecordCfiaAcceptanceParams,
} from "@/types/cfiaAcceptance";
import {
  getCfiaAcceptance,
  recordCfiaAcceptance,
} from "@/services/cfiaAcceptanceService";
import { Logger } from "@/utils/logger";

/**
 * The current CFIA legal text version identifier.
 * Updated when new legal text is finalized and deployed.
 * While the legal text is not yet finalized, this placeholder prevents
 * the flow from activating (the UI checks CFIA_ENABLED below).
 */
export const CFIA_CURRENT_VERSION = "cfia-v1.0-draft";

/**
 * Feature gate: set to true once the CFIA legal text is finalized
 * and ready for charity acceptance. Until then, the entire flow
 * is hidden from the UI.
 */
export const CFIA_ENABLED = false;

interface UseCfiaAcceptanceResult {
  /** Current flow state */
  flowState: CfiaAcceptanceFlowState;
  /** The existing acceptance record, if any */
  acceptance: CfiaAcceptance | null;
  /** Whether the CFIA feature is enabled */
  isEnabled: boolean;
  /** Submit a new acceptance */
  submit: (_params: Omit<RecordCfiaAcceptanceParams, "charityProfileId" | "legalTextVersion">) => Promise<boolean>;
  /** Advance from reviewing to signing */
  proceedToSigning: () => void;
  /** Go back from signing to reviewing */
  backToReviewing: () => void;
  /** Error message if in error state */
  errorMessage: string | null;
}

/**
 * Hook managing the CFIA acceptance flow for a given charity profile.
 * Loads existing acceptance on mount; provides submit/state-transition helpers.
 *
 * @param charityProfileId - The charity profile UUID
 * @returns CFIA acceptance state and actions
 */
export function useCfiaAcceptance(
  charityProfileId: string | null,
): UseCfiaAcceptanceResult {
  const [flowState, setFlowState] =
    useState<CfiaAcceptanceFlowState>("loading");
  const [acceptance, setAcceptance] = useState<CfiaAcceptance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing acceptance on mount
  useEffect(() => {
    let cancelled = false;

    /** Loads the existing CFIA acceptance from the database. */
    const load = async () => {
      if (!charityProfileId || !CFIA_ENABLED) {
        setFlowState(CFIA_ENABLED ? "loading" : "not_available");
        return;
      }

      try {
        const existing = await getCfiaAcceptance(
          charityProfileId,
          CFIA_CURRENT_VERSION,
        );
        if (cancelled) return;

        if (existing) {
          setAcceptance(existing);
          setFlowState("accepted");
        } else {
          setFlowState("pending");
        }
      } catch (err) {
        if (cancelled) return;
        Logger.error("Failed to load CFIA acceptance", {
          error: err instanceof Error ? err.message : String(err),
          charityProfileId,
        });
        setFlowState("error");
        setErrorMessage("Failed to load agreement status.");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [charityProfileId]);

  const proceedToSigning = useCallback(() => {
    setFlowState("signing");
  }, []);

  const backToReviewing = useCallback(() => {
    setFlowState("reviewing");
  }, []);

  const submit = useCallback(
    async (
      params: Omit<
        RecordCfiaAcceptanceParams,
        "charityProfileId" | "legalTextVersion"
      >,
    ): Promise<boolean> => {
      if (!charityProfileId) return false;

      setFlowState("submitting");
      setErrorMessage(null);

      try {
        const result = await recordCfiaAcceptance({
          charityProfileId,
          legalTextVersion: CFIA_CURRENT_VERSION,
          ...params,
        });

        if (result) {
          setAcceptance(result);
          setFlowState("accepted");
          return true;
        }

        setFlowState("error");
        setErrorMessage(
          "Failed to record acceptance. Please try again.",
        );
        return false;
      } catch (err) {
        Logger.error("CFIA acceptance submission failed", {
          error: err instanceof Error ? err.message : String(err),
          charityProfileId,
        });
        setFlowState("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
        return false;
      }
    },
    [charityProfileId],
  );

  return {
    flowState,
    acceptance,
    isEnabled: CFIA_ENABLED,
    submit,
    proceedToSigning,
    backToReviewing,
    errorMessage,
  };
}
