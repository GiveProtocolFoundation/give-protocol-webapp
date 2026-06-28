/**
 * Supabase Edge Function for processing Helcim payments
 * @module helcim-payment
 * @description Handles one-time card payments through Helcim's API.
 * Validates requests, processes payments, and logs transactions.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  checkoutToken: string;
  amount: number; // in cents
  charityId: string;
  charityName: string;
  donorName: string;
  donorEmail: string;
  coverFees: boolean;
  ipAddress?: string;
}

interface HelcimPaymentResponse {
  transactionId: string;
  approvalCode: string;
  cardType: string;
  cardLastFour: string;
  status: string;
  amount: number;
}

/**
 * Validate the payment request body
 */
function validateRequest(body: unknown): body is PaymentRequest {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const req = body as Record<string, unknown>;

  return (
    typeof req.checkoutToken === "string" &&
    req.checkoutToken.length > 0 &&
    typeof req.amount === "number" &&
    req.amount > 0 &&
    typeof req.charityId === "string" &&
    req.charityId.length > 0 &&
    typeof req.charityName === "string" &&
    typeof req.donorName === "string" &&
    typeof req.donorEmail === "string" &&
    req.donorEmail.includes("@")
  );
}

/**
 * Process payment through Helcim API
 */
async function processHelcimPayment(
  request: PaymentRequest,
  apiToken: string,
  accountId: string,
  terminalId: string,
  testMode: boolean,
): Promise<HelcimPaymentResponse> {
  const helcimUrl = testMode
    ? "https://api.helcim.com/v2/payments/purchase"
    : "https://api.helcim.com/v2/payments/purchase";

  const response = await fetch(helcimUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-token": apiToken,
      accept: "application/json",
    },
    body: JSON.stringify({
      ipAddress: request.ipAddress || "0.0.0.0",
      currency: "USD",
      amount: request.amount / 100, // Helcim expects dollars
      customerCode: request.donorEmail,
      invoiceNumber: `DON-${Date.now()}`,
      cardToken: request.checkoutToken,
      ecommerce: true,
      comments: `Donation to ${request.charityName}`,
      billing: {
        name: request.donorName,
        email: request.donorEmail,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Helcim API error:", errorText);
    throw new Error(`Payment processing failed: ${response.status}`);
  }

  const result = await response.json();

  return {
    transactionId: result.transactionId || result.id,
    approvalCode: result.approvalCode || "",
    cardType: result.cardType || "",
    cardLastFour: result.cardNumber?.slice(-4) || "",
    status: result.status || "approved",
    amount: request.amount,
  };
}

/**
 * Log donation to Supabase database
 */
async function logDonation(
  supabase: ReturnType<typeof createClient>,
  request: PaymentRequest,
  paymentResult: HelcimPaymentResponse,
): Promise<void> {
  const { error } = await supabase.from("donations").insert({
    charity_id: request.charityId,
    donor_email: request.donorEmail,
    donor_name: request.donorName,
    amount_cents: request.amount,
    currency: "USD",
    payment_method: "card",
    transaction_id: paymentResult.transactionId,
    card_type: paymentResult.cardType,
    card_last_four: paymentResult.cardLastFour,
    fee_covered: request.coverFees,
    status: "completed",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to log donation:", error);
    // Don't throw - payment succeeded, logging is secondary
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();

    // Validate request
    if (!validateRequest(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Helcim credentials from environment
    const apiToken = Deno.env.get("HELCIM_API_TOKEN");
    const accountId = Deno.env.get("HELCIM_ACCOUNT_ID");
    const terminalId = Deno.env.get("HELCIM_TERMINAL_ID");
    const testMode = Deno.env.get("HELCIM_TEST_MODE") === "true";

    if (!apiToken || !accountId || !terminalId) {
      console.error("Missing Helcim configuration");
      return new Response(
        JSON.stringify({ error: "Payment service configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get client IP for fraud prevention
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const paymentRequest: PaymentRequest = {
      ...body,
      ipAddress: clientIp,
    };

    // Process payment through Helcim
    const paymentResult = await processHelcimPayment(
      paymentRequest,
      apiToken,
      accountId,
      terminalId,
      testMode,
    );

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await logDonation(supabase, paymentRequest, paymentResult);

      // Fire-and-forget donation receipt email (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/donation-receipt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donorEmail: paymentRequest.donorEmail,
          donorName: paymentRequest.donorName,
          charityName: paymentRequest.charityName,
          amountCents: paymentResult.amount,
          currency: "USD",
          transactionId: paymentResult.transactionId,
          paymentMethod: `Card (${paymentResult.cardType} ending ${paymentResult.cardLastFour})`,
          donationDate: new Date().toISOString(),
        }),
      }).catch((err) =>
        console.error("Donation receipt trigger failed (non-blocking):", err),
      );
    }

    // Return sanitized response
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentResult.transactionId,
        approvalCode: paymentResult.approvalCode,
        cardType: paymentResult.cardType,
        cardLastFour: paymentResult.cardLastFour,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Payment error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Payment processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
