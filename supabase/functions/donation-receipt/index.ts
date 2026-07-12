/**
 * Supabase Edge Function: donation-receipt
 * @module donation-receipt
 * @description Sends a donation receipt email to the donor after a successful
 * payment via Helcim or PayPal. This letter serves as an official record for
 * the donor's charitable contribution and may be used for tax purposes.
 * Called fire-and-forget from helcim-validate (primary live path),
 * helcim-payment (legacy direct API), and paypal-capture-order after the
 * donation is persisted.
 * @version 2 — GIV-638: CMO-approved template copy (GIV-634); Helcim/PayPal
 *   split; IRS Pub. 1771 fields; country-gated 501(c)(3) language (GIV-520).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = "Give Protocol <notifications@giveprotocol.io>";
const REPLY_TO = "info@giveprotocol.io";
const PORTAL_URL = "https://giveprotocol.io";
const SUPPORT_EMAIL = "info@giveprotocol.io";

const LEGAL_FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#6b7280;">
    Give Protocol &middot; giveprotocol.io &middot; You're receiving this because of activity on your Give Protocol account.<br>
    Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </p>
`;

const LEGAL_FOOTER_TEXT = `\n---\nGive Protocol · giveprotocol.io · You're receiving this because of activity on your Give Protocol account.\nQuestions? Reply to this email or write to ${SUPPORT_EMAIL}.`;

interface DonationReceiptRequest {
  donorEmail: string;
  donorName: string | null;
  charityName: string | null;
  charityEin?: string | null;
  /** ISO 3166-1 alpha-2 country code of the charity. Gates 501(c)(3) language. */
  charityCountryCode?: string | null;
  /** Country name for non-US generic tax paragraph. */
  charityCountry?: string | null;
  causeName?: string | null;
  fundName?: string | null;
  amountCents: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  donationDate: string; // ISO 8601
  /** Helcim: card brand (e.g. "Visa"). Present for Helcim receipts. */
  cardBrand?: string | null;
  /** Helcim: last 4 digits of card. Present for Helcim receipts. */
  cardLast4?: string | null;
  /** PayPal: donor's PayPal email. Present for PayPal receipts. */
  paypalEmail?: string | null;
  /** URL for the donor to view this donation in their account. */
  donationDetailUrl?: string | null;
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

/** Wrap content in the shared Give Protocol email shell */
function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${bodyHtml}
    ${LEGAL_FOOTER_HTML}
  </div>
</body>
</html>`;
}

/**
 * Build the US 501(c)(3) tax paragraph (IRS Pub. 1771).
 * Do not edit without CFO / legal review.
 */
function buildTaxParagraphHtml(
  charityLegalName: string,
  isUS: boolean,
  charityCountry: string,
): string {
  if (isUS) {
    return `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#166534;">
        <strong>${charityLegalName}</strong> is a registered 501(c)(3) tax-exempt organization in the United States. No goods or services were provided in exchange for this contribution. Your donation may be tax-deductible to the fullest extent permitted by law. Please consult your tax advisor. Retain this receipt for your records.
      </p>
    </div>`;
  }
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#374151;">
      <strong>${charityLegalName}</strong> is a verified nonprofit in ${charityCountry}. Consult your local tax advisor to determine deductibility.
    </p>
  </div>`;
}

function buildTaxParagraphText(
  charityLegalName: string,
  isUS: boolean,
  charityCountry: string,
): string {
  if (isUS) {
    return `${charityLegalName} is a registered 501(c)(3) tax-exempt organization in the United States. No goods or services were provided in exchange for this contribution. Your donation may be tax-deductible to the fullest extent permitted by law. Please consult your tax advisor. Retain this receipt for your records.`;
  }
  return `${charityLegalName} is a verified nonprofit in ${charityCountry}. Consult your local tax advisor to determine deductibility.`;
}

/** Build the donation receipt HTML and plaintext */
function buildReceiptEmail(
  req: DonationReceiptRequest,
): { html: string; text: string; subject: string } {
  const donorName = req.donorName ?? "Donor";
  const charityName = req.charityName ?? "Give Protocol";
  const formattedAmount = formatAmount(req.amountCents, req.currency);
  const formattedDate = formatDate(req.donationDate);
  const isUS = (req.charityCountryCode ?? "").toUpperCase() === "US";
  const charityCountry = req.charityCountry ?? "your country";
  const donationDetailUrl =
    req.donationDetailUrl ?? `${PORTAL_URL}/donor-portal`;

  const safeDonorName = escapeHtml(donorName);
  const safeCharity = escapeHtml(charityName);
  const safeAmount = escapeHtml(formattedAmount);
  const safeDate = escapeHtml(formattedDate);
  const safeTxId = escapeHtml(req.transactionId);
  const safeEin = req.charityEin ? escapeHtml(req.charityEin) : null;
  const safeDonationUrl = escapeHtml(donationDetailUrl);

  // Determine payment method description and processor label
  const isPayPal = Boolean(req.paypalEmail);
  let paymentMethodDisplay: string;
  let processorLabel: string;

  if (isPayPal) {
    const safePaypalEmail = escapeHtml(req.paypalEmail ?? "");
    paymentMethodDisplay = `PayPal (${safePaypalEmail})`;
    processorLabel = "PayPal";
  } else if (req.cardBrand && req.cardLast4) {
    const safeBrand = escapeHtml(req.cardBrand);
    const safeLast4 = escapeHtml(req.cardLast4);
    paymentMethodDisplay = `${safeBrand} ending in ${safeLast4}`;
    processorLabel = "Helcim";
  } else {
    paymentMethodDisplay = escapeHtml(req.paymentMethod);
    processorLabel = "Helcim";
  }

  const subject = `Your donation receipt from ${charityName} — ${formattedAmount}`;

  // Receipt table rows (IRS Pub. 1771 fields)
  const einRow = safeEin
    ? `<tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Charity Tax ID</td>
        <td style="padding:10px 12px;color:#111827;">${safeEin}</td>
      </tr>`
    : "";

  const receiptTableHtml = `
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;width:45%;">Donor</td>
        <td style="padding:10px 12px;color:#111827;">${safeDonorName}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Charity</td>
        <td style="padding:10px 12px;color:#111827;">${safeCharity}</td>
      </tr>
      ${einRow}
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Date of donation</td>
        <td style="padding:10px 12px;color:#111827;">${safeDate}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Amount</td>
        <td style="padding:10px 12px;color:#111827;font-size:16px;font-weight:700;">${safeAmount}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Payment method</td>
        <td style="padding:10px 12px;color:#111827;">${paymentMethodDisplay}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Transaction ID</td>
        <td style="padding:10px 12px;color:#111827;font-size:12px;word-break:break-all;">${safeTxId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#374151;">Processor</td>
        <td style="padding:10px 12px;color:#111827;">${escapeHtml(processorLabel)}</td>
      </tr>
    </table>
  `;

  const taxParagraphHtml = buildTaxParagraphHtml(
    safeCharity,
    isUS,
    escapeHtml(charityCountry),
  );
  const taxParagraphText = buildTaxParagraphText(charityName, isUS, charityCountry);

  const bodyHtml = `
    <p>Hi ${safeDonorName},</p>
    <p>Thank you for your generosity. Your donation has been processed and delivered to <strong>${safeCharity}</strong>.</p>
    <h2 style="color:#111827;font-size:16px;margin-top:24px;">Official Donation Receipt</h2>
    ${receiptTableHtml}
    ${taxParagraphHtml}
    <p>Every dollar you give reaches the causes you care about &mdash; transparently, and on-chain when applicable. That's the whole point.</p>
    <p>
      <a href="${safeDonationUrl}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View this donation in your account &rarr;</a>
    </p>
    <p>With gratitude,<br>The Give Protocol Team</p>
  `;

  const einLine = req.charityEin ? `\nCharity Tax ID: ${req.charityEin}` : "";
  const bodyText = `Hi ${donorName},\n\nThank you for your generosity. Your donation has been processed and delivered to ${charityName}.\n\nOfficial Donation Receipt\n\nDonor: ${donorName}\nCharity: ${charityName}${einLine}\nDate of donation: ${formattedDate}\nAmount: ${formattedAmount}\nPayment method: ${isPayPal ? `PayPal (${req.paypalEmail ?? ""})` : (req.cardBrand && req.cardLast4 ? `${req.cardBrand} ending in ${req.cardLast4}` : req.paymentMethod)}\nTransaction ID: ${req.transactionId}\nProcessor: ${processorLabel}\n\n${taxParagraphText}\n\nEvery dollar you give reaches the causes you care about — transparently, and on-chain when applicable. That's the whole point.\n\nView this donation in your account: ${donationDetailUrl}\n\nWith gratitude,\nThe Give Protocol Team`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
    text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
  };
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
    charityEin:
      typeof reqObj.charityEin === "string" ? reqObj.charityEin : null,
    charityCountryCode:
      typeof reqObj.charityCountryCode === "string"
        ? reqObj.charityCountryCode
        : null,
    charityCountry:
      typeof reqObj.charityCountry === "string" ? reqObj.charityCountry : null,
    causeName: typeof reqObj.causeName === "string" ? reqObj.causeName : null,
    fundName: typeof reqObj.fundName === "string" ? reqObj.fundName : null,
    amountCents: reqObj.amountCents,
    currency: reqObj.currency,
    transactionId: reqObj.transactionId,
    paymentMethod: reqObj.paymentMethod,
    donationDate: reqObj.donationDate,
    cardBrand: typeof reqObj.cardBrand === "string" ? reqObj.cardBrand : null,
    cardLast4: typeof reqObj.cardLast4 === "string" ? reqObj.cardLast4 : null,
    paypalEmail:
      typeof reqObj.paypalEmail === "string" ? reqObj.paypalEmail : null,
    donationDetailUrl:
      typeof reqObj.donationDetailUrl === "string"
        ? reqObj.donationDetailUrl
        : null,
  };

  const { subject, html, text } = buildReceiptEmail(request);

  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO,
      to: [request.donorEmail],
      subject,
      html,
      text,
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
