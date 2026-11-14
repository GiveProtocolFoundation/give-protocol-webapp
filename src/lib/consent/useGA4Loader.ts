import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";
import { useDonationActive } from "./DonationActiveContext";

const GA4_MEASUREMENT_ID = "G-CBQHKLHD8T";

/**
 * Consent-gated GA4 library loader.
 *
 * Loads gtag.js from googletagmanager.com only when the visitor has made an
 * affirmative analytics consent decision (hasDecided && categories.analytics)
 * **and** no donation UI component is currently mounted (G3 in the
 * payment-page script inventory).
 *
 * The gtag consent default ("denied") is already set in index.html so a
 * transiently loaded script is harmless, but we avoid fetching the library
 * for visitors who have not yet decided or who have declined analytics.
 *
 * Safe to call multiple times — loads the script at most once per page load.
 */
export function useGA4Loader(): void {
  const { hasDecided, categories } = useConsent();
  const { isActive: donationActive } = useDonationActive();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    if (!hasDecided || !categories.analytics) return;
    // G3: do not load gtag.js while donation UI is mounted
    if (donationActive) return;

    loaded.current = true;

    try {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
      script.onerror = () => {
        console.info(
          "GA4 blocked (ad-blocker or network issue) — analytics disabled",
        );
        loaded.current = false; // allow retry on next consent change if desired
      };
      script.onload = () => {
        window.gtag?.("js", new Date());
        window.gtag?.("config", GA4_MEASUREMENT_ID);
      };
      document.head.appendChild(script);
    } catch {
      // Silently ignore script injection failures
    }
  }, [hasDecided, categories.analytics, donationActive]);
}
