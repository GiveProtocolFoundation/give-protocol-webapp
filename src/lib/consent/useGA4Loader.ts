import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";

const GA4_MEASUREMENT_ID = "G-CBQHKLHD8T";

/**
 * Consent-gated GA4 library loader.
 *
 * Loads gtag.js from googletagmanager.com only when the visitor has made an
 * affirmative analytics consent decision (hasDecided && categories.analytics).
 *
 * The gtag consent default ("denied") is already set in index.html so a
 * transiently loaded script is harmless, but we avoid fetching the library
 * for visitors who have not yet decided or who have declined analytics.
 *
 * Safe to call multiple times — loads the script at most once per page load.
 */
export function useGA4Loader(): void {
  const { hasDecided, categories } = useConsent();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    if (!hasDecided || !categories.analytics) return;

    loaded.current = true;

    try {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
      s.onerror = () => {
        console.info(
          "GA4 blocked (ad-blocker or network issue) — analytics disabled",
        );
        loaded.current = false; // allow retry on next consent change if desired
      };
      s.onload = () => {
        window.gtag?.("js", new Date());
        window.gtag?.("config", GA4_MEASUREMENT_ID);
      };
      document.head.appendChild(s);
    } catch {
      // Silently ignore script injection failures
    }
  }, [hasDecided, categories.analytics]);
}
