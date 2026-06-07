import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  enableAnalyticsIntegrations,
  disableAnalyticsIntegrations,
} from "@/lib/sentry";

/**
 * Reacts to analytics consent changes and enables/disables Sentry
 * Phase B integrations (replay + perf tracing) accordingly.
 *
 * - On mount + consent true → enables analytics integrations.
 * - On consent transition true→false → disables + reloads.
 * - Idempotent: does not double-add integrations across renders.
 *
 * Must be mounted inside both ConsentProvider and AuthProvider.
 */
export function SentryConsentReactor(): null {
  const { categories } = useConsent();
  const { user, userType } = useAuth();
  const enabledRef = useRef(false);

  useEffect(() => {
    const wantsAnalytics = categories.analytics;

    if (wantsAnalytics && !enabledRef.current) {
      const sentryUser = user
        ? {
            id: user.id,
            email: user.email,
            type: userType ?? undefined,
          }
        : { id: "anonymous" };

      enableAnalyticsIntegrations(sentryUser);
      enabledRef.current = true;
    } else if (!wantsAnalytics && enabledRef.current) {
      enabledRef.current = false;
      disableAnalyticsIntegrations();
    }
  }, [categories.analytics, user, userType]);

  return null;
}
