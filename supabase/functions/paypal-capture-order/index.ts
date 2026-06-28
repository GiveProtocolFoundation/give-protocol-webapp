/**
 * Supabase Edge Function for capturing PayPal orders
 * @module paypal-capture-order
 * @description Captures a PayPal order after donor approval, persists the
 * fiat donation, and triggers attestation.
 *
 * Flow:
 *   1. Receive POST with the PayPal orderId
 *   2. Obtain PayPal OAuth2 access token
 *   3. Capture the order via Orders V2 API
 *   4. Verify capture status is COMPLETED
 *   5. Look up checkout session by paypal_order_id
 *   6. Mark session as validated
 *   7. Persist donation into fiat_donations
 *   8. Fire-and-forget attestation call
 *   9. Return transaction details
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveNames } from "../_shared/receipt-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** JSON content-type header merged with CORS */
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

interface CaptureRequest {
  orderId: string;
}

/** Row from the checkout_sessions table */
interface CheckoutSession {
  id: string;
  checkout_token: string;
  amount: number;
  currency: string;
  donation_type: string;
  charity_id: string | null;
  cause_id: string | null;
  fund_id: string | null;
  validated: boolean;
  paypal_order_id: string | null;
}

/** Zero-decimal currencies that should not be multiplied by 100 */
const ZERO_DECIMAL_CURRENCIES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

/**
 * Type guard that validates an incoming request body matches CaptureRequest shape
 * @param body - Parsed request body
 * @returns Whether the body contains a valid orderId
 */
function validateRequest(body: unknown): body is CaptureRequest {
  if (typeof body !== "object" || body === null) return false;
  const req = body as Record<string, unknown>;
  return typeof req.orderId === "string" && req.orderId.length > 0;
}

/**
 * Resolve the PayPal API base URL from the PAYPAL_MODE environment variable
 * @returns The base URL for sandbox or live PayPal API
 */
function getPayPalBaseUrl(): string {
  const mode = Deno.env.get("PAYPAL_MODE") || "sandbox";
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Obtain a PayPal OAuth2 access token using client credentials
 * @returns The access token string
 * @throws Error if token request fails
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
    console.error("PayPal OAuth2 token error:", errorText);
    throw new Error("Failed to obtain PayPal access token");
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

/**
 * Capture a PayPal order by ID
 * @param accessToken - PayPal OAuth2 access token
 * @param orderId - The PayPal order ID to capture
 * @returns The capture response object
 * @throws Error if capture fails
 */
async function capturePayPalOrder(
  accessToken: string,
  orderId: string,
): Promise<Record<string, unknown>> {
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal capture order error:", errorText);
    throw new Error("Failed to capture PayPal order");
  }

  return await response.json();
}

/**
 * Convert a PayPal amount string to cents, respecting zero-decimal currencies
 * @param amountStr - The amount string from PayPal (e.g. "25.00")
 * @param currency - The currency code (e.g. "USD")
 * @returns The amount in smallest currency unit (cents for most currencies)
 */
function toAmountCents(amountStr: string, currency: string): number {
  const amount = Number.parseFloat(amountStr);
  if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/**
 * Look up the charity name from the profiles/charity_details table
 * @param supabase - Supabase client (service role)
 * @param charityId - The charity profile ID
 * @returns The charity name, or null if not found
 */
async function lookupCharityName(
  supabase: ReturnType<typeof createClient>,
  charityId: string | null,
): Promise<string | null> {
  if (!charityId) return null;

  const names = await resolveNames(supabase, {
    charityId,
    amountUsd: 0,
    donationType: "one-time",
  });

  return names.charityName;
}

/**
 * Parse and validate the incoming request body
 * @param req - The incoming HTTP request
 * @returns The validated request body, or a Response if invalid
 */
async function parseRequestBody(
  req: Request,
): Promise<CaptureRequest | Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: jsonHeaders },
    );
  }

  if (!validateRequest(body)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid request. Required: orderId (string)",
      }),
      { status: 400, headers: jsonHeaders },
    );
  }

  return body;
}

/**
 * Extract payer details and first capture from PayPal response
 * @param captureResponse - The PayPal capture response object
 * @returns Payer email, full name, capture ID, amount, currency, and donor ID
 * @throws If capture data is missing from the response
 */
function extractCaptureDetails(
  captureResponse: Record<string, unknown>,
  sessionCurrency: string,
): {
  payerEmail: string;
  payerFullName: string;
  captureId: string;
  amountCents: number;
  currency: string;
  donorIdFromCustom: string | null;
} {
  const payer = captureResponse.payer as Record<string, unknown> | undefined;
  const payerEmail = (payer?.email_address as string) || "";
  const payerName = payer?.name as Record<string, string> | undefined;
  const payerFullName = payerName
    ? [payerName.given_name, payerName.surname].filter(Boolean).join(" ")
    : "";

  const purchaseUnits = captureResponse.purchase_units as Array<
    Record<string, unknown>
  >;
  const firstUnit = purchaseUnits?.[0];
  const payments = firstUnit?.payments as Record<string, unknown> | undefined;
  const captures = payments?.captures as
    | Array<Record<string, unknown>>
    | undefined;
  const firstCapture = captures?.[0];

  if (!firstCapture) {
    console.error("No capture data in PayPal response:", captureResponse);
    throw new Error("PayPal capture response missing capture data");
  }

  const captureId = firstCapture.id as string;
  const captureAmount = firstCapture.amount as Record<string, string>;
  const amountValue = captureAmount?.value || "0";
  const currency = (
    captureAmount?.currency_code || sessionCurrency
  ).toUpperCase();
  const amountCents = toAmountCents(amountValue, currency);

  let donorIdFromCustom: string | null = null;
  const customId = firstUnit?.custom_id as string | undefined;
  if (customId) {
    try {
      const parsed = JSON.parse(customId);
      donorIdFromCustom = parsed.donorId || null;
    } catch {
      console.error("Failed to parse custom_id JSON:", customId);
    }
  }

  return {
    payerEmail,
    payerFullName,
    captureId,
    amountCents,
    currency,
    donorIdFromCustom,
  };
}

/**
 * Look up checkout session and validate the PayPal order
 * @param supabase - Supabase client
 * @param orderId - PayPal order ID
 * @returns The checkout session, or a Response if invalid
 */
async function lookupCheckoutSession(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
): Promise<CheckoutSession | Response> {
  const { data: session, error: sessionError } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("paypal_order_id", orderId)
    .eq("validated", false)
    .single();

  if (sessionError || !session) {
    console.error(
      "No valid checkout session found for PayPal order:",
      orderId,
      sessionError,
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid or already processed PayPal order",
      }),
      { status: 403, headers: jsonHeaders },
    );
  }

  return session as CheckoutSession;
}

/**
 * Persist fiat donation record and trigger attestation
 * @param supabase - Supabase client
 * @param params - Donation parameters
 * @returns The donation ID
 * @throws If the donation insert fails
 */
async function persistDonation(
  supabase: ReturnType<typeof createClient>,
  params: {
    donorIdFromCustom: string | null;
    payerEmail: string;
    payerFullName: string;
    checkoutSession: CheckoutSession;
    charityName: string | null;
    amountCents: number;
    currency: string;
    captureId: string;
    causeName: string | null;
    fundName: string | null;
  },
): Promise<string> {
  const { data: donation, error: donationError } = await supabase
    .from("fiat_donations")
    .insert({
      donor_id: params.donorIdFromCustom,
      donor_email: params.payerEmail,
      donor_name: params.payerFullName,
      charity_id: params.checkoutSession.charity_id,
      charity_name: params.charityName || "Unknown Charity",
      amount_cents: params.amountCents,
      currency: params.currency,
      payment_processor: "paypal",
      payment_method: "paypal",
      transaction_id: params.captureId,
      status: "completed",
      fee_covered: false,
      cause_id: params.checkoutSession.cause_id,
      fund_id: params.checkoutSession.fund_id,
      cause_name: params.causeName,
      fund_name: params.fundName,
      disbursement_status: "received",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (donationError) {
    console.error("Failed to persist fiat donation:", donationError);
    throw new Error("Payment captured but failed to record donation");
  }

  return donation.id;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const bodyOrResponse = await parseRequestBody(req);
    if (bodyOrResponse instanceof Response) return bodyOrResponse;
    const body = bodyOrResponse;

    // Step 1: Capture the PayPal order
    const accessToken = await getPayPalAccessToken();
    const captureResponse = await capturePayPalOrder(accessToken, body.orderId);

    if (captureResponse.status !== "COMPLETED") {
      console.error("PayPal order not completed:", captureResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: `PayPal order status: ${captureResponse.status}`,
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Step 2: Initialize Supabase and look up checkout session
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Database service unavailable",
        }),
        { status: 503, headers: jsonHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const sessionOrResponse = await lookupCheckoutSession(
      supabase,
      body.orderId,
    );
    if (sessionOrResponse instanceof Response) return sessionOrResponse;
    const checkoutSession = sessionOrResponse;

    // Step 3: Mark session as validated
    const { error: updateError } = await supabase
      .from("checkout_sessions")
      .update({ validated: true })
      .eq("id", checkoutSession.id);

    if (updateError) {
      console.error("Failed to mark session as validated:", updateError);
    }

    // Step 4: Extract payer and capture details
    const {
      payerEmail,
      payerFullName,
      captureId,
      amountCents,
      currency,
      donorIdFromCustom,
    } = extractCaptureDetails(captureResponse, checkoutSession.currency);

    // Step 5: Look up charity and cause/fund names
    const charityName = await lookupCharityName(
      supabase,
      checkoutSession.charity_id,
    );
    const resolvedNames = await resolveNames(supabase, {
      charityId: checkoutSession.charity_id ?? undefined,
      causeId: checkoutSession.cause_id ?? undefined,
      fundId: checkoutSession.fund_id ?? undefined,
      amountUsd: checkoutSession.amount,
      donationType: checkoutSession.donation_type as
        | "one-time"
        | "subscription",
    });

    // Step 6: Insert fiat donation record
    const donationId = await persistDonation(supabase, {
      donorIdFromCustom,
      payerEmail,
      payerFullName,
      checkoutSession,
      charityName,
      amountCents,
      currency,
      captureId,
      causeName: resolvedNames.causeName ?? null,
      fundName: resolvedNames.fundName ?? null,
    });

    // Step 7: Fire-and-forget attestation (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/attest-fiat-donation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ donationId }),
    }).catch((err) =>
      console.error("Attestation trigger failed (non-blocking):", err),
    );

    // Step 8: Fire-and-forget donation receipt email (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/donation-receipt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        donorEmail: payerEmail,
        donorName: payerFullName || null,
        charityName: charityName,
        causeName: resolvedNames.causeName ?? null,
        fundName: resolvedNames.fundName ?? null,
        amountCents,
        currency,
        transactionId: captureId,
        paymentMethod: "PayPal",
        donationDate: new Date().toISOString(),
      }),
    }).catch((err) =>
      console.error("Donation receipt trigger failed (non-blocking):", err),
    );

    // Step 8: Return success
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: captureId,
        amount: amountCents,
        currency,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("PayPal capture error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to capture PayPal order";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
