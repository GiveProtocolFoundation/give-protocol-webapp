/**
 * Supabase Edge Function: wallet-designation-promote-cooldown
 *
 * Cron-driven (every 15 min). Two jobs per run:
 *
 *  1. Promotion: any profile in 'pending_change_cooldown' whose
 *     pending_wallet_effective_at <= now is promoted to 'active' with
 *     wallet_address := pending_wallet_address. Sends a "change completed"
 *     email and writes a 'change_promoted' audit row.
 *
 *  2. Reminders: profiles still in cooldown that have crossed the 24h or
 *     48h mark since pending_wallet_started_at receive a reminder email
 *     once each. Tracked via pending_wallet_reminder_24h_at /
 *     pending_wallet_reminder_48h_at columns to prevent duplicate sends.
 *
 * Auth: requires x-cron-secret header matching CRON_SHARED_SECRET. No user
 * auth path — purely service-driven.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendChangeCompletedEmail,
  sendCooldownReminderEmail,
} from "../_shared/wallet-designation-cooldown-emails.ts";

const REMINDER_24H_FROM_START_MS = 24 * 60 * 60 * 1000;
const REMINDER_48H_FROM_START_MS = 48 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CooldownProfileRow {
  id: string;
  name: string;
  wallet_address: string | null;
  authorized_signer_email: string | null;
  pending_wallet_address: string | null;
  pending_wallet_started_at: string | null;
  pending_wallet_effective_at: string | null;
  pending_wallet_reminder_24h_at: string | null;
  pending_wallet_reminder_48h_at: string | null;
}

interface RunResult {
  profileId: string;
  outcome: "promoted" | "reminded_24h" | "reminded_48h" | "skipped";
  reason?: string;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CommonEnv {
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  resendFromEmail?: string;
  publicAppUrl: string;
}

/** Promote a profile whose cooldown has fully elapsed. */
async function promoteOne(
  serviceClient: SupabaseClient,
  profile: CooldownProfileRow,
  env: CommonEnv,
): Promise<RunResult> {
  if (!profile.pending_wallet_address) {
    return {
      profileId: profile.id,
      outcome: "skipped",
      reason: "pending_address_missing",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await serviceClient
    .from("charity_profiles")
    .update({
      wallet_address: profile.pending_wallet_address,
      wallet_designation_status: "active",
      wallet_designated_at: nowIso,
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
    .eq("id", profile.id);
  if (updateError) {
    return {
      profileId: profile.id,
      outcome: "skipped",
      reason: `update_failed: ${updateError.message}`,
    };
  }

  await serviceClient
    .from("wallet_designation_cancel_tokens")
    .delete()
    .eq("charity_profile_id", profile.id);

  await serviceClient.from("charity_wallet_designations_history").insert({
    charity_profile_id: profile.id,
    previous_address: profile.wallet_address,
    new_address: profile.pending_wallet_address,
    action: "change_promoted",
  });

  if (profile.authorized_signer_email) {
    try {
      await sendChangeCompletedEmail({
        supabaseUrl: env.supabaseUrl,
        supabaseServiceKey: env.supabaseServiceKey,
        resendApiKey: env.resendApiKey,
        resendFromEmail: env.resendFromEmail,
        publicAppUrl: env.publicAppUrl,
        charityProfileId: profile.id,
        charityName: profile.name,
        toEmail: profile.authorized_signer_email,
        newWalletAddress: profile.pending_wallet_address,
      });
    } catch (err) {
      console.error("Change-completed email failed:", err);
    }
  }
  return { profileId: profile.id, outcome: "promoted" };
}

/**
 * Send a reminder email if the cooldown has crossed the given milestone and
 * no reminder has been sent yet at that milestone. Returns the run outcome.
 */
async function maybeSendReminder(
  serviceClient: SupabaseClient,
  profile: CooldownProfileRow,
  env: CommonEnv,
  milestone: "24h" | "48h",
): Promise<RunResult | null> {
  if (!profile.pending_wallet_started_at) return null;
  if (!profile.pending_wallet_address) return null;
  if (!profile.authorized_signer_email) return null;

  const startedMs = new Date(profile.pending_wallet_started_at).getTime();
  const now = Date.now();
  const elapsed = now - startedMs;

  // The remind-at-24h email actually announces "48h remaining"; reminder
  // at the 48h mark announces "24h remaining." Cooldown is 72h total.
  const thresholdMs =
    milestone === "24h" ? REMINDER_24H_FROM_START_MS : REMINDER_48H_FROM_START_MS;
  const alreadySentField =
    milestone === "24h"
      ? "pending_wallet_reminder_24h_at"
      : "pending_wallet_reminder_48h_at";
  const alreadySent =
    milestone === "24h"
      ? profile.pending_wallet_reminder_24h_at
      : profile.pending_wallet_reminder_48h_at;

  if (elapsed < thresholdMs || alreadySent) return null;

  const hoursRemaining = milestone === "24h" ? 48 : 24;
  // Reconstruct the cancel URL — we don't have the token here, but the user
  // has the original from the cooldown-started email. The reminder reuses
  // the existing cancel token (still valid until effective_at).
  const { data: tokenData } = await serviceClient
    .from("wallet_designation_cancel_tokens")
    .select("token")
    .eq("charity_profile_id", profile.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  const cancelToken = (tokenData as { token: string } | null)?.token;
  if (!cancelToken) {
    return {
      profileId: profile.id,
      outcome: "skipped",
      reason: "no_active_cancel_token",
    };
  }
  const cancelUrl = `${env.publicAppUrl.replace(/\/$/, "")}/charity-portal/cancel-wallet-change?token=${cancelToken}`;

  try {
    await sendCooldownReminderEmail({
      supabaseUrl: env.supabaseUrl,
      supabaseServiceKey: env.supabaseServiceKey,
      resendApiKey: env.resendApiKey,
      resendFromEmail: env.resendFromEmail,
      publicAppUrl: env.publicAppUrl,
      charityProfileId: profile.id,
      charityName: profile.name,
      toEmail: profile.authorized_signer_email,
      cancelUrl,
      hoursRemaining,
      currentWalletAddress: profile.wallet_address ?? "(unknown)",
      newWalletAddress: profile.pending_wallet_address,
    });
  } catch (err) {
    console.error(`Reminder ${milestone} email failed:`, err);
    return {
      profileId: profile.id,
      outcome: "skipped",
      reason: `email_failed: ${milestone}`,
    };
  }

  await serviceClient
    .from("charity_profiles")
    .update({ [alreadySentField]: new Date().toISOString() })
    .eq("id", profile.id);

  await serviceClient.from("charity_wallet_designations_history").insert({
    charity_profile_id: profile.id,
    action: "change_reminder_sent",
  });

  return {
    profileId: profile.id,
    outcome: milestone === "24h" ? "reminded_24h" : "reminded_48h",
  };
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
  const cronSecret = Deno.env.get("CRON_SHARED_SECRET");
  const publicAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ?? "https://giveprotocol.io";

  if (
    !supabaseUrl ||
    !supabaseServiceKey ||
    !resendApiKey ||
    !cronSecret
  ) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  const xCron = req.headers.get("x-cron-secret");
  if (xCron !== cronSecret) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const env: CommonEnv = {
    supabaseUrl,
    supabaseServiceKey,
    resendApiKey,
    resendFromEmail,
    publicAppUrl,
  };

  // Load every profile currently in cooldown. Small table — designations are
  // rare events; no pagination needed for v1.
  const { data: profilesData, error: loadError } = await serviceClient
    .from("charity_profiles")
    .select(
      "id, name, wallet_address, authorized_signer_email, pending_wallet_address, pending_wallet_started_at, pending_wallet_effective_at, pending_wallet_reminder_24h_at, pending_wallet_reminder_48h_at",
    )
    .eq("wallet_designation_status", "pending_change_cooldown");
  if (loadError) {
    return jsonResponse(
      { success: false, error: "Could not load profiles" },
      500,
    );
  }
  const profiles = (profilesData ?? []) as CooldownProfileRow[];

  const results: RunResult[] = [];
  const nowMs = Date.now();

  for (const profile of profiles) {
    if (
      profile.pending_wallet_effective_at &&
      new Date(profile.pending_wallet_effective_at).getTime() <= nowMs
    ) {
      results.push(await promoteOne(serviceClient, profile, env));
      continue;
    }

    const r24 = await maybeSendReminder(serviceClient, profile, env, "24h");
    if (r24) results.push(r24);

    const r48 = await maybeSendReminder(serviceClient, profile, env, "48h");
    if (r48) results.push(r48);
  }

  return jsonResponse({ success: true, results }, 200);
});
