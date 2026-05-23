/**
 * useSafeAutoConnect - Auto-connect to Safe wallet when in Safe App context
 * Detects Safe iframe environment and automatically initiates connection
 */

import { useEffect, useRef, startTransition } from "react";
import { Logger } from "@/utils/logger";
import { useMultiChainContext } from "@/contexts/MultiChainContext";
import { createSafeProvider, isInSafeAppContext } from "@/lib/wallets";

/**
 * Handles the Safe wallet connection promise result with logging
 * Extracted to avoid exceeding max function nesting depth (S2004)
 */
function handleConnectResult(promise: Promise<void>): void {
  promise
    .then(() => Logger.info("Successfully auto-connected to Safe"))
    .catch((err: unknown) =>
      Logger.error("Failed to auto-connect to Safe", { error: err }),
    );
}

/**
 * Hook that automatically connects to Safe wallet when running in Safe App iframe
 * Should be used at the app root level
 */
export function useSafeAutoConnect() {
  const { connect, isConnected, isConnecting } = useMultiChainContext();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt once
    if (hasAttemptedRef.current) {
      return;
    }

    // Skip if already connected or connecting
    if (isConnected || isConnecting) {
      return;
    }

    // Check if we're in Safe App context
    if (!isInSafeAppContext()) {
      return;
    }

    hasAttemptedRef.current = true;

    /** Attempts to auto-connect using the Gnosis Safe provider if available. */
    const autoConnect = () => {
      try {
        Logger.info("Safe App context detected, auto-connecting...");

        const safeProvider = createSafeProvider();
        if (!safeProvider) {
          Logger.warn(
            "Could not create Safe provider despite being in Safe context",
          );
          return;
        }

        // Wrap in startTransition so the connection state updates
        // don't interrupt Suspense hydration
        startTransition(() => {
          handleConnectResult(connect(safeProvider, "evm"));
        });
      } catch (error) {
        Logger.error("Failed to auto-connect to Safe", { error });
      }
    };

    autoConnect();
  }, [connect, isConnected, isConnecting]);
}

export default useSafeAutoConnect;
