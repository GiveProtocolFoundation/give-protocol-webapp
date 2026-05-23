/**
 * Client-side service for the charity wallet-designation flow.
 *
 * Wraps the four edge functions:
 *  - wallet-designation-request-nonce
 *  - wallet-designation-submit
 *  - wallet-designation-recheck
 *  - wallet-designation-confirm
 *
 * Components and hooks should call these functions rather than writing
 * to charity_profiles.wallet_address directly. Direct writes are blocked
 * by RLS — only the service-role edge functions can update the column.
 */

import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

export type WalletDesignationStatus =
  | "unset"
  | "pending_signature_verification"
  | "pending_email_confirmation"
  | "active"
  | "pending_change_cooldown";

export interface RequestNonceResult {
  nonce: string;
  message: string;
  expiresAt: string;
  chainId: number;
}

export interface SubmitResult {
  status: "pending_signature_verification" | "pending_email_confirmation";
  candidateAddress: string;
  sentToEmail?: string;
  expiresAt?: string;
  /** True when the submit was a CHANGE (profile already had an active wallet). */
  isChange?: boolean;
}

export interface CancelResult {
  source: "email_link" | "dashboard";
}

export interface RecheckResultRow {
  pendingId: string;
  outcome: "verified" | "still_pending" | "expired" | "skipped";
  reason?: string;
}

export interface RecheckResult {
  results: RecheckResultRow[];
}

export interface ConfirmResult {
  walletAddress: string;
  activatedAt: string;
}

/** Discriminated outcome — the success/error split callers care about. */
type ServiceOutcome<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Request a one-time nonce + canonical message for the user to sign with
 * the candidate wallet. Caller must be authenticated and own the charity
 * profile (claimed_by).
 */
export async function requestNonce(
  charityProfileId: string,
  candidateAddress: string,
): Promise<ServiceOutcome<RequestNonceResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-request-nonce",
      { body: { charityProfileId, candidateAddress } },
    );
    if (error) {
      Logger.error("wallet-designation-request-nonce failed", { error });
      return { ok: false, error: error.message ?? "Request failed" };
    }
    const resp = data as {
      success?: boolean;
      error?: string;
    } & RequestNonceResult;
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Request failed" };
    }
    return {
      ok: true,
      data: {
        nonce: resp.nonce,
        message: resp.message,
        expiresAt: resp.expiresAt,
        chainId: resp.chainId,
      },
    };
  } catch (err) {
    Logger.error("requestNonce threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

/**
 * Submit the signed attestation. Returns the next state the profile is
 * in: either pending_email_confirmation (signature verified, email sent)
 * or pending_signature_verification (Safe still collecting signers).
 */
export async function submitSignature(
  nonce: string,
  signature: string,
): Promise<ServiceOutcome<SubmitResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-submit",
      { body: { nonce, signature } },
    );
    if (error) {
      Logger.error("wallet-designation-submit failed", { error });
      return { ok: false, error: error.message ?? "Submit failed" };
    }
    const resp = data as { success?: boolean; error?: string } & SubmitResult;
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Submit failed" };
    }
    return {
      ok: true,
      data: {
        status: resp.status,
        candidateAddress: resp.candidateAddress,
        sentToEmail: resp.sentToEmail,
        expiresAt: resp.expiresAt,
        isChange: (resp as { isChange?: boolean }).isChange,
      },
    };
  } catch (err) {
    Logger.error("submitSignature threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Submit failed",
    };
  }
}

/**
 * Trigger a re-check of any pending contract-wallet signatures for the
 * given charity profile. Used when the user clicks "Re-check now" on the
 * portal while waiting for their Safe to collect signers.
 */
export async function recheckPending(
  charityProfileId: string,
): Promise<ServiceOutcome<RecheckResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-recheck",
      { body: { charityProfileId } },
    );
    if (error) {
      Logger.error("wallet-designation-recheck failed", { error });
      return { ok: false, error: error.message ?? "Recheck failed" };
    }
    const resp = data as {
      success?: boolean;
      error?: string;
      results?: RecheckResultRow[];
    };
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Recheck failed" };
    }
    return { ok: true, data: { results: resp.results ?? [] } };
  } catch (err) {
    Logger.error("recheckPending threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Recheck failed",
    };
  }
}

/**
 * Confirm the wallet via the email magic-link token. Unauthenticated —
 * the token itself is the proof. Called from the
 * /charity-portal/confirm-wallet route.
 */
export async function confirmWalletByToken(
  token: string,
): Promise<ServiceOutcome<ConfirmResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-confirm",
      { body: { token } },
    );
    if (error) {
      Logger.error("wallet-designation-confirm failed", { error });
      return { ok: false, error: error.message ?? "Confirm failed" };
    }
    const resp = data as { success?: boolean; error?: string } & ConfirmResult;
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Confirm failed" };
    }
    return {
      ok: true,
      data: {
        walletAddress: resp.walletAddress,
        activatedAt: resp.activatedAt,
      },
    };
  } catch (err) {
    Logger.error("confirmWalletByToken threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Confirm failed",
    };
  }
}

/**
 * Cancel a wallet change that is currently in cooldown. Initiated from the
 * dashboard (authenticated, server verifies caller is claimed_by). The
 * other cancel path — email magic link — is handled by the
 * /charity-portal/cancel-wallet-change page calling
 * `cancelWalletChangeByToken` with the unauthenticated token.
 */
export async function cancelWalletChange(
  charityProfileId: string,
): Promise<ServiceOutcome<CancelResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-cancel",
      { body: { charityProfileId } },
    );
    if (error) {
      Logger.error("wallet-designation-cancel (dashboard) failed", { error });
      return { ok: false, error: error.message ?? "Cancel failed" };
    }
    const resp = data as {
      success?: boolean;
      error?: string;
      source?: "email_link" | "dashboard";
    };
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Cancel failed" };
    }
    return { ok: true, data: { source: resp.source ?? "dashboard" } };
  } catch (err) {
    Logger.error("cancelWalletChange threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Cancel failed",
    };
  }
}

/**
 * Cancel a pending wallet change via the email magic-link token.
 * Unauthenticated — the token itself is the proof.
 */
export async function cancelWalletChangeByToken(
  token: string,
): Promise<ServiceOutcome<CancelResult>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "wallet-designation-cancel",
      { body: { token } },
    );
    if (error) {
      Logger.error("wallet-designation-cancel (token) failed", { error });
      return { ok: false, error: error.message ?? "Cancel failed" };
    }
    const resp = data as {
      success?: boolean;
      error?: string;
      source?: "email_link" | "dashboard";
    };
    if (!resp.success) {
      return { ok: false, error: resp.error ?? "Cancel failed" };
    }
    return { ok: true, data: { source: resp.source ?? "email_link" } };
  } catch (err) {
    Logger.error("cancelWalletChangeByToken threw", { error: err });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Cancel failed",
    };
  }
}

/**
 * Fetch the current designation status + wallet address for a charity
 * profile. Used by the DesignatedWalletCard and the onboarding checklist
 * to render the correct state. Includes pending_wallet_* fields for the
 * cooldown panel.
 */
export async function getDesignationState(charityProfileId: string): Promise<{
  status: WalletDesignationStatus;
  walletAddress: string | null;
  walletKind: "eoa" | "contract" | null;
  designatedAt: string | null;
  pendingWalletAddress: string | null;
  pendingWalletEffectiveAt: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from("charity_profiles")
      .select(
        "wallet_designation_status, wallet_address, wallet_kind, wallet_designated_at, pending_wallet_address, pending_wallet_effective_at",
      )
      .eq("id", charityProfileId)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    const row = data as {
      wallet_designation_status: WalletDesignationStatus;
      wallet_address: string | null;
      wallet_kind: "eoa" | "contract" | null;
      wallet_designated_at: string | null;
      pending_wallet_address: string | null;
      pending_wallet_effective_at: string | null;
    };
    return {
      status: row.wallet_designation_status ?? "unset",
      walletAddress: row.wallet_address,
      walletKind: row.wallet_kind,
      designatedAt: row.wallet_designated_at,
      pendingWalletAddress: row.pending_wallet_address ?? null,
      pendingWalletEffectiveAt: row.pending_wallet_effective_at ?? null,
    };
  } catch (err) {
    Logger.error("getDesignationState threw", { error: err });
    return null;
  }
}
