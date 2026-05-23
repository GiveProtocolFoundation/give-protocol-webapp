/**
 * Supabase Edge Function: wallet-designation-cancel
 *
 * Cancels a wallet change that is currently in pending_change_cooldown.
 * Reverts the profile to plain 'active' (wallet_address unchanged) and
 * sends an audit email to the authorized signer with the cancelling IP.
 *
 * Two auth modes:
 *  - Token mode: body = { token }. Public CORS; the cancel magic link in
 *    the cooldown emails calls this. Validates token, marks it used.
 *  - Dashboard mode: body = { charityProfileId }, Authorization header
 *    required. Verifies the caller is claimed_by the profile.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendChangeCancelledEmail } from "../_shared/wallet-designation-cooldown-emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function readIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/**
 * Roll back pending_wallet_* on a profile and emit the audit email.
 * Caller has already authorized the cancel; this function does the writes.
 */
async function performCancel(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any;
  profile: ProfileRow;
  source: "email_link" | "dashboard";
  ip: string | null;
  publicAppUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  resendFromEmail?: string;
}): Promise<void> {
  const cancelledAddress = args.profile.pending_wallet_address;

  await args.serviceClient
    .from("charity_profiles")
    .update({
      wallet_designation_status: "active",
      pending_wallet_address: null,
      pending_wallet_kind: null,
      pending_wallet_started_at: null,
      pending_wallet_effective_at: null,
      pending_wallet_designation_signature: null,
      pending_wallet_designation_message: null,
      pending_wallet_designation_chain_id: null,
      pending_wallet_reminder_24h_at: null,
      pending_wallet_reminder_48h_at: null,
    })
    .eq("id", args.profile.id);

  await args.serviceClient
    .from("wallet_designation_cancel_tokens")
    .delete()
    .eq("charity_profile_id", args.profile.id);

  await args.serviceClient
    .from("charity_wallet_designations_history")
    .insert({
      charity_profile_id: args.profile.id,
      previous_address: args.profile.wallet_address,
      new_address: cancelledAddress,
      ip: args.ip,
      action: "change_cancelled",
    });

  // Audit email — failure here does NOT roll back the cancellation.
  if (args.profile.authorized_signer_email && cancelledAddress) {
    try {
      await sendChangeCancelledEmail({
        supabaseUrl: args.supabaseUrl,
        supabaseServiceKey: args.supabaseServiceKey,
        resendApiKey: args.resendApiKey,
        resendFromEmail: args.resendFromEmail,
        publicAppUrl: args.publicAppUrl,
        charityProfileId: args.profile.id,
        charityName: args.profile.name,
        toEmail: args.profile.authorized_signer_email,
        cancelledWalletAddress: cancelledAddress,
        currentWalletAddress: args.profile.wallet_address ?? "(unknown)",
        cancelSource: args.source,
        cancelIp: args.ip,
      });
    } catch (err) {
      console.error("Cancel audit email failed (cancellation still applied):", err);
    }
  }
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
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? undefined;
  const publicAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ?? "https://giveprotocol.io";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !resendApiKey) {
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
  const b = body as Record<string, unknown>;

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = readIp(req);

  // -------------------- Token mode --------------------
  if (typeof b.token === "string") {
    // Atomically claim the cancel token.
    const { data: tokenData, error: tokenError } = await serviceClient
      .from("wallet_designation_cancel_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", b.token)
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
    const tokenRow = tokenData as { charity_profile_id: string };

    const { data: profileData } = await serviceClient
      .from("charity_profiles")
      .select(
        "id, name, wallet_designation_status, wallet_address, authorized_signer_email, pending_wallet_address",
      )
      .eq("id", tokenRow.charity_profile_id)
      .maybeSingle();
    if (!profileData) {
      return jsonResponse(
        { success: false, error: "Charity profile not found" },
        404,
      );
    }
    const profile = profileData as ProfileRow;
    if (profile.wallet_designation_status !== "pending_change_cooldown") {
      return jsonResponse(
        { success: false, error: "No pending change to cancel" },
        409,
      );
    }

    await performCancel({
      serviceClient,
      profile,
      source: "email_link",
      ip,
      publicAppUrl,
      supabaseUrl,
      supabaseServiceKey,
      resendApiKey,
      resendFromEmail,
    });

    return jsonResponse({ success: true, source: "email_link" }, 200);
  }

  // -------------------- Dashboard mode --------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || typeof b.charityProfileId !== "string") {
    return jsonResponse(
      {
        success: false,
        error: "Required: either { token } or { charityProfileId } with Authorization",
      },
      400,
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
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const { data: profileData } = await serviceClient
    .from("charity_profiles")
    .select(
      "id, name, claimed_by, wallet_designation_status, wallet_address, authorized_signer_email, pending_wallet_address",
    )
    .eq("id", b.charityProfileId)
    .maybeSingle();
  if (!profileData) {
    return jsonResponse(
      { success: false, error: "Charity profile not found" },
      404,
    );
  }
  const profile = profileData as ProfileRow & { claimed_by: string | null };
  if (profile.claimed_by !== user.id) {
    return jsonResponse({ success: false, error: "Forbidden" }, 403);
  }
  if (profile.wallet_designation_status !== "pending_change_cooldown") {
    return jsonResponse(
      { success: false, error: "No pending change to cancel" },
      409,
    );
  }

  await performCancel({
    serviceClient,
    profile,
    source: "dashboard",
    ip,
    publicAppUrl,
    supabaseUrl,
    supabaseServiceKey,
    resendApiKey,
    resendFromEmail,
  });

  return jsonResponse({ success: true, source: "dashboard" }, 200);
});
