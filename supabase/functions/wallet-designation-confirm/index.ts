/**
 * Supabase Edge Function: wallet-designation-confirm
 *
 * Consumes the single-use confirmation token from the email magic link
 * and activates the designated wallet:
 *  - Verifies the token exists, has not expired, has not been used.
 *  - Verifies the charity profile is in 'pending_email_confirmation' state.
 *  - Writes wallet_address to the profile and flips status to 'active'.
 *  - Marks the token used.
 *  - Writes an 'email_confirmed' audit row.
 *
 * Unauthenticated: the token itself is the proof. Public CORS so the
 * link works from any browser / email client.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  token: string;
}

interface ConfirmationRow {
  token: string;
  charity_profile_id: string;
  candidate_address: string;
  sent_to_email: string;
  expires_at: string;
  used_at: string | null;
}

interface ProfileRow {
  id: string;
  wallet_designation_status: string;
  wallet_address: string | null;
}

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
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
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
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).token !== "string"
  ) {
    return jsonResponse(
      { success: false, error: "Required: token" },
      400,
    );
  }
  const { token } = body as RequestBody;

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Atomically claim the token: only the first writer to flip used_at wins.
  const { data: tokenData, error: tokenError } = await serviceClient
    .from("wallet_designation_confirmations")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select()
    .maybeSingle();

  if (tokenError || !tokenData) {
    return jsonResponse(
      { success: false, error: "Invalid, expired, or already-used token" },
      400,
    );
  }
  const confirmation = tokenData as ConfirmationRow;

  // Verify profile is still in the right state to activate.
  const { data: profileData, error: profileError } = await serviceClient
    .from("charity_profiles")
    .select("id, wallet_designation_status, wallet_address")
    .eq("id", confirmation.charity_profile_id)
    .maybeSingle();
  if (profileError || !profileData) {
    return jsonResponse(
      { success: false, error: "Charity profile not found" },
      404,
    );
  }
  const profile = profileData as ProfileRow;
  if (profile.wallet_designation_status !== "pending_email_confirmation") {
    return jsonResponse(
      {
        success: false,
        error: `Profile is in state '${profile.wallet_designation_status}', cannot activate`,
      },
      409,
    );
  }

  // Activate: set wallet_address and flip status.
  const nowIso = new Date().toISOString();
  const { error: updateError } = await serviceClient
    .from("charity_profiles")
    .update({
      wallet_address: confirmation.candidate_address,
      wallet_designation_status: "active",
      wallet_designated_at: nowIso,
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("Failed to activate wallet:", updateError);
    return jsonResponse(
      { success: false, error: "Could not activate wallet" },
      500,
    );
  }

  await serviceClient.from("charity_wallet_designations_history").insert({
    charity_profile_id: profile.id,
    previous_address: profile.wallet_address,
    new_address: confirmation.candidate_address,
    action: "email_confirmed",
  });

  return jsonResponse(
    {
      success: true,
      walletAddress: confirmation.candidate_address,
      activatedAt: nowIso,
    },
    200,
  );
});
