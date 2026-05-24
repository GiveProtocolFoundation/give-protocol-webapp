/**
 * Supabase Edge Function: wallet-designation-confirm
 *
 * Consumes the single-use confirmation token from the email magic link.
 * Branches on the token's `purpose` column:
 *
 *  - purpose = 'initial': the profile is in 'pending_email_confirmation'.
 *    Writes wallet_address, flips status to 'active'. (PR1 behavior.)
 *
 *  - purpose = 'change': the profile is in 'active' with pending_wallet_*
 *    populated. Flips status to 'pending_change_cooldown', sets
 *    pending_wallet_started_at/effective_at, sends the "cooldown started"
 *    email with the cancel magic link. wallet_address is preserved.
 *
 * Unauthenticated: the token itself is the proof. Public CORS so the
 * link works from any browser / email client.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendCooldownStartedEmail } from "../_shared/wallet-designation-cooldown-emails.ts";

const COOLDOWN_DURATION_MS = 72 * 60 * 60 * 1000;

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
  purpose: "initial" | "change";
}

interface ProfileRow {
  id: string;
  name: string;
  wallet_designation_status: string;
  wallet_address: string | null;
  authorized_signer_email: string | null;
  pending_wallet_address: string | null;
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
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? undefined;
  const publicAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ?? "https://giveprotocol.io";

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
    return jsonResponse({ success: false, error: "Required: token" }, 400);
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

  // Load the full profile (state determines what to do next).
  const { data: profileData, error: profileError } = await serviceClient
    .from("charity_profiles")
    .select(
      "id, name, wallet_designation_status, wallet_address, authorized_signer_email, pending_wallet_address",
    )
    .eq("id", confirmation.charity_profile_id)
    .maybeSingle();
  if (profileError || !profileData) {
    return jsonResponse(
      { success: false, error: "Charity profile not found" },
      404,
    );
  }
  const profile = profileData as ProfileRow;

  // Branch on token purpose. Default 'initial' for tokens minted before PR2.
  const purpose = confirmation.purpose ?? "initial";

  if (purpose === "change") {
    // The submit handler stamped pending_wallet_* on the profile; we expect
    // wallet_designation_status = 'active' and pending_wallet_address set.
    if (
      profile.wallet_designation_status !== "active" ||
      !profile.pending_wallet_address ||
      profile.pending_wallet_address !== confirmation.candidate_address
    ) {
      return jsonResponse(
        {
          success: false,
          error: `Profile state inconsistent with change confirmation (status='${profile.wallet_designation_status}')`,
        },
        409,
      );
    }
    if (!profile.authorized_signer_email) {
      return jsonResponse(
        { success: false, error: "Missing authorized_signer_email" },
        500,
      );
    }

    const startedAt = new Date();
    const effectiveAt = new Date(startedAt.getTime() + COOLDOWN_DURATION_MS);

    const { error: updateError } = await serviceClient
      .from("charity_profiles")
      .update({
        wallet_designation_status: "pending_change_cooldown",
        pending_wallet_started_at: startedAt.toISOString(),
        pending_wallet_effective_at: effectiveAt.toISOString(),
      })
      .eq("id", profile.id);
    if (updateError) {
      console.error("Failed to enter cooldown:", updateError);
      return jsonResponse(
        { success: false, error: "Could not start cooldown" },
        500,
      );
    }

    try {
      await sendCooldownStartedEmail({
        supabaseUrl,
        supabaseServiceKey,
        resendApiKey: resendApiKey ?? "",
        resendFromEmail,
        publicAppUrl,
        charityProfileId: profile.id,
        charityName: profile.name,
        toEmail: profile.authorized_signer_email,
        currentWalletAddress: profile.wallet_address ?? "(unknown)",
        newWalletAddress: profile.pending_wallet_address,
        effectiveAt: effectiveAt.toISOString(),
      });
    } catch (err) {
      // Email failure does NOT roll back the cooldown — the change is real
      // and the user can still cancel via the dashboard.
      console.error("Cooldown-started email failed:", err);
    }

    await serviceClient.from("charity_wallet_designations_history").insert({
      charity_profile_id: profile.id,
      previous_address: profile.wallet_address,
      new_address: profile.pending_wallet_address,
      action: "change_cooldown_started",
    });

    return jsonResponse(
      {
        success: true,
        walletAddress: profile.wallet_address,
        pendingWalletAddress: profile.pending_wallet_address,
        cooldownEffectiveAt: effectiveAt.toISOString(),
        outcome: "cooldown_started",
      },
      200,
    );
  }

  // INITIAL flow (PR1 behavior).
  if (profile.wallet_designation_status !== "pending_email_confirmation") {
    return jsonResponse(
      {
        success: false,
        error: `Profile is in state '${profile.wallet_designation_status}', cannot activate`,
      },
      409,
    );
  }

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
      outcome: "activated",
    },
    200,
  );
});
