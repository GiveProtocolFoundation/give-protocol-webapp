import { useEffect } from "react";
import { useDonationActive } from "./DonationActiveContext";
import { pauseSentryReplay, resumeSentryReplay } from "@/lib/sentry";

/**
 * Pauses Sentry session replay whenever a donation UI component is mounted,
 * and resumes it when all donation components unmount. This prevents recording
 * payment-related DOM content even when text masking is enabled (G7 in the
 * payment-page script inventory).
 *
 * Should be rendered once in the app tree, inside DonationActiveProvider.
 */
export function useSentryReplayGuard(): void {
  const { isActive } = useDonationActive();

  useEffect(() => {
    if (isActive) {
      pauseSentryReplay();
    } else {
      resumeSentryReplay();
    }
  }, [isActive]);
}
