/**
 * Supabase Edge Function: passkey-register-options
 * @module passkey-register-options
 * @description Generates WebAuthn registration options for an authenticated user.
 * The user must already have a Supabase session (email/password or wallet).
 * Returns PublicKeyCredentialCreationOptionsJSON for the browser to create a passkey.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateRegistrationOptions } from "npm:@simplewebauthn/server@11";

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

    // Extract user from Authorization header
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
    const rpName = Deno.env.get("PASSKEY_RP_NAME") ?? "Give Protocol";

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

    // Service-role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse optional device name from body
    let deviceName: string | undefined;
    try {
      const body = await req.json();
      if (typeof body.deviceName === "string" && body.deviceName.length > 0) {
        deviceName = body.deviceName.slice(0, 100);
      }
    } catch {
      // Empty body is fine
    }

    // Fetch existing passkeys for excludeCredentials
    const { data: existingPasskeys } = await supabase
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    const excludeCredentials = (existingPasskeys ?? []).map(
      (pk: { credential_id: string; transports: string[] }) => ({
        id: pk.credential_id,
        transports: pk.transports,
      }),
    );

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName: user.email ?? user.id,
      userDisplayName:
        user.user_metadata?.display_name ?? user.email ?? "Give Protocol User",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      excludeCredentials,
    });

    // Clean up expired challenges for this user
    await supabase
      .from("passkey_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration")
      .lt("expires_at", new Date().toISOString());

    // Store challenge
    const { error: challengeError } = await supabase
      .from("passkey_challenges")
      .insert({
        challenge: options.challenge,
        user_id: user.id,
        type: "registration",
      });

    if (challengeError) {
      console.error("Failed to store challenge:", challengeError);
      return errorResponse("Failed to create registration challenge", 500);
    }

    // Store device name in challenge metadata for later use
    if (deviceName) {
      await supabase
        .from("passkey_challenges")
        .update({ email: deviceName })
        .eq("challenge", options.challenge)
        .eq("user_id", user.id);
    }

    return jsonResponse({ success: true, options }, 200);
  } catch (error) {
    console.error("passkey-register-options error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate options";
    return errorResponse(message, 500);
  }
});
