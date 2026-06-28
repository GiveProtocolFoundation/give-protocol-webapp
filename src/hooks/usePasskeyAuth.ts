import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

interface PasskeyCredential {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
  transports: string[];
}

interface PasskeySession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  };
}

interface UsePasskeyAuthReturn {
  /** Whether the browser supports WebAuthn passkeys */
  isSupported: boolean;
  /** Whether conditional mediation (autofill-assisted passkey) is available */
  isConditionalSupported: boolean;
  /** Register a new passkey for the currently authenticated user */
  registerPasskey: (_deviceName?: string) => Promise<void>;
  /** Sign in using a registered passkey (no prior auth needed) */
  loginWithPasskey: () => Promise<
    | {
        session: PasskeySession;
        isNewUser: false;
      }
    | undefined
  >;
  /** List registered passkeys for the current user */
  listPasskeys: () => Promise<PasskeyCredential[]>;
  /** Remove a registered passkey */
  removePasskey: (_credentialId: string) => Promise<void>;
  /** Whether a passkey operation is in progress */
  loading: boolean;
  /** Last error message, if any */
  error: string | null;
}

/**
 * Checks whether the browser supports WebAuthn (window.PublicKeyCredential API).
 * @returns true if passkeys are available
 */
function checkPasskeySupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/**
 * Hook providing WebAuthn passkey registration and authentication.
 * Wraps the browser WebAuthn APIs and communicates with Supabase edge
 * functions for challenge generation and verification.
 *
 * @returns Passkey auth state and methods
 */
export function usePasskeyAuth(): UsePasskeyAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConditionalSupported, setIsConditionalSupported] = useState(false);

  const isSupported = useMemo(() => checkPasskeySupport(), []);

  // Check conditional mediation support on mount
  useEffect(() => {
    if (!isSupported) return;

    /** Detect WebAuthn conditional-mediation support on this user agent. */
    const checkConditional = async () => {
      try {
        if (
          typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
          "function"
        ) {
          const available =
            await window.PublicKeyCredential.isConditionalMediationAvailable();
          setIsConditionalSupported(available);
        }
      } catch {
        // Conditional mediation not supported
      }
    };

    checkConditional();
  }, [isSupported]);

  const registerPasskey = useCallback(
    async (deviceName?: string) => {
      if (!isSupported) {
        throw new Error("Passkeys are not supported in this browser");
      }

      setLoading(true);
      setError(null);

      try {
        // Lazy-load @simplewebauthn/browser to keep bundle size small
        const { startRegistration } = await import("@simplewebauthn/browser");

        // Step 1: Get registration options from server
        const { data: optionsData, error: optionsError } =
          await supabase.functions.invoke("passkey-register-options", {
            body: { deviceName },
          });

        if (optionsError || !optionsData?.success) {
          throw new Error(
            optionsData?.error ??
              optionsError?.message ??
              "Failed to get registration options",
          );
        }

        // Step 2: Start WebAuthn registration ceremony (browser prompts user)
        const registrationResponse = await startRegistration({
          optionsJSON: optionsData.options,
        });

        // Step 3: Send response to server for verification
        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("passkey-register-verify", {
            body: { response: registrationResponse },
          });

        if (verifyError || !verifyData?.success) {
          throw new Error(
            verifyData?.error ??
              verifyError?.message ??
              "Passkey registration failed",
          );
        }

        Logger.info("Passkey registered successfully", {
          credentialId: verifyData.credentialId,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Passkey registration failed";

        // Handle user cancellation gracefully
        if (
          message.includes("cancelled") ||
          message.includes("AbortError") ||
          message.includes("NotAllowedError")
        ) {
          Logger.info("Passkey registration cancelled by user");
          setError(null);
          return;
        }

        Logger.error("Passkey registration error:", err);
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isSupported],
  );

  const loginWithPasskey = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Passkeys are not supported in this browser");
    }

    setLoading(true);
    setError(null);

    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      // Step 1: Get authentication options from server
      const { data: optionsData, error: optionsError } =
        await supabase.functions.invoke("passkey-login-options", {
          body: {},
        });

      if (optionsError || !optionsData?.success) {
        throw new Error(
          optionsData?.error ??
            optionsError?.message ??
            "Failed to get login options",
        );
      }

      // Step 2: Start WebAuthn authentication ceremony (browser prompts user)
      const authenticationResponse = await startAuthentication({
        optionsJSON: optionsData.options,
      });

      // Step 3: Send response to server for verification
      const { data: verifyData, error: verifyError } =
        await supabase.functions.invoke("passkey-login-verify", {
          body: { response: authenticationResponse },
        });

      if (verifyError || !verifyData?.success) {
        throw new Error(
          verifyData?.error ??
            verifyError?.message ??
            "Passkey authentication failed",
        );
      }

      // Step 4: Set the session in the Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
      });

      if (sessionError) {
        throw new Error(`Failed to establish session: ${sessionError.message}`);
      }

      Logger.info("Passkey login successful");

      return {
        session: verifyData.session as PasskeySession,
        isNewUser: false as const,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey login failed";

      if (
        message.includes("cancelled") ||
        message.includes("AbortError") ||
        message.includes("NotAllowedError")
      ) {
        Logger.info("Passkey login cancelled by user");
        setError(null);
        return undefined;
      }

      Logger.error("Passkey login error:", err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const listPasskeys = useCallback(async (): Promise<PasskeyCredential[]> => {
    const { data, error: queryError } = await supabase
      .from("user_passkeys")
      .select(
        "id, credential_id, device_name, created_at, last_used_at, transports",
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      Logger.error("Failed to list passkeys:", queryError);
      throw new Error("Failed to load passkeys");
    }

    return (data ?? []) as PasskeyCredential[];
  }, []);

  const removePasskey = useCallback(async (credentialId: string) => {
    const { error: deleteError } = await supabase
      .from("user_passkeys")
      .delete()
      .eq("credential_id", credentialId);

    if (deleteError) {
      Logger.error("Failed to remove passkey:", deleteError);
      throw new Error("Failed to remove passkey");
    }

    Logger.info("Passkey removed", { credentialId });
  }, []);

  return useMemo(
    () => ({
      isSupported,
      isConditionalSupported,
      registerPasskey,
      loginWithPasskey,
      listPasskeys,
      removePasskey,
      loading,
      error,
    }),
    [
      isSupported,
      isConditionalSupported,
      registerPasskey,
      loginWithPasskey,
      listPasskeys,
      removePasskey,
      loading,
      error,
    ],
  );
}
