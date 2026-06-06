import { useEffect } from "react";
import { useConsent } from "./ConsentProvider";

/**
 * Syncs the ConsentProvider analytics decision into GA4's consent state.
 *
 * On mount, replays any stored consent decision into `gtag("consent","update",…)`
 * so a returning visitor's stored preference is applied before the 500 ms
 * `wait_for_update` timer from the denied-by-default block expires.
 *
 * Also fires whenever the consent record changes (accept / decline / reset).
 *
 * Null-safe: environments without `window.gtag` (SSR, Jest) are silently
 * skipped — no throw.
 *
 * @returns void — renders nothing; call from a top-level layout component.
 */
export function useGAConsentBridge(): void {
  const { categories, hasDecided } = useConsent();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;

    const storage = categories.analytics ? "granted" : "denied";

    window.gtag("consent", "update", {
      analytics_storage: storage,
    });
  }, [categories.analytics, hasDecided]);
}
