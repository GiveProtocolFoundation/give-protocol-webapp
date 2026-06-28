/**
 * Supabase Edge Function: donation-receipt
 * @module donation-receipt
 * @description Sends a donation acknowledgement email to the donor after a
 * successful payment via Helcim or PayPal. This letter serves as an official
 * record for the donor's charitable contribution and may be used for tax
 * purposes. Called fire-and-forget from helcim-validate (primary live path),
 * helcim-payment (legacy direct API), and paypal-capture-order after the
 * donation is persisted.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_EMAIL = "support@giveprotocol.io";
const PORTAL_URL = "https://giveprotocol.io";
const ORG_ADDRESS = "Give Protocol Foundation, giveprotocol.io";

interface DonationReceiptRequest {
  donorEmail: string;
  donorName: string | null;
  charityName: string | null;
  causeName?: string | null;
  fundName?: string | null;
  amountCents: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  donationDate: string; // ISO 8601
}

/** Escape HTML special characters to prevent XSS in email bodies */
function escapeHtml(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

/**
 * Zero-decimal currencies where amountCents already represents major units.
 * Must stay in sync with paypal-capture-order/index.ts.
 */
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

/** Format cents as a localised currency string e.g. "$50.00" */
function formatAmount(cents: number, currency: string): string {
  const major = ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())
    ? cents
    : cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

/** Format an ISO date string as a human-readable date */
function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Build the donation acknowledgement email HTML */
function buildReceiptHtml(req: DonationReceiptRequest): string {
  const donorName = req.donorName || "Donor";
  const charityName = req.charityName || "Give Protocol";
  const formattedAmount = formatAmount(req.amountCents, req.currency);
  const formattedDate = formatDate(req.donationDate);

  const safeDonorName = escapeHtml(donorName);
  const safeCharity = escapeHtml(charityName);
  const safeCause = req.causeName ? escapeHtml(req.causeName) : null;
  const safeFund = req.fundName ? escapeHtml(req.fundName) : null;
  const safeAmount = escapeHtml(formattedAmount);
  const safeDate = escapeHtml(formattedDate);
  const safeTxId = escapeHtml(req.transactionId);
  const safeMethod = escapeHtml(req.paymentMethod);
  const safeDonorEmail = escapeHtml(req.donorEmail);

  const destinationLabel = safeFund
    ? `Portfolio Fund: ${safeFund}`
    : safeCause
      ? `${safeCharity} — ${safeCause}`
      : safeCharity;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Donation Acknowledgement — Give Protocol</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">

    <h2 style="color:#111827;">Donation Acknowledgement</h2>
    <p>Dear ${safeDonorName},</p>
    <p>
      Thank you for your generous contribution to <strong>${destinationLabel}</strong>
      through Give Protocol. Your support makes a real difference.
    </p>

    <h3 style="color:#111827;font-size:15px;margin-top:24px;">Donation Details</h3>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;width:45%;">Donor</td>
        <td style="padding:10px 12px;color:#111827;">${safeDonorName}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Email</td>
        <td style="padding:10px 12px;color:#111827;">${safeDonorEmail}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Recipient</td>
        <td style="padding:10px 12px;color:#111827;">${destinationLabel}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Date</td>
        <td style="padding:10px 12px;color:#111827;">${safeDate}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Amount</td>
        <td style="padding:10px 12px;color:#111827;font-size:16px;font-weight:700;">${safeAmount}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Payment Method</td>
        <td style="padding:10px 12px;color:#111827;">${safeMethod}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Transaction ID</td>
        <td style="padding:10px 12px;color:#111827;font-size:12px;word-break:break-all;">${safeTxId}</td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#166534;">
        <strong>Tax Acknowledgement:</strong> No goods or services were provided
        in exchange for this contribution. This letter may serve as your official
        record for tax purposes. Please retain it for your records.
      </p>
    </div>

    <p>
      <a href="${PORTAL_URL}/donor-portal" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        View Donation History
      </a>
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;">
      ${ORG_ADDRESS}<br>
      Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
    </p>
  </div>
</body>
</html>`;
}

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

  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping donation receipt");
    return jsonResponse(
      { success: true, skipped: true, reason: "resend_not_configured" },
      200,
    );
  }

  // Verify the caller is authenticated (service role only — not public)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const reqObj = body as Record<string, unknown>;

  if (
    typeof reqObj.donorEmail !== "string" ||
    !reqObj.donorEmail.includes("@") ||
    typeof reqObj.amountCents !== "number" ||
    typeof reqObj.currency !== "string" ||
    typeof reqObj.transactionId !== "string" ||
    typeof reqObj.paymentMethod !== "string" ||
    typeof reqObj.donationDate !== "string"
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "Missing required fields: donorEmail, amountCents, currency, transactionId, paymentMethod, donationDate",
      },
      400,
    );
  }

  // Skip wallet-only placeholder emails (no real inbox behind them)
  if (reqObj.donorEmail.endsWith("@wallet.giveprotocol.io")) {
    return jsonResponse(
      { success: true, skipped: true, reason: "wallet_placeholder_email" },
      200,
    );
  }

  const request: DonationReceiptRequest = {
    donorEmail: reqObj.donorEmail,
    donorName: typeof reqObj.donorName === "string" ? reqObj.donorName : null,
    charityName:
      typeof reqObj.charityName === "string" ? reqObj.charityName : null,
    causeName: typeof reqObj.causeName === "string" ? reqObj.causeName : null,
    fundName: typeof reqObj.fundName === "string" ? reqObj.fundName : null,
    amountCents: reqObj.amountCents,
    currency: reqObj.currency,
    transactionId: reqObj.transactionId,
    paymentMethod: reqObj.paymentMethod,
    donationDate: reqObj.donationDate,
  };

  const html = buildReceiptHtml(request);

  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Give Protocol <notifications@giveprotocol.io>",
      to: [request.donorEmail],
      subject: `Donation acknowledgement — ${request.charityName ?? "Give Protocol"}`,
      html,
    }),
  });

  if (!sendResponse.ok) {
    const errText = await sendResponse.text();
    console.error(`Resend API error ${sendResponse.status}:`, errText);
    return jsonResponse(
      { success: false, error: "Email delivery failed" },
      500,
    );
  }

  const sendResult = (await sendResponse.json()) as Record<string, unknown>;
  console.log(
    `Donation receipt sent to ${request.donorEmail} (txId: ${request.transactionId}), emailId:`,
    sendResult.id,
  );

  return jsonResponse({ success: true, emailId: sendResult.id }, 200);
});
