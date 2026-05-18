/**
 * Supabase Edge Function: wallet-designation-recheck
 *
 * Re-checks a charity's pending contract-wallet signatures by calling
 * EIP-1271 isValidSignature() on-chain. If the Safe has now reached its
 * signer threshold, promotes the designation to pending_email_confirmation
 * (which sends the magic-link email). If the pending row is past its
 * expiry, marks it expired and clears the profile status.
 *
 * Auth modes:
 *  - With Authorization header: the authenticated user can recheck only
 *    pending rows belonging to a charity_profile they own (claimed_by).
 *  - Without Authorization header but with x-cron-secret matching
 *    CRON_SHARED_SECRET: rechecks ALL pending rows (used by pg_cron).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import { promoteToPendingEmail } from "../_shared/wallet-designation-promote.ts";

const MOONBASE_RPC_URL = "https://rpc.api.moonbase.moonbeam.network";
const EIP_1271_MAGIC_VALUE = "0x1626ba7e";
const ISVALIDSIGNATURE_ABI = [
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PendingSigRow {
  id: string;
  charity_profile_id: string;
  candidate_address: string;
  message_hash: string;
  signature: string;
  message: string;
  chain_id: number;
  initiated_by: string;
  expires_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
  claimed_by: string | null;
  authorized_signer_email: string | null;
  wallet_address: string | null;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyContractSignature(
  contractAddress: string,
  messageHash: string,
  signature: string,
): Promise<boolean | null> {
  try {
    const provider = new ethers.JsonRpcProvider(MOONBASE_RPC_URL);
    const contract = new ethers.Contract(
      contractAddress,
      ISVALIDSIGNATURE_ABI,
      provider,
    );
    const result: string = await contract.isValidSignature(
      messageHash,
      signature,
    );
    return result.toLowerCase() === EIP_1271_MAGIC_VALUE;
  } catch {
    return null;
  }
}

interface ProcessOneArgs {
  serviceClient: SupabaseClient;
  pending: PendingSigRow;
  publicAppUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
}

interface ProcessOneResult {
  pendingId: string;
  outcome: "verified" | "still_pending" | "expired" | "skipped";
  reason?: string;
}

async function processOne(args: ProcessOneArgs): Promise<ProcessOneResult> {
  const { serviceClient, pending } = args;

  // Expiry check first.
  if (new Date(pending.expires_at).getTime() <= Date.now()) {
    await serviceClient
      .from("wallet_designation_pending_contract_sigs")
      .delete()
      .eq("id", pending.id);

    await serviceClient
      .from("charity_profiles")
      .update({ wallet_designation_status: "unset" })
      .eq("id", pending.charity_profile_id)
      .eq("wallet_designation_status", "pending_signature_verification");

    await serviceClient.from("charity_wallet_designations_history").insert({
      charity_profile_id: pending.charity_profile_id,
      changed_by: pending.initiated_by,
      new_address: pending.candidate_address,
      wallet_kind: "contract",
      action: "expired",
    });

    return { pendingId: pending.id, outcome: "expired" };
  }

  const isValid = await verifyContractSignature(
    pending.candidate_address,
    pending.message_hash,
    pending.signature,
  );

  await serviceClient
    .from("wallet_designation_pending_contract_sigs")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", pending.id);

  if (isValid !== true) {
    return { pendingId: pending.id, outcome: "still_pending" };
  }

  // Promote: load profile + initiator email.
  const { data: profileData } = await serviceClient
    .from("charity_profiles")
    .select("id, name, claimed_by, authorized_signer_email, wallet_address")
    .eq("id", pending.charity_profile_id)
    .maybeSingle();
  if (!profileData) {
    return {
      pendingId: pending.id,
      outcome: "skipped",
      reason: "profile_missing",
    };
  }
  const profile = profileData as ProfileRow;
  if (!profile.authorized_signer_email) {
    return {
      pendingId: pending.id,
      outcome: "skipped",
      reason: "no_authorized_signer_email",
    };
  }

  const { data: userData } =
    await serviceClient.auth.admin.getUserById(pending.initiated_by);
  const initiatorEmail = userData?.user?.email ?? null;

  try {
    await promoteToPendingEmail({
      serviceClient,
      publicAppUrl: args.publicAppUrl,
      supabaseUrl: args.supabaseUrl,
      supabaseServiceKey: args.supabaseServiceKey,
      resendApiKey: args.resendApiKey,
      profile,
      candidateAddress: pending.candidate_address,
      walletKind: "contract",
      chainId: pending.chain_id,
      initiatedBy: { id: pending.initiated_by, email: initiatorEmail },
      signature: pending.signature,
      message: pending.message,
      ip: null,
      userAgent: null,
    });
  } catch (err) {
    console.error(
      `Failed to promote pending sig ${pending.id}:`,
      err,
    );
    return {
      pendingId: pending.id,
      outcome: "skipped",
      reason: "promote_failed",
    };
  }

  // Remove the pending row — designation has moved on.
  await serviceClient
    .from("wallet_designation_pending_contract_sigs")
    .delete()
    .eq("id", pending.id);

  return { pendingId: pending.id, outcome: "verified" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const cronSecret = Deno.env.get("CRON_SHARED_SECRET");
  const publicAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ?? "https://giveprotocol.io";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !resendApiKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("Authorization");
  const xCron = req.headers.get("x-cron-secret");

  let scope: { pending: PendingSigRow[] };

  if (xCron && cronSecret && xCron === cronSecret) {
    // Cron mode: process every non-expired pending row.
    const { data, error } = await serviceClient
      .from("wallet_designation_pending_contract_sigs")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      return jsonResponse(
        { success: false, error: "Could not load pending sigs" },
        500,
      );
    }
    scope = { pending: (data ?? []) as PendingSigRow[] };
  } else if (authHeader) {
    // User mode: scope to the caller's owned profile(s).
    let body: { charityProfileId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body
    }
    if (!body.charityProfileId) {
      return jsonResponse(
        { success: false, error: "Required: charityProfileId" },
        400,
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const { data: profile } = await serviceClient
      .from("charity_profiles")
      .select("id, claimed_by")
      .eq("id", body.charityProfileId)
      .maybeSingle();
    if (!profile || (profile as { claimed_by: string | null }).claimed_by !== user.id) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    const { data } = await serviceClient
      .from("wallet_designation_pending_contract_sigs")
      .select("*")
      .eq("charity_profile_id", body.charityProfileId);
    scope = { pending: (data ?? []) as PendingSigRow[] };
  } else {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const results: ProcessOneResult[] = [];
  for (const pending of scope.pending) {
    const r = await processOne({
      serviceClient,
      pending,
      publicAppUrl,
      supabaseUrl,
      supabaseServiceKey,
      resendApiKey,
    });
    results.push(r);
  }

  return jsonResponse({ success: true, results }, 200);
});
