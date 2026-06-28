/**
 * Supabase Edge Function: passkey-login-options
 * @module passkey-login-options
 * @description Generates WebAuthn authentication options for passkey login.
 * No authentication required — this is the first step of the login ceremony.
 * Uses discoverable credentials (no allowCredentials) so any registered passkey works.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@11";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse("Server configuration error", 503);
    }

    const rpId = Deno.env.get("PASSKEY_RP_ID") ?? "giveprotocol.io";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate authentication options (discoverable credentials — no allowCredentials)
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "preferred",
    });

    // Clean up expired authentication challenges
    await supabase
      .from("passkey_challenges")
      .delete()
      .eq("type", "authentication")
      .lt("expires_at", new Date().toISOString());

    // Store the challenge
    const { error: challengeError } = await supabase
      .from("passkey_challenges")
      .insert({
        challenge: options.challenge,
        user_id: null,
        type: "authentication",
      });

    if (challengeError) {
      console.error("Failed to store challenge:", challengeError);
      return errorResponse("Failed to create authentication challenge", 500);
    }

    return jsonResponse({ success: true, options }, 200);
  } catch (error) {
    console.error("passkey-login-options error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate options";
    return errorResponse(message, 500);
  }
});
