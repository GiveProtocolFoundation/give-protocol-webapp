import { useState, useCallback, useEffect, useRef } from 'react';
import {
  loadHelcimScript,
  resetHelcimScriptState,
  fetchHelcimCheckoutToken,
  openHelcimCheckout,
  validateHelcimPayment,
} from '@/services/helcimService';
import { Logger } from '@/utils/logger';
import type {
  HelcimPaymentResult,
  DonationFrequency,
} from '@/components/web3/donation/types/donation';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

/**
 * Calculates retry delay with exponential backoff
 */
function calculateRetryDelay(retryCount: number): number {
  return RETRY_DELAY * Math.pow(2, retryCount);
}

/** Input for processFiatPayment (no checkoutToken — that's fetched internally) */
export interface FiatPaymentInput {
  name: string;
  email: string;
  amount: number;
  coverFees: boolean;
  charityId: string;
  charityName: string;
  frequency: DonationFrequency;
  /** Authenticated user's profile ID (enables server-side validation & donation recording) */
  donorId?: string;
  /** Connected wallet address (associates fiat donation with on-chain identity) */
  donorAddress?: string;
  /** Giving type: direct charity, CEF, or CIF */
  givingType?: 'direct' | 'cef' | 'cif';
  /** Cause ID (if donating to a specific cause) */
  causeId?: string;
  /** Fund ID (if donating to a CEF/CIF) */
  fundId?: string;
  /** Art. 9(2)(a) explicit consent metadata (GIV-655) */
  art9Consent?: { version: string; locale: string };
}

/** Return type for the useFiatDonation hook */
export interface UseFiatDonationReturn {
  /** Process a payment: fetches token, opens HelcimPay.js iframe, returns result */
  processFiatPayment: (_data: FiatPaymentInput) => Promise<HelcimPaymentResult>;
  /** Whether a payment is being processed */
  loading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
  /** Whether the HelcimPay.js script is loaded and ready */
  scriptReady: boolean;
  /** Retry script loading from scratch */
  retryInitialization: () => void;
  /** Current retry attempt number (0 = first attempt) */
  retryCount: number;
}

/**
 * Hook for processing fiat donations through HelcimPay.js
 * @function useFiatDonation
 * @description Manages loading the HelcimPay.js script and processing payments
 * via the Helcim iframe checkout. Card details are entered inside the secure
 * Helcim-hosted iframe — no card data touches this application.
 * @returns {UseFiatDonationReturn} Fiat donation utilities and state
 */
export function useFiatDonation(): UseFiatDonationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptScriptLoad = useCallback((attempt: number): void => {
    loadHelcimScript()
      .then(() => {
        if (mountedRef.current) {
          setScriptReady(true);
          setError(null);
          Logger.info('HelcimPay.js ready');
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        const message = err instanceof Error ? err.message : 'Failed to load payment processor';

        if (attempt < MAX_RETRIES) {
          const delay = calculateRetryDelay(attempt);
          Logger.info(
            `Retrying HelcimPay.js load in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          setRetryCount(attempt + 1);
          resetHelcimScriptState();
          retryTimeoutRef.current = setTimeout(() => {
            attemptScriptLoad(attempt + 1);
          }, delay);
        } else {
          setError(message);
          Logger.error('Failed to load HelcimPay.js after all retries', { error: err });
        }
      });
  }, []);

  // Load HelcimPay.js script on mount with retry
  useEffect(() => {
    mountedRef.current = true;
    attemptScriptLoad(0);

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [attemptScriptLoad]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processFiatPayment = useCallback(
    async (data: FiatPaymentInput): Promise<HelcimPaymentResult> => {
      if (!scriptReady) {
        throw new Error('Payment processor not loaded');
      }

      setLoading(true);
      setError(null);

      try {
        // Step 1: Fetch a checkout token from the backend
        Logger.info('Fetching checkout token', { amount: data.amount, frequency: data.frequency });
        const { checkoutToken } = await fetchHelcimCheckoutToken(data.amount, data.frequency, {
          givingType: data.givingType,
          charityId: data.charityId,
          causeId: data.causeId,
          fundId: data.fundId,
        });

        // Step 2: Open the HelcimPay.js iframe checkout
        // The iframe handles card input, validation, and payment processing
        const { data: txData, hash } = await openHelcimCheckout(checkoutToken, data.email);

        // Step 3: Build the result from the iframe transaction data
        const amountCents = txData.amount
          ? Math.round(Number(txData.amount) * 100)
          : Math.round(data.amount * 100);

        // Extract last four from masked card number (e.g. "4000000028")
        const cardNumber = txData.cardNumber || '';
        const cardLastFour = cardNumber.length >= 4
          ? cardNumber.slice(-4)
          : undefined;

        // Step 4: Validate payment server-side and persist donation
        // Non-blocking: the payment was already processed by Helcim,
        // so validation failure should not prevent the user from seeing success
        if (data.donorId) {
          try {
            await validateHelcimPayment({
              checkoutToken,
              transactionData: txData,
              hash,
              charityId: data.charityId,
              charityName: data.charityName,
              donorName: data.name,
              donorEmail: data.email,
              coverFees: data.coverFees,
              donorId: data.donorId,
              donorAddress: data.donorAddress,
              art9Consent: data.art9Consent,
            });
          } catch (validationErr) {
            Logger.error('Server-side payment validation failed (non-blocking)', {
              error: validationErr,
              transactionId: txData.transactionId,
            });
          }
        } else {
          Logger.warn('Skipping server-side validation: no donorId (guest checkout)', {
            transactionId: txData.transactionId,
          });
        }

        return {
          transactionId: txData.transactionId || '',
          approvalCode: txData.approvalCode || '',
          amountCents,
          cardLastFour,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment processing failed';
        setError(message);
        Logger.error('Fiat payment error', { error: err });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [scriptReady]
  );

  const retryInitialization = useCallback(() => {
    setError(null);
    setScriptReady(false);
    setRetryCount(0);
    resetHelcimScriptState();

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    attemptScriptLoad(0);
  }, [attemptScriptLoad]);

  return {
    processFiatPayment,
    loading,
    error,
    clearError,
    scriptReady,
    retryInitialization,
    retryCount,
  };
}
