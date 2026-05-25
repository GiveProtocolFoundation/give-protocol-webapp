/**
 * Supabase Edge Function: resend-verification
 * @module resend-verification
 * @description Resends a signup verification email when the original link has
 * expired. Accepts the user's email address (extracted from the expired link URL
 * by the frontend). Uses the Supabase anon client to call auth.resend so that
 * Supabase's own rate-limiting and confirmation-token lifecycle apply.
 *
 * Always returns HTTP 200 regardless of whether the email exists, to prevent
 * email enumeration.
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

/** Build a JSON response with CORS headers */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const siteUrl =
    Deno.env.get("SITE_URL") ?? "https://giveprotocol.io";

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const reqObj = body as Record<string, unknown>;
  if (typeof reqObj.email !== "string" || !reqObj.email.includes("@")) {
    return jsonResponse(
      { success: false, error: "Missing required field: email" },
      400,
    );
  }

  const email = reqObj.email.toLowerCase().trim();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resend the signup verification email. Supabase enforces its own rate limits
  // and will only send if the account exists and is still unconfirmed.
  // Re-encode the email in the redirect URL so the expired-link page can
  // perform another frictionless resend if needed.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?email=${encodeURIComponent(email)}`,
    },
  });

  if (error) {
    // Log internally but always return 200 to prevent email enumeration.
    console.error("resend-verification: auth.resend error:", error.message);
  } else {
    console.log(`resend-verification: email queued for ${email}`);
  }

  return jsonResponse({ success: true }, 200);
});
