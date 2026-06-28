/**
 * Supabase Edge Function for validating HelcimPay.js payment events
 * @module helcim-validate
 * @description Server-side validation of HelcimPay.js iframe postMessage events.
 * Verifies the SHA-256 hash using the secretToken stored during checkout
 * initialization. Only validated transactions are persisted as donations.
 *
 * Validation flow (per https://devdocs.helcim.com/docs/validate-helcimpayjs):
 *   1. Frontend receives eventMessage from HelcimPay.js iframe on SUCCESS
 *   2. Frontend forwards the full eventMessage + checkoutToken to this endpoint
 *   3. This function looks up the secretToken from checkout_sessions
 *   4. Computes SHA-256( JSON(transactionData) + secretToken )
 *   5. Compares against the hash provided by Helcim in the eventMessage
 *   6. Only if the hash matches → persists donation and returns success
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveNames } from "../_shared/receipt-context.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** JSON content-type header merged with CORS */
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

/** Transaction data returned by HelcimPay.js inside eventMessage.data */
interface HelcimTransactionData {
  transactionId?: string;
  amount?: string;
  approvalCode?: string;
  avsResponse?: string;
  cvvResponse?: string;
  cardHolderName?: string;
  cardNumber?: string;
  cardToken?: string;
  currency?: string;
  customerCode?: string;
  dateCreated?: string;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

/** Request body sent by the frontend after a HelcimPay.js SUCCESS event */
interface ValidateRequest {
  /** The checkoutToken used to open the HelcimPay.js iframe */
  checkoutToken: string;
  /** The raw transaction data object from eventMessage.data */
  transactionData: HelcimTransactionData;
  /** The hash string from eventMessage (Helcim-computed) */
  hash: string;
  /** Donation metadata from the frontend form */
  charityId: string;
  charityName: string;
  donorName: string;
  donorEmail: string;
  coverFees: boolean;
  /** The authenticated user's profile ID */
  donorId: string;
  /** Optional connected wallet address for dashboard association */
  donorAddress?: string;
}

/** Row from the checkout_sessions table */
interface CheckoutSession {
  id: string;
  checkout_token: string;
  secret_token: string;
  amount: number;
  currency: string;
  donation_type: string;
  validated: boolean;
  expires_at: string;
  charity_id: string | null;
  cause_id: string | null;
  fund_id: string | null;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate the incoming request body
 * @param body - Parsed request body
 * @returns Whether the body contains all required fields
 */
function validateRequestBody(body: unknown): body is ValidateRequest {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const req = body as Record<string, unknown>;

  return (
    typeof req.checkoutToken === "string" &&
    req.checkoutToken.length > 0 &&
    typeof req.transactionData === "object" &&
    req.transactionData !== null &&
    typeof req.hash === "string" &&
    req.hash.length > 0 &&
    typeof req.charityId === "string" &&
    req.charityId.length > 0 &&
    typeof req.charityName === "string" &&
    typeof req.donorName === "string" &&
    typeof req.donorEmail === "string" &&
    req.donorEmail.includes("@") &&
    typeof req.donorId === "string" &&
    req.donorId.length > 0
  );
}

/**
 * Compute the SHA-256 hash that Helcim expects for validation.
 *
 * Per Helcim docs: hash = SHA-256( JSON.stringify(data) + secretToken )
 * where the JSON is re-encoded from a parsed object to ensure consistent
 * formatting ("cleaned" JSON with unicode-escaped special characters).
 *
 * @param transactionData - The transaction data object from eventMessage.data
 * @param secretToken - The secret token stored during checkout initialization
 * @returns Hex-encoded SHA-256 hash
 */
async function computeHelcimHash(
  transactionData: HelcimTransactionData,
  secretToken: string,
): Promise<string> {
  // Re-encode to ensure consistent JSON representation.
  // Helcim uses JSON-escaped unicode for special characters.
  const cleanedJson = JSON.stringify(transactionData);
  const payload = cleanedJson + secretToken;

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

/**
 * Look up a checkout session by its token
 * @param supabase - Supabase client (service role)
 * @param checkoutToken - The token to look up
 * @returns The session row, or null if not found / expired / already validated
 */
async function lookupSession(
  supabase: ReturnType<typeof createClient>,
  checkoutToken: string,
): Promise<CheckoutSession | null> {
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("checkout_token", checkoutToken)
    .eq("validated", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data as CheckoutSession;
}

/**
 * Mark a checkout session as validated (prevents replay)
 * @param supabase - Supabase client (service role)
 * @param sessionId - The session UUID to update
 */
async function markSessionValidated(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("checkout_sessions")
    .update({ validated: true })
    .eq("id", sessionId);

  if (error) {
    console.error("Failed to mark session as validated:", error);
  }
}

/** Resolved names for cause/fund context */
interface ResolvedDonationNames {
  causeName: string | null;
  fundName: string | null;
}

/**
 * Persist a validated one-time fiat payment into fiat_donations
 * @param supabase - Supabase client (service role)
 * @param request - Donation metadata from frontend
 * @param txData - Validated transaction data from Helcim
 * @param session - The checkout session
 * @param names - Resolved cause/fund names
 * @param subscriptionId - Optional FK to fiat_subscriptions for recurring initial payments
 * @returns The donation ID (UUID) of the inserted row
 */
async function logFiatPayment(
  supabase: ReturnType<typeof createClient>,
  request: ValidateRequest,
  txData: HelcimTransactionData,
  session: CheckoutSession,
  names: ResolvedDonationNames,
  subscriptionId?: string,
): Promise<string> {
  const cardNumber = txData.cardNumber || "";
  const cardLastFour = cardNumber.length >= 4 ? cardNumber.slice(-4) : "";

  const amountCents = txData.amount
    ? Math.round(Number(txData.amount) * 100)
    : Math.round(session.amount * 100);

  const { data, error } = await supabase
    .from("fiat_donations")
    .insert({
      donor_id: request.donorId,
      charity_id: session.charity_id ?? request.charityId,
      donor_email: request.donorEmail,
      donor_name: request.donorName,
      donor_address: request.donorAddress || null,
      amount_cents: amountCents,
      currency: session.currency,
      payment_method: "card",
      transaction_id: txData.transactionId || "",
      card_type: txData.type || "",
      card_last_four: cardLastFour,
      fee_covered: request.coverFees,
      subscription_id: subscriptionId || null,
      disbursement_status: "received",
      status: "completed",
      // Cause/fund context from trusted session data
      cause_id: session.cause_id ?? null,
      fund_id: session.fund_id ?? null,
      cause_name: names.causeName ?? null,
      fund_name: names.fundName ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to log fiat payment:", error);
    throw new Error("Payment validated but failed to record donation");
  }

  return data.id;
}

/**
 * Persist a validated subscription into fiat_subscriptions, then log the initial payment
 * @param supabase - Supabase client (service role)
 * @param request - Donation metadata from frontend
 * @param txData - Validated transaction data from Helcim
 * @param session - The checkout session
 * @param names - Resolved cause/fund names
 * @returns The donation ID (UUID) of the initial payment
 */
async function logFiatSubscription(
  supabase: ReturnType<typeof createClient>,
  request: ValidateRequest,
  txData: HelcimTransactionData,
  session: CheckoutSession,
  names: ResolvedDonationNames,
): Promise<string> {
  const amountCents = txData.amount
    ? Math.round(Number(txData.amount) * 100)
    : Math.round(session.amount * 100);

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const { data: subscription, error: subError } = await supabase
    .from("fiat_subscriptions")
    .insert({
      donor_id: request.donorId,
      charity_id: session.charity_id ?? request.charityId,
      donor_email: request.donorEmail,
      donor_name: request.donorName,
      donor_address: request.donorAddress || null,
      amount_cents: amountCents,
      currency: session.currency,
      customer_id: txData.customerCode || "",
      fee_covered: request.coverFees,
      frequency: "monthly",
      status: "active",
      next_billing_date: nextBillingDate.toISOString(),
      // Cause/fund context from trusted session data
      cause_id: session.cause_id ?? null,
      fund_id: session.fund_id ?? null,
      cause_name: names.causeName ?? null,
      fund_name: names.fundName ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (subError) {
    console.error("Failed to log fiat subscription:", subError);
    throw new Error("Payment validated but failed to record subscription");
  }

  // Log the initial payment linked to the subscription
  return await logFiatPayment(
    supabase,
    request,
    txData,
    session,
    names,
    subscription.id,
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

/**
 * Parse and structurally validate the request body.
 * @returns The validated request, or a Response describing the failure.
 */
async function parseAndValidateBody(
  req: Request,
): Promise<ValidateRequest | Response> {
  let body: unknown;
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: jsonHeaders },
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Validate request structure
    if (!validateRequestBody(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Invalid request. Required: checkoutToken, transactionData, hash, charityId, charityName, donorName, donorEmail, donorId",
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation service unavailable",
        }),
        { status: 503, headers: jsonHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // -----------------------------------------------------------------------
    // Step 1: Look up the checkout session (contains the secretToken)
    // -----------------------------------------------------------------------
    const session = await lookupSession(supabase, body.checkoutToken);

    if (!session) {
      console.error("No valid checkout session found", {
        checkoutToken: body.checkoutToken,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired checkout session",
        }),
        { status: 403, headers: jsonHeaders },
      );
    }

    // -----------------------------------------------------------------------
    // Step 2: Compute the expected hash and compare
    // -----------------------------------------------------------------------
    const computedHash = await computeHelcimHash(
      body.transactionData,
      session.secret_token,
    );
  }

    if (computedHash !== body.hash) {
      console.error("Hash validation failed", {
        checkoutToken: body.checkoutToken,
        expected: computedHash,
        received: body.hash,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment validation failed: hash mismatch",
        }),
        { status: 403, headers: jsonHeaders },
      );
    }

    // -----------------------------------------------------------------------
    // Step 3: Mark session as validated (prevents replay attacks)
    // -----------------------------------------------------------------------
    await markSessionValidated(supabase, session.id);

    // -----------------------------------------------------------------------
    // Step 3b: Resolve cause/fund names from session (trusted source)
    // -----------------------------------------------------------------------
    const resolvedNames = await resolveNames(supabase, {
      charityId: session.charity_id ?? body.charityId,
      causeId: session.cause_id ?? undefined,
      fundId: session.fund_id ?? undefined,
      amountUsd: session.amount,
      donationType: session.donation_type as "one-time" | "subscription",
    });

    const donationNames: ResolvedDonationNames = {
      causeName: resolvedNames.causeName,
      fundName: resolvedNames.fundName,
    };

    // -----------------------------------------------------------------------
    // Step 4: Persist the donation / subscription
    // -----------------------------------------------------------------------
    let donationId: string;
    if (session.donation_type === "subscription") {
      donationId = await logFiatSubscription(
        supabase,
        body,
        body.transactionData,
        session,
        donationNames,
      );
    } else {
      donationId = await logFiatPayment(
        supabase,
        body,
        body.transactionData,
        session,
        donationNames,
      );
    }

    // -----------------------------------------------------------------------
    // Step 4b: Fire-and-forget attestation (non-blocking)
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Step 4c: Fire-and-forget donation receipt email (non-blocking)
    // -----------------------------------------------------------------------
    const receiptAmountCents = body.transactionData.amount
      ? Math.round(Number(body.transactionData.amount) * 100)
      : Math.round(session.amount * 100);
    const receiptCardNumber = body.transactionData.cardNumber || "";
    const receiptCardLastFour =
      receiptCardNumber.length >= 4 ? receiptCardNumber.slice(-4) : "";
    const receiptCardType = body.transactionData.type || "Card";

    fetch(`${supabaseUrl}/functions/v1/donation-receipt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        donorEmail: body.donorEmail,
        donorName: body.donorName,
        charityName: resolvedNames.charityName ?? body.charityName,
        causeName: resolvedNames.causeName,
        fundName: resolvedNames.fundName,
        amountCents: receiptAmountCents,
        currency: session.currency,
        transactionId: body.transactionData.transactionId || "",
        paymentMethod: receiptCardLastFour
          ? `Card (${receiptCardType} ending ${receiptCardLastFour})`
          : "Card",
        donationDate: new Date().toISOString(),
      }),
    }).catch((err) =>
      console.error("Donation receipt trigger failed (non-blocking):", err),
    );

    // -----------------------------------------------------------------------
    // Step 5: Return success with sanitized transaction details
    // -----------------------------------------------------------------------
    const cardNumber = body.transactionData.cardNumber || "";
    const cardLastFour = cardNumber.length >= 4 ? cardNumber.slice(-4) : "";

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: body.transactionData.transactionId || "",
        approvalCode: body.transactionData.approvalCode || "",
        cardLastFour,
        donationType: session.donation_type,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Validation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Payment validation failed";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
