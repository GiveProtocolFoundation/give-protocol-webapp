/**
 * Helcim payment service client
 * @module helcimService
 * @description Client-side service for interacting with Helcim through Supabase edge functions
 * and the HelcimPay.js iframe checkout.
 */

import { Logger } from "@/utils/logger";
import { ENV } from "@/config/env";
import type {
  FiatPaymentData,
  HelcimPaymentResult,
  DonationFrequency,
} from "@/components/web3/donation/types/donation";

/** Base URL for Supabase edge functions */
const SUPABASE_URL = ENV.SUPABASE_URL;

/** Supabase anon key for edge function authorization */
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

/** Trusted origin for HelcimPay.js postMessage events (S2819) */
const HELCIM_ORIGIN = "https://secure.helcim.app";

/** Common headers for Supabase edge function requests */
const getHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
});

/** Response from the helcim-pay initialization endpoint */
interface HelcimPayInitResponse {
  success: boolean;
  checkoutToken?: string;
  secretToken?: string;
  error?: string;
}

/** Payment response from the edge function */
interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  approvalCode?: string;
  cardType?: string;
  cardLastFour?: string;
  error?: string;
}

/** Subscription response from the edge function */
interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  customerId?: string;
  status?: string;
  nextBillingDate?: string;
  error?: string;
}

/**
 * Process a one-time card payment through Helcim
 * @param data - Payment data including checkout token
 * @returns Payment result with transaction details
 * @throws Error if payment fails
 */
export async function processPayment(
  data: FiatPaymentData,
): Promise<HelcimPaymentResult> {
  Logger.info("Processing fiat payment", {
    charityId: data.charityId,
    amount: data.amount,
    coverFees: data.coverFees,
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/helcim-payment`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      checkoutToken: data.checkoutToken,
      amount: Math.round(data.amount * 100), // Convert to cents
      charityId: data.charityId,
      charityName: data.charityName,
      donorName: data.name,
      donorEmail: data.email,
      coverFees: data.coverFees,
    }),
  });

  const result: PaymentResponse = await response.json();

  if (!response.ok || !result.success) {
    Logger.error("Fiat payment failed", {
      status: response.status,
      error: result.error,
    });
    throw new Error(result.error || "Payment processing failed");
  }

  Logger.info("Fiat payment successful", {
    transactionId: result.transactionId,
  });

  return {
    transactionId: result.transactionId || "",
    approvalCode: result.approvalCode || "",
    amountCents: Math.round(data.amount * 100),
    cardType: result.cardType,
    cardLastFour: result.cardLastFour,
  };
}

/**
 * Create a monthly subscription through Helcim
 * @param data - Payment data including checkout token
 * @returns Subscription result with subscription ID
 * @throws Error if subscription creation fails
 */
export async function createSubscription(data: FiatPaymentData): Promise<{
  subscriptionId: string;
  customerId: string;
  nextBillingDate: string;
}> {
  Logger.info("Creating fiat subscription", {
    charityId: data.charityId,
    amount: data.amount,
    coverFees: data.coverFees,
  });

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/helcim-subscription`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        checkoutToken: data.checkoutToken,
        amount: Math.round(data.amount * 100), // Convert to cents
        charityId: data.charityId,
        charityName: data.charityName,
        donorName: data.name,
        donorEmail: data.email,
        coverFees: data.coverFees,
      }),
    },
  );

  const result: SubscriptionResponse = await response.json();

  if (!response.ok || !result.success) {
    Logger.error("Fiat subscription failed", {
      status: response.status,
      error: result.error,
    });
    throw new Error(result.error || "Subscription creation failed");
  }

  Logger.info("Fiat subscription created", {
    subscriptionId: result.subscriptionId,
  });

  return {
    subscriptionId: result.subscriptionId || "",
    customerId: result.customerId || "",
    nextBillingDate: result.nextBillingDate || "",
  };
}

/** Donation context for checkout initialization */
export interface CheckoutContext {
  /** Giving type: direct charity, CEF, or CIF */
  givingType?: "direct" | "cef" | "cif";
  /** Charity profile ID */
  charityId?: string;
  /** Cause ID (if donating to a specific cause) */
  causeId?: string;
  /** Fund ID (if donating to a CEF/CIF) */
  fundId?: string;
}

/**
 * Fetch a checkout token from the Helcim Pay initialization endpoint
 * @param amount - Payment amount in dollars
 * @param frequency - Donation frequency (once or monthly)
 * @param context - Optional donation context for receipt fields
 * @returns Checkout token and secret token for HelcimPay.js
 * @throws Error if token fetch fails
 */
export async function fetchHelcimCheckoutToken(
  amount: number,
  frequency: DonationFrequency,
  context?: CheckoutContext,
): Promise<{ checkoutToken: string; secretToken: string }> {
  Logger.info("Fetching Helcim checkout token", { amount, frequency });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/helcim-pay`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      amount,
      currency: "USD",
      donationType: frequency === "monthly" ? "subscription" : "one-time",
      givingType: context?.givingType,
      charityId: context?.charityId,
      causeId: context?.causeId,
      fundId: context?.fundId,
    }),
  });

  const result: HelcimPayInitResponse = await response.json();

  if (!response.ok || !result.success) {
    const errorMessage = result.error || "Failed to initialize payment form";
    Logger.error("Failed to fetch checkout token", {
      status: response.status,
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }

  if (!result.checkoutToken) {
    throw new Error("No checkout token received");
  }

  Logger.info("Checkout token received");

  return {
    checkoutToken: result.checkoutToken,
    secretToken: result.secretToken || "",
  };
}

// ---------------------------------------------------------------------------
// HelcimPay.js iframe checkout (start.js globals)
// ---------------------------------------------------------------------------

/**
 * Global functions injected by HelcimPay.js start.js script.
 * These are bare function declarations that become window properties.
 */
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    appendHelcimPayIframe?: (
      _token: string,
      _showExitButton?: boolean,
      _phone?: string,
      _email?: string,
      _csrf?: string,
    ) => HTMLIFrameElement | undefined;
    removeHelcimPayIframe?: () => void;
  }
}

/** Transaction data returned inside the HelcimPay.js iframe message */
export interface HelcimTransactionData {
  transactionId?: string;
  amount?: string;
  approvalCode?: string;
  avsResponse?: string;
  cardHolderName?: string;
  cardNumber?: string;
  cardToken?: string;
  currency?: string;
  customerCode?: string;
  dateCreated?: string;
  status?: string;
  type?: string;
}

/**
 * Check whether the HelcimPay.js global function is available
 * @returns true if appendHelcimPayIframe is defined
 */
function isHelcimReady(): boolean {
  return typeof window.appendHelcimPayIframe === "function";
}

/**
 * Poll for `appendHelcimPayIframe` after the script's `onload` fires.
 * @returns Promise that resolves when the global is available
 */
function waitForHelcimGlobal(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isHelcimReady()) {
      resolve();
      return;
    }

    const pollInterval = 200; // ms
    const maxWait = 5000; // 5s
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += pollInterval;
      if (isHelcimReady()) {
        clearInterval(timer);
        Logger.info(`HelcimPay.js ready after ${elapsed}ms`);
        resolve();
      } else if (elapsed >= maxWait) {
        clearInterval(timer);
        reject(
          new Error(
            `HelcimPay.js not ready after ${maxWait}ms. ` +
              "Check CSP script-src includes https://secure.helcim.app",
          ),
        );
      }
    }, pollInterval);
  });
}

/** Track script loading state to prevent double-loading */
let helcimScriptPromise: Promise<void> | null = null;

/**
 * Load HelcimPay.js script dynamically.
 * Resolves once `appendHelcimPayIframe` is available on window.
 * @returns Promise that resolves when script is loaded and ready
 */
export function loadHelcimScript(): Promise<void> {
  if (helcimScriptPromise) {
    return helcimScriptPromise;
  }

  if (isHelcimReady()) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector(
    'script[src*="helcim-pay"]',
  ) as HTMLScriptElement | null;

  if (existingScript) {
    helcimScriptPromise = new Promise((resolve, reject) => {
      if (isHelcimReady()) {
        resolve();
        return;
      }

      /** Handles the script load event and waits for the HelcimPay.js global to become available. */
      const handleLoad = (): void => {
        Logger.info(
          "HelcimPay.js script loaded (existing), waiting for global",
        );
        waitForHelcimGlobal()
          .then(() => {
            resolve();
          })
          .catch((err) => {
            helcimScriptPromise = null;
            reject(err);
          });
      };

      /** Handles the script error event when the HelcimPay.js script fails to load. */
      const handleError = (): void => {
        helcimScriptPromise = null;
        reject(new Error("Failed to load payment processor"));
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
    });

    return helcimScriptPromise;
  }

  helcimScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://secure.helcim.app/helcim-pay/services/start.js";
    // SRI hash — regenerate if Helcim updates start.js:
    //   curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
    script.integrity =
      "sha384-8wWGKUkdq5wTIHBBb2inwu8SO3TFDWqLBUSLTwpmjyPzWv9GklIAv8SE3WP3z0Vy";
    script.crossOrigin = "anonymous";
    script.defer = true;
    script.async = false;

    script.onload = () => {
      Logger.info("HelcimPay.js script loaded, waiting for global");
      waitForHelcimGlobal()
        .then(() => {
          Logger.info("HelcimPay.js ready");
          resolve();
        })
        .catch((err) => {
          helcimScriptPromise = null;
          reject(err);
        });
    };

    script.onerror = () => {
      Logger.error("Failed to load HelcimPay.js script");
      helcimScriptPromise = null;
      reject(new Error("Failed to load payment processor"));
    };

    document.head.appendChild(script);
  });

  return helcimScriptPromise;
}

/**
 * Reset the module-level script promise so a fresh load can be attempted.
 * Used by the retry mechanism in useFiatDonation.
 */
export function resetHelcimScriptState(): void {
  helcimScriptPromise = null;
}

/** Result from the HelcimPay.js iframe checkout */
export interface HelcimCheckoutResult {
  /** Transaction data from eventMessage.data */
  data: HelcimTransactionData;
  /** SHA-256 hash from eventMessage for server-side validation */
  hash: string;
}

/**
 * Remove the HelcimPay.js iframe from the DOM.
 * Called after the checkout promise settles to prevent the iframe
 * from covering the success/error screen.
 */
function cleanupHelcimIframe(): void {
  try {
    window.removeHelcimPayIframe?.();
  } catch (err) {
    Logger.warn("Failed to remove HelcimPay.js iframe", { error: err });
  }
}

/**
 * Open the HelcimPay.js iframe checkout and wait for the payment result.
 *
 * The iframe handles all card input and payment processing. Results are
 * communicated back via `window.postMessage` with:
 *   - `eventName`: `'helcim-pay-js-' + checkoutToken`
 *   - `eventStatus`: `'SUCCESS'` | `'ABORTED'` | `'HIDE'`
 *   - `eventMessage.data`: transaction details on SUCCESS
 *   - `eventMessage.hash`: SHA-256 hash for server-side validation
 *
 * @param checkoutToken - Token from fetchHelcimCheckoutToken
 * @param email - Pre-fill email in the checkout iframe
 * @returns Checkout result with transaction data and validation hash
 * @throws Error if user cancels, payment is aborted, or script not loaded
 */
export function openHelcimCheckout(
  checkoutToken: string,
  email?: string,
): Promise<HelcimCheckoutResult> {
  if (!isHelcimReady()) {
    return Promise.reject(new Error("HelcimPay.js not loaded"));
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const expectedEvent = `helcim-pay-js-${checkoutToken}`;

    /** Handles incoming postMessage events from the HelcimPay.js iframe. */
    const handleMessage = (event: MessageEvent): void => {
      // Validate message origin to prevent spoofed messages (S2819)
      if (event.origin !== HELCIM_ORIGIN) {
        return;
      }

      const msg = event.data;

      // Only handle HelcimPay.js messages for this checkout
      if (msg?.eventName !== expectedEvent) {
        return;
      }

      if (settled) return;

      if (msg.eventStatus === "SUCCESS") {
        settled = true;
        window.removeEventListener("message", handleMessage);
        cleanupHelcimIframe();
        const txData: HelcimTransactionData = msg.eventMessage?.data || {};
        const hash: string = msg.eventMessage?.hash || "";
        Logger.info("HelcimPay.js payment succeeded", {
          transactionId: txData.transactionId,
        });
        resolve({ data: txData, hash });
        return;
      }

      if (msg.eventStatus === "ABORTED") {
        settled = true;
        window.removeEventListener("message", handleMessage);
        cleanupHelcimIframe();
        const reason = msg.eventMessage || "Transaction aborted";
        Logger.error("HelcimPay.js payment aborted", { reason });
        reject(
          new Error(
            typeof reason === "string" ? reason : "Payment was declined",
          ),
        );
        return;
      }

      if (msg.eventStatus === "HIDE") {
        settled = true;
        window.removeEventListener("message", handleMessage);
        cleanupHelcimIframe();
        Logger.info("HelcimPay.js modal closed");
        reject(new Error("Payment cancelled"));
      }
    };

    window.addEventListener("message", handleMessage);

    // Open the HelcimPay.js iframe
    const appendFn = window.appendHelcimPayIframe;
    if (!appendFn) {
      reject(new Error("HelcimPay.js not loaded"));
      return;
    }
    appendFn(checkoutToken, true, "", email || "");
    Logger.info("HelcimPay.js checkout iframe opened");
  });
}

// ---------------------------------------------------------------------------
// Server-side validation
// ---------------------------------------------------------------------------

/** Request body for the helcim-validate edge function */
export interface ValidatePaymentRequest {
  checkoutToken: string;
  transactionData: HelcimTransactionData;
  hash: string;
  charityId: string;
  charityName: string;
  donorName: string;
  donorEmail: string;
  coverFees: boolean;
  donorId: string;
  donorAddress?: string;
  /** Art. 9(2)(a) explicit consent metadata (GIV-655) */
  art9Consent?: { version: string; locale: string };
}

/** Response from the helcim-validate edge function */
interface ValidatePaymentResponse {
  success: boolean;
  transactionId?: string;
  approvalCode?: string;
  cardLastFour?: string;
  donationType?: string;
  error?: string;
}

/**
 * Validate a HelcimPay.js payment server-side and persist the donation.
 *
 * Calls the `helcim-validate` edge function which:
 *   1. Verifies the SHA-256 hash using the stored secretToken
 *   2. Marks the checkout session as validated (prevents replay)
 *   3. Persists the donation to the `fiat_donations` table
 *   4. Triggers attestation (fire-and-forget)
 *
 * @param data - Validation request with transaction data and donor metadata
 * @returns Validated payment details
 * @throws Error if validation fails
 */
export async function validateHelcimPayment(
  data: ValidatePaymentRequest,
): Promise<ValidatePaymentResponse> {
  Logger.info("Validating Helcim payment server-side", {
    checkoutToken: data.checkoutToken,
    transactionId: data.transactionData.transactionId,
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/helcim-validate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  const result: ValidatePaymentResponse = await response.json();

  if (!response.ok || !result.success) {
    Logger.error("Payment validation failed", {
      status: response.status,
      error: result.error,
    });
    throw new Error(result.error || "Payment validation failed");
  }

  Logger.info("Payment validated and recorded", {
    transactionId: result.transactionId,
  });

  return result;
}
