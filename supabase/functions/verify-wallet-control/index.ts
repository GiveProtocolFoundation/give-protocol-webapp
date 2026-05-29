/**
 * Supabase Edge Function: verify-wallet-control
 *
 * Verifies proof-of-control for a charity wallet (EOA or Safe multisig)
 * and inserts a verified row into the charity_wallets table.
 *
 * EOA path: ethers.verifyMessage() confirms the wallet_address signed the message.
 * Safe path: EIP-1271 isValidSignature() call against the Safe contract,
 *   plus on-chain getOwners()/getThreshold() validation.
 *
 * Part of GIV-285 Phase 2 (charity wallet management).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";

// ── Constants ──────────────────────────────────────────────────────────

const EIP_1271_MAGIC_VALUE = "0x1626ba7e";

const ISVALIDSIGNATURE_ABI = [
  "function isValidSignature(bytes32 _hash, bytes _signature) view returns (bytes4)",
];

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
];

/**
 * Supported chain IDs → public RPC endpoints.
 * Mirrors src/config/chains/evm.ts (cannot import directly in Deno edge functions).
 */
const CHAIN_RPC_MAP: Record<number, string> = {
  // Mainnets
  8453: "https://mainnet.base.org", // Base
  10: "https://mainnet.optimism.io", // Optimism
  1284: "https://rpc.api.moonbeam.network", // Moonbeam
  43114: "https://api.avax.network/ext/bc/C/rpc", // Avalanche
  1: "https://eth.llamarpc.com", // Ethereum
  // Testnets
  84532: "https://sepolia.base.org", // Base Sepolia
  11155420: "https://sepolia.optimism.io", // Optimism Sepolia
  1287: "https://rpc.api.moonbase.moonbeam.network", // Moonbase Alpha
  43113: "https://api.avax-test.network/ext/bc/C/rpc", // Avalanche Fuji
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Types ──────────────────────────────────────────────────────────────

interface RequestBody {
  charity_profile_id: string;
  wallet_address: string;
  chain_id: number;
  wallet_type: "eoa" | "safe";
  signature: string;
  message: string;
  signer_count?: number;
  signer_threshold?: number;
}

interface ErrorCode {
  code: string;
  message: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  { code, message }: ErrorCode,
  httpStatus: number,
): Response {
  return jsonResponse({ success: false, error: code, message }, httpStatus);
}

function validateBody(body: unknown): body is RequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.charity_profile_id !== "string") return false;
  if (typeof b.wallet_address !== "string") return false;
  if (typeof b.chain_id !== "number") return false;
  if (b.wallet_type !== "eoa" && b.wallet_type !== "safe") return false;
  if (typeof b.signature !== "string") return false;
  if (typeof b.message !== "string") return false;
  if (
    b.wallet_type === "safe" &&
    (typeof b.signer_count !== "number" ||
      typeof b.signer_threshold !== "number")
  ) {
    return false;
  }
  return true;
}

function getRpcUrl(chainId: number): string | undefined {
  return CHAIN_RPC_MAP[chainId];
}

/**
 * Verify an EOA signature via ethers.verifyMessage (EIP-191).
 * @returns true if the recovered address matches wallet_address.
 */
function verifyEOASignature(
  message: string,
  signature: string,
  walletAddress: string,
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === walletAddress.toLowerCase();
  } catch (err) {
    console.error("EOA signature verification failed:", err);
    return false;
  }
}

/**
 * Verify a Safe (contract) signature via EIP-1271 isValidSignature.
 * @returns true if the contract returns the magic value, false otherwise.
 */
async function verifySafeSignature(
  rpcUrl: string,
  contractAddress: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const messageHash = ethers.hashMessage(message);
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
    console.error("EIP-1271 isValidSignature call failed:", err);
    return false;
  }
}

/**
 * Fetch on-chain Safe owners and threshold.
 * @returns Object with owners array and threshold, or null on failure.
 */
async function fetchSafeInfo(
  rpcUrl: string,
  safeAddress: string,
): Promise<{ owners: string[]; threshold: number } | null> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
    const [owners, threshold] = await Promise.all([
      contract.getOwners() as Promise<string[]>,
      contract.getThreshold() as Promise<bigint>,
    ]);
    return {
      owners: owners.map((o: string) => o.toLowerCase()),
      threshold: Number(threshold),
    };
  } catch (err) {
    console.error("Failed to fetch Safe info from chain:", err);
    return null;
  }
}

// ── Main Handler ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse(
      { code: "METHOD_NOT_ALLOWED", message: "Only POST is accepted" },
      405,
    );
  }

  // ── Environment ──────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return errorResponse(
      { code: "SERVER_ERROR", message: "Server configuration error" },
      503,
    );
  }

  // ── Auth ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse(
      { code: "NOT_OWNER", message: "Authorization header required" },
      401,
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
    return errorResponse(
      { code: "NOT_OWNER", message: "Invalid authentication" },
      401,
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      { code: "BAD_REQUEST", message: "Invalid JSON body" },
      400,
    );
  }
  if (!validateBody(body)) {
    return errorResponse(
      {
        code: "BAD_REQUEST",
        message:
          "Required: charity_profile_id, wallet_address, chain_id, wallet_type, signature, message. Safe wallets also require signer_count and signer_threshold.",
      },
      400,
    );
  }

  // ── Chain support ────────────────────────────────────────────────────
  const rpcUrl = getRpcUrl(body.chain_id);
  if (!rpcUrl) {
    return errorResponse(
      {
        code: "UNSUPPORTED_CHAIN",
        message: `Chain ID ${body.chain_id} is not supported`,
      },
      400,
    );
  }

  // ── Ownership check ──────────────────────────────────────────────────
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await serviceClient
    .from("charity_profiles")
    .select("id, claimed_by")
    .eq("id", body.charity_profile_id)
    .maybeSingle();

  if (profileError || !profile) {
    return errorResponse(
      { code: "CHARITY_NOT_FOUND", message: "Charity profile not found" },
      404,
    );
  }
  if (profile.claimed_by !== user.id) {
    return errorResponse(
      {
        code: "NOT_OWNER",
        message: "You are not the owner of this charity profile",
      },
      403,
    );
  }

  // ── Duplicate check ──────────────────────────────────────────────────
  const { data: existing } = await serviceClient
    .from("charity_wallets")
    .select("id")
    .eq("charity_profile_id", body.charity_profile_id)
    .eq("wallet_address", body.wallet_address.toLowerCase())
    .eq("chain_id", body.chain_id)
    .maybeSingle();

  if (existing) {
    return errorResponse(
      {
        code: "DUPLICATE_WALLET",
        message:
          "This wallet is already registered for this charity on this chain",
      },
      409,
    );
  }

  // ── Signature verification ───────────────────────────────────────────
  const normalizedAddress = body.wallet_address.toLowerCase();

  if (body.wallet_type === "eoa") {
    const valid = verifyEOASignature(
      body.message,
      body.signature,
      normalizedAddress,
    );
    if (!valid) {
      return errorResponse(
        { code: "INVALID_SIGNATURE", message: "EOA signature verification failed" },
        401,
      );
    }
  } else {
    // Safe (EIP-1271) path
    const valid = await verifySafeSignature(
      rpcUrl,
      body.wallet_address,
      body.message,
      body.signature,
    );
    if (!valid) {
      return errorResponse(
        {
          code: "INVALID_SIGNATURE",
          message:
            "Safe EIP-1271 signature verification failed. Ensure the Safe has approved this message.",
        },
        401,
      );
    }

    // Fetch on-chain Safe info and validate against submitted values
    const safeInfo = await fetchSafeInfo(rpcUrl, body.wallet_address);
    if (!safeInfo) {
      return errorResponse(
        {
          code: "SAFE_CONFIG_MISMATCH",
          message:
            "Could not read Safe owners/threshold from chain. Verify the address is a Safe on this chain.",
        },
        400,
      );
    }

    if (
      safeInfo.owners.length !== body.signer_count ||
      safeInfo.threshold !== body.signer_threshold
    ) {
      return errorResponse(
        {
          code: "SAFE_CONFIG_MISMATCH",
          message: `On-chain Safe has ${safeInfo.owners.length} owners with threshold ${safeInfo.threshold}, but submitted signer_count=${body.signer_count} and signer_threshold=${body.signer_threshold}`,
        },
        400,
      );
    }
  }

  // ── Insert into charity_wallets ──────────────────────────────────────
  const now = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    charity_profile_id: body.charity_profile_id,
    wallet_address: normalizedAddress,
    chain_id: body.chain_id,
    wallet_type: body.wallet_type,
    proof_of_control_signature: body.signature,
    proof_of_control_message: body.message,
    proof_of_control_verified_at: now,
    created_at: now,
    updated_at: now,
  };

  if (body.wallet_type === "safe") {
    insertPayload.signer_count = body.signer_count;
    insertPayload.signer_threshold = body.signer_threshold;
  }

  if (body.wallet_type === "eoa") {
    insertPayload.risk_acknowledgment_at = now;
    insertPayload.risk_acknowledgment_user_id = user.id;
  }

  const { data: inserted, error: insertError } = await serviceClient
    .from("charity_wallets")
    .insert(insertPayload)
    .select("id, wallet_address, chain_id, wallet_type, proof_of_control_verified_at, is_primary")
    .single();

  if (insertError) {
    console.error("Failed to insert charity_wallets row:", insertError);

    // Handle unique constraint violation specifically
    if (insertError.code === "23505") {
      return errorResponse(
        {
          code: "DUPLICATE_WALLET",
          message:
            "This wallet is already registered for this charity on this chain",
        },
        409,
      );
    }

    return errorResponse(
      {
        code: "INSERT_FAILED",
        message: insertError.message,
      },
      500,
    );
  }

  return jsonResponse(
    {
      success: true,
      wallet: inserted,
    },
    201,
  );
});
