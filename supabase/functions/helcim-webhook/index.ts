/**
 * Supabase Edge Function: helcim-webhook
 * @module helcim-webhook
 * @description Receives Helcim webhook events for refunds and disputes.
 * Helcim sends webhook notifications for transaction lifecycle events.
 *
 * Supported events:
 *   - transaction.refund: A refund was processed externally (e.g. via Helcim dashboard)
 *   - transaction.dispute: A chargeback/dispute was opened
 *   - transaction.dispute.resolved: A dispute was resolved
 *
 * Webhook verification: Helcim webhooks include a signature header that
 * is verified against the webhook secret stored in env.
 *
 * @see https://devdocs.helcim.com/docs/webhooks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-helcim-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HelcimWebhookPayload {
  eventType: string;
  data: {
    transactionId?: string | number;
    originalTransactionId?: string | number;
    amount?: number | string;
    currency?: string;
    status?: string;
    disputeId?: string;
    disputeReason?: string;
    disputeStatus?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a JSON success response
 * @param body - Response body
 * @returns JSON Response
 */
function jsonOk(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ success: true, ...body }), {
    status: 200,
    headers: jsonHeaders,
  });
}

/**
 * Build a JSON error response
 * @param status - HTTP status code
 * @param error - Error message
 * @returns JSON Response
 */
function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: jsonHeaders,
  });
}

/**
 * Verify Helcim webhook signature using HMAC-SHA256
 * @param rawBody - Raw request body string
 * @param signature - Signature from x-helcim-signature header
 * @param secret - Webhook secret from environment
 * @returns Whether the signature is valid
 */
async function verifyHelcimSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Handle an externally-initiated refund event from Helcim
 * @param supabase - Supabase client
 * @param data - Webhook event data
 */
async function handleRefundEvent(
  supabase: ReturnType<typeof createClient>,
  data: HelcimWebhookPayload["data"],
): Promise<Response> {
  const originalTxId = String(data.originalTransactionId || "");
  const refundTxId = String(data.transactionId || "");
  const amountCents = data.amount
    ? Math.round(Number(data.amount) * 100)
    : 0;

  if (!originalTxId) {
    return jsonError(400, "Missing originalTransactionId in refund event");
  }

  // Look up the donation by original transaction ID
  const { data: donation, error: donationErr } = await supabase
    .from("fiat_donations")
    .select("id, amount_cents, currency, status, charity_id, attestation_hash, donor_email, donor_name")
    .eq("transaction_id", originalTxId)
    .single();

  if (donationErr || !donation) {
    console.error("Donation not found for Helcim refund:", originalTxId);
    // Return 200 to avoid Helcim retries for unknown transactions
    return jsonOk({ message: "Donation not found — skipped", originalTxId });
  }

  // Skip if already refunded
  if (donation.status === "refunded") {
    return jsonOk({ message: "Donation already refunded", donationId: donation.id });
  }

  // Create refund record (external refund — skip approval flow)
  const { data: refund, error: refundErr } = await supabase
    .from("fiat_refunds")
    .insert({
      donation_id: donation.id,
      amount_cents: amountCents || donation.amount_cents,
      currency: donation.currency,
      reason: "External refund via Helcim",
      status: "completed",
      processor: "helcim",
      processor_refund_id: refundTxId,
      processor_response: data,
      refunded_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (refundErr) {
    console.error("Failed to create refund record:", refundErr);
    return jsonError(500, "Failed to record refund");
  }

  // Update donation status
  await supabase
    .from("fiat_donations")
    .update({ status: "refunded" })
    .eq("id", donation.id);

  // Create disbursement hold
  await supabase.from("disbursement_holds").insert({
    charity_id: donation.charity_id,
    refund_id: refund.id,
    hold_amount_cents: amountCents || donation.amount_cents,
    currency: donation.currency,
    status: "active",
    note: "External Helcim refund via webhook",
  });

  // Fire-and-forget: reverse attestation if applicable
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (donation.attestation_hash && supabaseUrl && supabaseKey) {
    fetch(`${supabaseUrl}/functions/v1/reverse-attestation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refundId: refund.id,
        donationId: donation.id,
        attestationHash: donation.attestation_hash,
      }),
    }).catch((err) =>
      console.error("Attestation reversal trigger failed:", err),
    );
  }

  // Fire-and-forget: send refund receipt
  if (donation.donor_email && supabaseUrl && supabaseKey) {
    fetch(`${supabaseUrl}/functions/v1/refund-receipt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        donorEmail: donation.donor_email,
        donorName: donation.donor_name,
        amountCents: amountCents || donation.amount_cents,
        currency: donation.currency,
        originalTransactionId: originalTxId,
        refundTransactionId: refundTxId,
        processor: "helcim",
        refundDate: new Date().toISOString(),
      }),
    }).catch((err) => console.error("Refund receipt trigger failed:", err));
  }

  return jsonOk({
    message: "Refund recorded",
    refundId: refund.id,
    donationId: donation.id,
  });
}

/**
 * Handle a dispute/chargeback event from Helcim
 * @param supabase - Supabase client
 * @param data - Webhook event data
 */
async function handleDisputeEvent(
  supabase: ReturnType<typeof createClient>,
  data: HelcimWebhookPayload["data"],
): Promise<Response> {
  const txId = String(data.originalTransactionId || data.transactionId || "");
  const disputeId = String(data.disputeId || "");
  const amountCents = data.amount
    ? Math.round(Number(data.amount) * 100)
    : 0;

  if (!txId) {
    return jsonError(400, "Missing transactionId in dispute event");
  }

  // Look up the donation
  const { data: donation, error: donationErr } = await supabase
    .from("fiat_donations")
    .select("id, amount_cents, currency, charity_id")
    .eq("transaction_id", txId)
    .single();

  if (donationErr || !donation) {
    console.error("Donation not found for Helcim dispute:", txId);
    return jsonOk({ message: "Donation not found — skipped", txId });
  }

  // Check for existing dispute
  if (disputeId) {
    const { data: existing } = await supabase
      .from("fiat_disputes")
      .select("id")
      .eq("processor_dispute_id", disputeId)
      .single();

    if (existing) {
      return jsonOk({ message: "Dispute already recorded", disputeId: existing.id });
    }
  }

  // Create dispute record
  const disputeAmountCents = amountCents || donation.amount_cents;
  const { data: dispute, error: disputeErr } = await supabase
    .from("fiat_disputes")
    .insert({
      donation_id: donation.id,
      amount_cents: disputeAmountCents,
      currency: donation.currency,
      processor: "helcim",
      processor_dispute_id: disputeId || `helcim-${txId}-${Date.now()}`,
      dispute_reason: data.disputeReason || "chargeback",
      status: "open",
      net_amount_cents: disputeAmountCents,
      processor_response: data,
    })
    .select("id")
    .single();

  if (disputeErr) {
    console.error("Failed to create dispute record:", disputeErr);
    return jsonError(500, "Failed to record dispute");
  }

  // Create disbursement hold (net the disputed amount)
  await supabase.from("disbursement_holds").insert({
    charity_id: donation.charity_id,
    dispute_id: dispute.id,
    hold_amount_cents: disputeAmountCents,
    currency: donation.currency,
    status: "active",
    note: `Dispute hold: ${data.disputeReason || "chargeback"} (Helcim dispute ${disputeId})`,
  });

  return jsonOk({
    message: "Dispute recorded and disbursement hold created",
    disputeId: dispute.id,
    donationId: donation.id,
    holdAmount: disputeAmountCents,
  });
}

/**
 * Handle a dispute resolution event from Helcim
 * @param supabase - Supabase client
 * @param data - Webhook event data
 */
async function handleDisputeResolvedEvent(
  supabase: ReturnType<typeof createClient>,
  data: HelcimWebhookPayload["data"],
): Promise<Response> {
  const disputeId = String(data.disputeId || "");
  if (!disputeId) {
    return jsonError(400, "Missing disputeId in dispute.resolved event");
  }

  // Look up the dispute
  const { data: dispute, error: disputeErr } = await supabase
    .from("fiat_disputes")
    .select("id, donation_id, amount_cents, currency, status")
    .eq("processor_dispute_id", disputeId)
    .single();

  if (disputeErr || !dispute) {
    return jsonOk({ message: "Dispute not found — skipped", disputeId });
  }

  // Determine resolution status
  const disputeStatus = String(data.disputeStatus || "").toLowerCase();
  let resolvedStatus: string;
  if (disputeStatus.includes("won") || disputeStatus.includes("merchant")) {
    resolvedStatus = "resolved_won";
  } else if (disputeStatus.includes("settled") || disputeStatus.includes("partial")) {
    resolvedStatus = "resolved_settled";
  } else {
    resolvedStatus = "resolved_lost";
  }

  // Update dispute
  await supabase
    .from("fiat_disputes")
    .update({
      status: resolvedStatus,
      resolved_at: new Date().toISOString(),
      processor_response: data,
    })
    .eq("id", dispute.id);

  // If won: release the disbursement hold
  if (resolvedStatus === "resolved_won") {
    await supabase
      .from("disbursement_holds")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        note: "Dispute resolved in merchant's favor — hold released",
      })
      .eq("dispute_id", dispute.id)
      .eq("status", "active");
  }

  // If lost: apply the hold and reverse attestation
  if (resolvedStatus === "resolved_lost") {
    await supabase
      .from("disbursement_holds")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
        note: "Dispute lost — hold applied as netting deduction",
      })
      .eq("dispute_id", dispute.id)
      .eq("status", "active");

    // Update donation status
    await supabase
      .from("fiat_donations")
      .update({ status: "refunded" })
      .eq("id", dispute.donation_id);

    // Look up attestation hash for reversal
    const { data: donation } = await supabase
      .from("fiat_donations")
      .select("attestation_hash")
      .eq("id", dispute.donation_id)
      .single();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (donation?.attestation_hash && supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/functions/v1/reverse-attestation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disputeId: dispute.id,
          donationId: dispute.donation_id,
          attestationHash: donation.attestation_hash,
        }),
      }).catch((err) =>
        console.error("Attestation reversal trigger failed:", err),
      );
    }

    // Update dispute netting
    await supabase
      .from("fiat_disputes")
      .update({
        netted_at: new Date().toISOString(),
        netting_note: "Dispute lost — full amount netted from disbursements",
      })
      .eq("id", dispute.id);
  }

  return jsonOk({
    message: `Dispute resolved: ${resolvedStatus}`,
    disputeId: dispute.id,
    resolution: resolvedStatus,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify webhook signature
    const webhookSecret = Deno.env.get("HELCIM_WEBHOOK_SECRET");
    if (webhookSecret) {
      const signature = req.headers.get("x-helcim-signature") || "";
      const isValid = await verifyHelcimSignature(
        rawBody,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        console.error("Invalid Helcim webhook signature");
        return jsonError(401, "Invalid webhook signature");
      }
    }

    // Parse body
    let payload: HelcimWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as HelcimWebhookPayload;
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    if (!payload.eventType || !payload.data) {
      return jsonError(400, "Missing eventType or data in webhook payload");
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonError(503, "Database service unavailable");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route event
    console.log("Helcim webhook received:", payload.eventType);

    switch (payload.eventType) {
      case "transaction.refund":
        return await handleRefundEvent(supabase, payload.data);

      case "transaction.dispute":
        return await handleDisputeEvent(supabase, payload.data);

      case "transaction.dispute.resolved":
        return await handleDisputeResolvedEvent(supabase, payload.data);

      default:
        console.log("Unhandled Helcim event type:", payload.eventType);
        return jsonOk({ message: "Event type not handled", eventType: payload.eventType });
    }
  } catch (error) {
    console.error("Helcim webhook error:", error);
    const msg = error instanceof Error ? error.message : "Webhook processing failed";
    return jsonError(500, msg);
  }
});
