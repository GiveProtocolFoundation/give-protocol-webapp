/**
 * Supabase Edge Function: process-refund
 * @module process-refund
 * @description Processes an approved refund by calling the appropriate payment
 * processor API (Helcim or PayPal), updating the refund and donation records,
 * and triggering on-chain attestation reversal + refund receipt email.
 *
 * Called after admin_process_refund() RPC creates an approved refund record.
 *
 * Flow:
 *   1. Look up the approved refund + associated donation
 *   2. Validate the 30-day refund window (double-check)
 *   3. Call Helcim POST /v2/payments/refund or PayPal POST /v2/payments/captures/{id}/refund
 *   4. Update refund status and donation status to 'refunded'
 *   5. Fire-and-forget: reverse on-chain attestation
 *   6. Fire-and-forget: send refund receipt email
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

/** Maximum days after donation that a refund can be processed */
const REFUND_WINDOW_DAYS = 30;

interface ProcessRefundRequest {
  refundId: string;
}

interface RefundRow {
  id: string;
  donation_id: string;
  amount_cents: number;
  currency: string;
  processor: string;
  status: string;
}

interface DonationRow {
  id: string;
  transaction_id: string;
  amount_cents: number;
  currency: string;
  payment_processor: string | null;
  donor_email: string;
  donor_name: string;
  charity_id: string;
  attestation_hash: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a JSON success response
 * @param body - Response body object
 * @returns Response with JSON content-type
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
 * @returns Response with JSON content-type
 */
function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: jsonHeaders,
  });
}

/**
 * Check if a donation is within the refund window
 * @param donationCreatedAt - ISO 8601 date string of donation creation
 * @returns Whether the donation is within the refund window
 */
function isWithinRefundWindow(donationCreatedAt: string): boolean {
  const donationDate = new Date(donationCreatedAt);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - donationDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysDiff <= REFUND_WINDOW_DAYS;
}

// ---------------------------------------------------------------------------
// Helcim refund
// ---------------------------------------------------------------------------

/**
 * Process a refund via Helcim API
 * @param transactionId - Original Helcim transaction ID
 * @param amountCents - Refund amount in cents
 * @returns Helcim refund response
 */
async function refundViaHelcim(
  transactionId: string,
  amountCents: number,
): Promise<{ refundTransactionId: string; rawResponse: Record<string, unknown> }> {
  const apiToken = Deno.env.get("HELCIM_API_TOKEN");
  if (!apiToken) {
    throw new Error("HELCIM_API_TOKEN not configured");
  }

  const amount = (amountCents / 100).toFixed(2);

  const response = await fetch("https://api.helcim.com/v2/payments/refund", {
    method: "POST",
    headers: {
      "api-token": apiToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalTransactionId: Number(transactionId),
      amount: Number(amount),
      ipAddress: "0.0.0.0",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Helcim refund API error:", response.status, errorText);
    throw new Error(
      `Helcim refund failed (${response.status}): ${errorText.slice(0, 300)}`,
    );
  }

  const data = await response.json();
  return {
    refundTransactionId: String(data.transactionId || ""),
    rawResponse: data as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// PayPal refund
// ---------------------------------------------------------------------------

/**
 * Get PayPal API base URL from environment
 * @returns PayPal API base URL
 */
function getPayPalBaseUrl(): string {
  const mode = Deno.env.get("PAYPAL_MODE") || "sandbox";
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Obtain PayPal OAuth2 access token
 * @returns Access token string
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const baseUrl = getPayPalBaseUrl();
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal OAuth2 error:", errorText);
    throw new Error("Failed to obtain PayPal access token");
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

/**
 * Process a refund via PayPal API
 * @param captureId - Original PayPal capture ID (stored as transaction_id)
 * @param amountCents - Refund amount in cents
 * @param currency - Currency code
 * @returns PayPal refund response
 */
async function refundViaPayPal(
  captureId: string,
  amountCents: number,
  currency: string,
): Promise<{ refundId: string; rawResponse: Record<string, unknown> }> {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const amount = (amountCents / 100).toFixed(2);

  const response = await fetch(
    `${baseUrl}/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          value: amount,
          currency_code: currency.toUpperCase(),
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal refund API error:", response.status, errorText);
    throw new Error(
      `PayPal refund failed (${response.status}): ${errorText.slice(0, 300)}`,
    );
  }

  const data = await response.json();
  return {
    refundId: (data as Record<string, unknown>).id as string || "",
    rawResponse: data as Record<string, unknown>,
  };
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
    // Parse request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    const reqObj = body as Record<string, unknown>;
    if (typeof reqObj.refundId !== "string" || reqObj.refundId.length === 0) {
      return jsonError(400, "Required: refundId (string)");
    }

    const request: ProcessRefundRequest = { refundId: reqObj.refundId };

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonError(503, "Database service unavailable");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Look up refund record
    const { data: refund, error: refundError } = await supabase
      .from("fiat_refunds")
      .select("id, donation_id, amount_cents, currency, processor, status")
      .eq("id", request.refundId)
      .single();

    if (refundError || !refund) {
      return jsonError(404, "Refund record not found");
    }

    const refundRow = refund as RefundRow;

    if (refundRow.status !== "approved") {
      return jsonError(
        400,
        `Refund cannot be processed — current status: ${refundRow.status}`,
      );
    }

    // Step 2: Look up donation
    const { data: donation, error: donationError } = await supabase
      .from("fiat_donations")
      .select(
        "id, transaction_id, amount_cents, currency, payment_processor, donor_email, donor_name, charity_id, attestation_hash, created_at",
      )
      .eq("id", refundRow.donation_id)
      .single();

    if (donationError || !donation) {
      return jsonError(404, "Associated donation not found");
    }

    const donationRow = donation as DonationRow;

    // Step 3: Double-check 30-day window
    if (!isWithinRefundWindow(donationRow.created_at)) {
      // Mark refund as denied
      await supabase
        .from("fiat_refunds")
        .update({
          status: "denied",
          denial_reason: "Donation is outside the 30-day refund window",
        })
        .eq("id", refundRow.id);

      return jsonError(400, "Refund denied: donation is outside the 30-day refund window");
    }

    // Step 4: Mark refund as processing
    await supabase
      .from("fiat_refunds")
      .update({ status: "processing" })
      .eq("id", refundRow.id);

    // Step 5: Call payment processor refund API
    let processorRefundId: string;
    let processorResponse: Record<string, unknown>;

    try {
      if (refundRow.processor === "paypal") {
        const result = await refundViaPayPal(
          donationRow.transaction_id,
          refundRow.amount_cents,
          refundRow.currency,
        );
        processorRefundId = result.refundId;
        processorResponse = result.rawResponse;
      } else {
        const result = await refundViaHelcim(
          donationRow.transaction_id,
          refundRow.amount_cents,
        );
        processorRefundId = result.refundTransactionId;
        processorResponse = result.rawResponse;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Processor refund failed";
      console.error("Processor refund error:", errorMsg);

      // Mark refund as failed
      await supabase
        .from("fiat_refunds")
        .update({
          status: "failed",
          processor_response: { error: errorMsg },
        })
        .eq("id", refundRow.id);

      return jsonError(502, errorMsg);
    }

    // Step 6: Update refund as completed
    const now = new Date().toISOString();
    await supabase
      .from("fiat_refunds")
      .update({
        status: "completed",
        processor_refund_id: processorRefundId,
        processor_response: processorResponse,
        refunded_at: now,
      })
      .eq("id", refundRow.id);

    // Step 7: Update donation status to refunded
    await supabase
      .from("fiat_donations")
      .update({ status: "refunded" })
      .eq("id", donationRow.id);

    // Step 8: Create disbursement hold for the charity
    await supabase.from("disbursement_holds").insert({
      charity_id: donationRow.charity_id,
      refund_id: refundRow.id,
      hold_amount_cents: refundRow.amount_cents,
      currency: refundRow.currency,
      status: "active",
      note: `Refund processed for donation ${donationRow.id}`,
    });

    // Step 9: Fire-and-forget: reverse on-chain attestation
    if (donationRow.attestation_hash) {
      fetch(`${supabaseUrl}/functions/v1/reverse-attestation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refundId: refundRow.id,
          donationId: donationRow.id,
          attestationHash: donationRow.attestation_hash,
        }),
      }).catch((err) =>
        console.error(
          "Attestation reversal trigger failed (non-blocking):",
          err,
        ),
      );
    } else {
      // No attestation to reverse — mark as skipped
      await supabase
        .from("fiat_refunds")
        .update({ attestation_reversal_status: "skipped" })
        .eq("id", refundRow.id);
    }

    // Step 10: Fire-and-forget: send refund receipt email
    fetch(`${supabaseUrl}/functions/v1/refund-receipt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        donorEmail: donationRow.donor_email,
        donorName: donationRow.donor_name,
        amountCents: refundRow.amount_cents,
        currency: refundRow.currency,
        originalTransactionId: donationRow.transaction_id,
        refundTransactionId: processorRefundId,
        processor: refundRow.processor,
        refundDate: now,
      }),
    }).catch((err) =>
      console.error("Refund receipt trigger failed (non-blocking):", err),
    );

    return jsonOk({
      refundId: refundRow.id,
      donationId: donationRow.id,
      processorRefundId,
      processor: refundRow.processor,
      amountCents: refundRow.amount_cents,
      currency: refundRow.currency,
    });
  } catch (error) {
    console.error("Process refund error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Refund processing failed";
    return jsonError(500, errorMessage);
  }
});
