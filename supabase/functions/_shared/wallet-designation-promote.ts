/**
 * Promote a verified wallet designation to the pending_email_confirmation
 * stage: write audit row, flip profile status, send confirmation email.
 *
 * Shared between the synchronous EOA path in wallet-designation-submit and
 * the async contract-recheck path in wallet-designation-recheck.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWalletDesignationConfirmation } from "./wallet-designation-email.ts";

export interface PromoteProfile {
  id: string;
  name: string;
  authorized_signer_email: string | null;
  wallet_address: string | null;
}

export interface PromoteInitiator {
  id: string;
  email: string | null;
}

export interface PromoteArgs {
  serviceClient: SupabaseClient;
  publicAppUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  resendFromEmail?: string;
  profile: PromoteProfile;
  candidateAddress: string;
  walletKind: "eoa" | "contract";
  chainId: number;
  initiatedBy: PromoteInitiator;
  signature: string;
  message: string;
  ip: string | null;
  userAgent: string | null;
}

export async function promoteToPendingEmail(args: PromoteArgs): Promise<void> {
  if (!args.profile.authorized_signer_email) {
    throw new Error(
      "Cannot send confirmation: charity has no authorized_signer_email",
    );
  }

  await args.serviceClient.from("charity_wallet_designations_history").insert({
    charity_profile_id: args.profile.id,
    changed_by: args.initiatedBy.id,
    previous_address: args.profile.wallet_address,
    new_address: args.candidateAddress,
    wallet_kind: args.walletKind,
    signature: args.signature,
    message: args.message,
    chain_id: args.chainId,
    ip: args.ip,
    user_agent: args.userAgent,
    action:
      args.walletKind === "contract"
        ? "contract_signature_verified"
        : "initial_designation_submitted",
  });

  await args.serviceClient
    .from("charity_profiles")
    .update({
      wallet_designation_status: "pending_email_confirmation",
      wallet_kind: args.walletKind,
      wallet_designation_signature: args.signature,
      wallet_designation_message: args.message,
      wallet_designation_chain_id: args.chainId,
      // wallet_address stays at the prior value until email confirmation flips
      // status to 'active'. This protects donations to the previous wallet
      // during the confirmation window.
    })
    .eq("id", args.profile.id);

  await sendWalletDesignationConfirmation({
    supabaseUrl: args.supabaseUrl,
    supabaseServiceKey: args.supabaseServiceKey,
    resendApiKey: args.resendApiKey,
    resendFromEmail: args.resendFromEmail,
    publicAppUrl: args.publicAppUrl,
    charityProfileId: args.profile.id,
    charityName: args.profile.name,
    candidateAddress: args.candidateAddress,
    walletKind: args.walletKind,
    chainId: args.chainId,
    initiatedByEmail: args.initiatedBy.email ?? "(unknown)",
    signature: args.signature,
    message: args.message,
    toEmail: args.profile.authorized_signer_email,
  });
}
