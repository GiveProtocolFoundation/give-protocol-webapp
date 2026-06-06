import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";

const GA4_ID = "G-CBQHKLHD8T";
const GA4_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;

/**
 * Dynamically loads the GA4 gtag.js library only after the visitor has
 * accepted analytics consent. No-decision visitors never fetch the script.
 *
 * The `gtag("consent","default",…)` block in index.html keeps the denied
 * state active so even a transiently-loaded script is harmless, but this
 * hook ensures no-consent visitors don't incur the network request at all.
 *
 * @returns void — renders nothing; call from a top-level layout component.
 */
export function useGA4Loader(): void {
  const { hasDecided, categories } = useConsent();
  const injected = useRef(false);

  useEffect(() => {
    if (!hasDecided || !categories.analytics) return;
    if (injected.current) return;

    injected.current = true;

    try {
      const script = document.createElement("script");
      script.async = true;
      script.src = GA4_SRC;
      script.onerror = () => {
        console.info(
          "GTM blocked (ad-blocker or network issue) — analytics disabled",
        );
      };
      document.head.appendChild(script);

      // Configure GA4 once the library loads
      if (typeof window.gtag === "function") {
        window.gtag("js", new Date());
        window.gtag("config", GA4_ID);
      }
    } catch {
      // Silently ignore GTM load failures
    }
  }, [hasDecided, categories.analytics]);
}
