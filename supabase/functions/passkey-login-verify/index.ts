/**
 * Supabase Edge Function: passkey-login-verify
 * @module passkey-login-verify
 * @description Verifies a WebAuthn authentication response and returns a Supabase session.
 * No authentication required — the passkey assertion itself proves identity.
 * Uses the same session-generation pattern as wallet-auth (magiclink + verifyOtp).
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@11";
import type { AuthenticatorTransportFuture } from "npm:@simplewebauthn/server@11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Builds a JSON Response with CORS headers.
 * @param body - Response body object
 * @param status - HTTP status code
 * @returns Response with JSON content-type and CORS headers
 */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Builds an error JSON Response with a standard `{ success: false, error }` shape.
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @returns Error response with CORS headers
 */
function errorResponse(message: string, status: number): Response {
  return jsonResponse({ success: false, error: message }, status);
}

/**
 * Generate a Supabase session for the given user via magic link verification.
 * Same pattern as wallet-auth/index.ts generateSession().
 */
async function generateSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ session: Record<string, unknown> } | { error: string }> {
  const { data: userData, error: fetchError } =
    await supabase.auth.admin.getUserById(userId);

  if (fetchError || !userData.user) {
    console.error("Failed to fetch user:", fetchError);
    return { error: "User not found" };
  }

  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email ?? "",
    });

  if (linkError || !linkData) {
    console.error("Failed to generate session link:", linkError);
    return { error: "Failed to create session" };
  }

  const url = new URL(linkData.properties.action_link);
  const token = url.searchParams.get("token");
  const tokenType = url.searchParams.get("type") ?? "magiclink";
  if (!token) return { error: "Failed to generate auth token" };

  const { data: sessionData, error: verifyError } =
    await supabase.auth.verifyOtp({
      token_hash: token,
      type: tokenType as "magiclink",
    });

  if (verifyError || !sessionData.session) {
    console.error("Failed to verify OTP:", verifyError);
    return { error: "Failed to establish session" };
  }

  return {
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
      token_type: sessionData.session.token_type,
      user: {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        user_metadata: sessionData.session.user.user_metadata,
      },
    },
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse("Server configuration error", 503);
    }

    const rpId = Deno.env.get("PASSKEY_RP_ID") ?? "giveprotocol.io";
    const expectedOrigin =
      Deno.env.get("PASSKEY_ORIGIN") ?? "https://giveprotocol.io";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse authentication response from body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.response || typeof body.response !== "object") {
      return errorResponse("Missing authentication response", 400);
    }

    const response = body.response as Record<string, unknown>;
    const credentialId = response.id as string;

    if (!credentialId) {
      return errorResponse("Missing credential ID in response", 400);
    }

    // Look up the passkey credential
    const { data: passkey, error: passkeyError } = await supabase
      .from("user_passkeys")
      .select("user_id, credential_id, public_key, counter, transports")
      .eq("credential_id", credentialId)
      .single();

    if (passkeyError || !passkey) {
      return errorResponse(
        "Passkey not recognized. Please use a registered passkey or sign in with email.",
        401,
      );
    }

    // Find matching challenge
    const { data: challengeRow, error: challengeError } = await supabase
      .from("passkey_challenges")
      .select("challenge")
      .eq("type", "authentication")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRow) {
      return errorResponse(
        "Authentication challenge expired. Please try again.",
        400,
      );
    }

    // Decode stored public key from base64
    const publicKeyBytes = Uint8Array.from(
      atob(passkey.public_key),
      (c: string) => c.charCodeAt(0),
    );

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: body.response as Parameters<
        typeof verifyAuthenticationResponse
      >[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: passkey.credential_id,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
        transports:
          (passkey.transports as AuthenticatorTransportFuture[]) ?? [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return errorResponse("Passkey authentication failed", 401);
    }

    // Update counter and last_used_at
    const newCounter = verification.authenticationInfo.newCounter;
    await supabase
      .from("user_passkeys")
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("credential_id", credentialId);

    // Clean up the used challenge
    await supabase
      .from("passkey_challenges")
      .delete()
      .eq("challenge", challengeRow.challenge);

    // Generate session
    const sessionResult = await generateSession(supabase, passkey.user_id);
    if ("error" in sessionResult) {
      return errorResponse(sessionResult.error, 500);
    }

    return jsonResponse(
      {
        success: true,
        session: sessionResult.session,
        isNewUser: false,
      },
      200,
    );
  } catch (error) {
    console.error("passkey-login-verify error:", error);
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    return errorResponse(message, 500);
  }
});
