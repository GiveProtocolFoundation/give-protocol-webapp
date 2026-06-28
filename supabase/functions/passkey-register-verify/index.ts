/**
 * Supabase Edge Function: passkey-register-verify
 * @module passkey-register-verify
 * @description Verifies a WebAuthn registration response and stores the credential.
 * The user must be authenticated. After verification the passkey is linked to their account.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@11";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse("Server configuration error", 503);
    }

    const rpId = Deno.env.get("PASSKEY_RP_ID") ?? "giveprotocol.io";
    const expectedOrigin =
      Deno.env.get("PASSKEY_ORIGIN") ?? "https://giveprotocol.io";

    // Verify the user's JWT
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Service-role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse registration response from body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.response || typeof body.response !== "object") {
      return errorResponse("Missing registration response", 400);
    }

    // Look up the stored challenge
    const { data: challengeRow, error: challengeError } = await supabase
      .from("passkey_challenges")
      .select("challenge, email")
      .eq("user_id", user.id)
      .eq("type", "registration")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRow) {
      return errorResponse(
        "No valid registration challenge found. Please try again.",
        400,
      );
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: body.response as Parameters<
        typeof verifyRegistrationResponse
      >[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return errorResponse("Passkey registration verification failed", 400);
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    console.log(
      `Passkey registered: deviceType=${credentialDeviceType}, backedUp=${credentialBackedUp}`,
    );

    // Device name from challenge row (stored in email field as metadata)
    const deviceName = challengeRow.email ?? undefined;

    // Store the credential
    const { error: insertError } = await supabase.from("user_passkeys").insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: btoa(
        String.fromCharCode(...new Uint8Array(credential.publicKey)),
      ),
      counter: credential.counter,
      transports: credential.transports ?? [],
      device_name: deviceName,
    });

    if (insertError) {
      console.error("Failed to store passkey:", insertError);
      if (insertError.code === "23505") {
        return errorResponse("This passkey is already registered", 409);
      }
      return errorResponse("Failed to store passkey credential", 500);
    }

    // Clean up the used challenge
    await supabase
      .from("passkey_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration");

    return jsonResponse(
      {
        success: true,
        credentialId: credential.id,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
      200,
    );
  } catch (error) {
    console.error("passkey-register-verify error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Registration verification failed";
    return errorResponse(message, 500);
  }
});
