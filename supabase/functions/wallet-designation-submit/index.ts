/**
 * Supabase Edge Function: wallet-designation-submit
 *
 * Consumes a nonce + signature pair, verifies the signature against the
 * candidate address (EOA via ecrecover, contract via EIP-1271), and either:
 *  - For EOAs: writes status = 'pending_email_confirmation' and sends
 *    the confirmation email immediately.
 *  - For verified contract wallets (Safe threshold already met): same as EOA.
 *  - For contract wallets whose isValidSignature returns false (Safe still
 *    collecting signers): persists the pending sig and sets status =
 *    'pending_signature_verification'; client can re-poll via
 *    wallet-designation-recheck.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import { buildDesignationMessage } from "../_shared/wallet-designation-message.ts";
import { promoteToPendingEmail } from "../_shared/wallet-designation-promote.ts";

const PENDING_CONTRACT_SIG_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MOONBASE_CHAIN_ID = 1287;
const MOONBASE_RPC_URL = "https://rpc.api.moonbase.moonbeam.network";
const EIP_1271_MAGIC_VALUE = "0x1626ba7e";
const ISVALIDSIGNATURE_ABI = [
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  nonce: string;
  signature: string;
}

interface NonceRow {
  nonce: string;
  user_id: string;
  charity_profile_id: string;
  candidate_address: string;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
}

interface CharityProfileRow {
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

function validateBody(body: unknown): body is RequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.nonce === "string" && typeof b.signature === "string";
}

function readIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/**
 * EIP-1271 verification: call isValidSignature on the contract wallet.
 * Returns true if the contract acknowledges the signature, false if it
 * does not, and null if the call itself reverted (treated as "pending,"
 * since Safes revert when they have not yet collected enough signers).
 */
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
  } catch (err) {
    console.warn(
      "isValidSignature reverted (likely pending Safe threshold):",
      err,
    );
    return null;
  }
}

async function getCodeAt(address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(MOONBASE_RPC_URL);
  return provider.getCode(address);
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
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? undefined;
  const publicAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ?? "https://giveprotocol.io";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }
  if (!resendApiKey) {
    return jsonResponse(
      { success: false, error: "Email service not configured" },
      503,
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }
  if (!validateBody(body)) {
    return jsonResponse(
      { success: false, error: "Required: nonce, signature" },
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
  if (userError || !user || !user.email) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Consume nonce atomically: only the first writer to flip consumed_at wins.
  const { data: nonceData, error: nonceError } = await serviceClient
    .from("wallet_designation_nonces")
    .update({ consumed_at: new Date().toISOString() })
    .eq("nonce", body.nonce)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select()
    .maybeSingle();

  if (nonceError || !nonceData) {
    return jsonResponse(
      { success: false, error: "Invalid, expired, or already-used nonce" },
      400,
    );
  }
  const nonce = nonceData as NonceRow;
  if (nonce.user_id !== user.id) {
    return jsonResponse({ success: false, error: "Forbidden" }, 403);
  }

  const { data: profileData, error: profileError } = await serviceClient
    .from("charity_profiles")
    .select("id, name, claimed_by, authorized_signer_email, wallet_address")
    .eq("id", nonce.charity_profile_id)
    .maybeSingle();
  if (profileError || !profileData) {
    return jsonResponse(
      { success: false, error: "Charity profile not found" },
      404,
    );
  }
  const profile = profileData as CharityProfileRow;
  if (profile.claimed_by !== user.id) {
    return jsonResponse({ success: false, error: "Forbidden" }, 403);
  }
  if (!profile.authorized_signer_email) {
    return jsonResponse(
      {
        success: false,
        error:
          "Charity has no authorized_signer_email on file. Update profile first.",
      },
      400,
    );
  }

  const message = buildDesignationMessage({
    charityName: profile.name,
    charityProfileId: profile.id,
    candidateAddress: nonce.candidate_address,
    userEmail: user.email,
    chainId: MOONBASE_CHAIN_ID,
    issuedAt: nonce.issued_at,
    nonce: nonce.nonce,
  });

  const code = await getCodeAt(nonce.candidate_address);
  const isContract = code !== "0x" && code !== "0x0";

  let walletKind: "eoa" | "contract";
  let signatureValidNow: boolean | null;

  if (!isContract) {
    walletKind = "eoa";
    try {
      const recovered = ethers.verifyMessage(message, body.signature);
      signatureValidNow =
        recovered.toLowerCase() === nonce.candidate_address.toLowerCase();
    } catch (err) {
      console.error("ecrecover failed:", err);
      signatureValidNow = false;
    }
    if (!signatureValidNow) {
      return jsonResponse(
        { success: false, error: "Signature verification failed" },
        401,
      );
    }
  } else {
    walletKind = "contract";
    const messageHash = ethers.hashMessage(message);
    signatureValidNow = await verifyContractSignature(
      nonce.candidate_address,
      messageHash,
      body.signature,
    );
  }

  const ip = readIp(req);
  const userAgent = req.headers.get("user-agent");

  // Contract sig that has not yet reached threshold — park it.
  if (walletKind === "contract" && signatureValidNow !== true) {
    const expiresAt = new Date(
      Date.now() + PENDING_CONTRACT_SIG_TTL_MS,
    ).toISOString();
    const messageHash = ethers.hashMessage(message);

    const { error: pendingError } = await serviceClient
      .from("wallet_designation_pending_contract_sigs")
      .insert({
        charity_profile_id: profile.id,
        candidate_address: nonce.candidate_address,
        message_hash: messageHash,
        signature: body.signature,
        message,
        chain_id: MOONBASE_CHAIN_ID,
        initiated_by: user.id,
        expires_at: expiresAt,
      });

    if (pendingError) {
      console.error("Failed to persist pending sig:", pendingError);
      return jsonResponse(
        { success: false, error: "Could not record pending signature" },
        500,
      );
    }

    await serviceClient
      .from("charity_profiles")
      .update({ wallet_designation_status: "pending_signature_verification" })
      .eq("id", profile.id);

    await serviceClient.from("charity_wallet_designations_history").insert({
      charity_profile_id: profile.id,
      changed_by: user.id,
      previous_address: profile.wallet_address,
      new_address: nonce.candidate_address,
      wallet_kind: "contract",
      signature: body.signature,
      message,
      chain_id: MOONBASE_CHAIN_ID,
      ip,
      user_agent: userAgent,
      action: "contract_signature_pending",
    });

    return jsonResponse(
      {
        success: true,
        status: "pending_signature_verification",
        candidateAddress: nonce.candidate_address,
        expiresAt,
      },
      200,
    );
  }

  // Signature accepted — promote to pending_email_confirmation.
  try {
    await promoteToPendingEmail({
      serviceClient,
      publicAppUrl,
      supabaseUrl,
      supabaseServiceKey,
      resendApiKey,
      resendFromEmail,
      profile,
      candidateAddress: nonce.candidate_address,
      walletKind,
      chainId: MOONBASE_CHAIN_ID,
      initiatedBy: { id: user.id, email: user.email },
      signature: body.signature,
      message,
      ip,
      userAgent,
    });
  } catch (err) {
    console.error("Promotion to pending_email failed:", err);
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "Promotion failed",
      },
      500,
    );
  }

  return jsonResponse(
    {
      success: true,
      status: "pending_email_confirmation",
      sentToEmail: profile.authorized_signer_email,
      candidateAddress: nonce.candidate_address,
    },
    200,
  );
});
