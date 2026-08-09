/**
 * Supabase Edge Function: passkey-signup-init
 * @module passkey-signup-init
 * @description Creates a new user account (auto-confirmed) and returns a session
 * so the client can immediately call passkey-register-options to register a passkey.
 * No authentication required — this is the first step of the passkey signup flow.
 * Uses the same session-generation pattern as wallet-auth and passkey-login-verify.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * Same pattern as wallet-auth/index.ts and passkey-login-verify/index.ts.
 * @param supabase - Service-role Supabase client
 * @param userId - User ID to generate session for
 * @returns Session object or error
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

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("A valid email address is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse("Server configuration error", 503);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const randomPassword = Array.from(randomBytes, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");

    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { type: "donor", auth_method: "passkey" },
      });

    if (createError) {
      console.error("Failed to create user:", createError);
      if (
        createError.message?.includes("already been registered") ||
        createError.message?.includes("already exists") ||
        createError.status === 422
      ) {
        return errorResponse(
          "An account with this email already exists. Please sign in instead.",
          409,
        );
      }
      return errorResponse("Failed to create account", 500);
    }

    if (!newUser.user) {
      return errorResponse("Failed to create account", 500);
    }

    const userId = newUser.user.id;

    // Create user_identities record with passkey as primary auth method
    const { error: identityError } = await supabase
      .from("user_identities")
      .upsert(
        {
          user_id: userId,
          primary_auth_method: "passkey",
        },
        { onConflict: "user_id" },
      );

    if (identityError) {
      console.error("Failed to create identity record:", identityError);
    }

    // Generate session so the client can immediately register a passkey
    const sessionResult = await generateSession(supabase, userId);
    if ("error" in sessionResult) {
      return errorResponse(sessionResult.error, 500);
    }

    return jsonResponse(
      { success: true, session: sessionResult.session },
      200,
    );
  } catch (error) {
    console.error("passkey-signup-init error:", error);
    const message =
      error instanceof Error ? error.message : "Account creation failed";
    return errorResponse(message, 500);
  }
});
