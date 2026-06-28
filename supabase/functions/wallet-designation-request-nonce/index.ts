/**
 * Supabase Edge Function: wallet-designation-request-nonce
 *
 * Issues a single-use nonce (10 min TTL) to a charity owner who wants to
 * designate an official receiving wallet. Returns the canonical message
 * that the client must sign with their wallet. Server-side, the message
 * will be reconstructed byte-for-byte from this nonce row to verify the
 * signature.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import { buildDesignationMessage } from "../_shared/wallet-designation-message.ts";

const NONCE_TTL_MS = 10 * 60 * 1000;
const MOONBASE_CHAIN_ID = 1287;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  charityProfileId: string;
  candidateAddress: string;
}

interface CharityProfileRow {
  id: string;
  name: string;
  claimed_by: string | null;
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
  return (
    typeof b.charityProfileId === "string" &&
    typeof b.candidateAddress === "string" &&
    b.candidateAddress.startsWith("0x") &&
    b.candidateAddress.length === 42
  );
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
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
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
      {
        success: false,
        error: "Required: charityProfileId, candidateAddress (0x... 42 chars)",
      },
      400,
    );
  }

  // Normalize to checksummed form. Throws on malformed addresses.
  let candidateAddress: string;
  try {
    candidateAddress = ethers.getAddress(body.candidateAddress);
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid wallet address checksum" },
      400,
    );
  }

  // Identify the caller.
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

  // Verify caller owns the charity profile.
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profileData, error: profileError } = await serviceClient
    .from("charity_profiles")
    .select("id, name, claimed_by")
    .eq("id", body.charityProfileId)
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

  // Mint nonce.
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  const { error: insertError } = await serviceClient
    .from("wallet_designation_nonces")
    .insert({
      nonce,
      user_id: user.id,
      charity_profile_id: profile.id,
      candidate_address: candidateAddress,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("Failed to insert nonce:", insertError);
    return jsonResponse(
      { success: false, error: "Could not issue nonce" },
      500,
    );
  }

  const message = buildDesignationMessage({
    charityName: profile.name,
    charityProfileId: profile.id,
    candidateAddress,
    userEmail: user.email,
    chainId: MOONBASE_CHAIN_ID,
    issuedAt,
    nonce,
  });

  return jsonResponse(
    {
      success: true,
      nonce,
      message,
      expiresAt,
      chainId: MOONBASE_CHAIN_ID,
    },
    200,
  );
});
