import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

import { ENV } from "@/config/env";
import { Logger } from "@/utils/logger";
import { ethers } from "ethers";
import type { ChainType, UnifiedWalletProvider } from "@/types/wallet";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";

interface UserIdentity {
  id: string;
  user_id: string;
  wallet_address: string | null;
  primary_auth_method: "email" | "wallet" | "passkey";
  wallet_linked_at: string | null;
}

interface UnifiedUser {
  id: string;
  email: string | null;
  role: "donor" | "charity" | "volunteer" | "admin";
  walletAddress: string | null;
  authMethod: "email" | "wallet" | "passkey";
  displayName: string | null;
}

/** Current step in the wallet-based authentication flow. */
export type WalletAuthStep =
  | "connecting"
  | "signing"
  | "verifying"
  | "session"
  | null;

interface UnifiedAuthState {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  authMethod: "email" | "wallet" | "passkey" | null;
  email: string | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  isWalletLinked: boolean;
  isPasskeySupported: boolean;
  chainId: number | null;
  role: "donor" | "charity" | "volunteer" | "admin";
  loading: boolean;
  walletAuthStep: WalletAuthStep;
  error: string | null;

  signInWithEmail: (_email: string, _password: string) => Promise<void>;
  signUpWithEmail: (
    _email: string,
    _password: string,
    _metadata?: Record<string, unknown>,
  ) => Promise<void>;
  signInWithWallet: (
    _accountType?: "donor" | "charity",
    _walletInfo?: {
      wallet: UnifiedWalletProvider;
      chainType: ChainType;
      address: string;
    },
  ) => Promise<void>;
  signInWithPasskey: () => Promise<void>;
  registerPasskey: (_deviceName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  linkWallet: () => Promise<void>;
  unlinkWallet: () => Promise<void>;
  signOut: () => Promise<void>;
}

/** Generates a random nonce for wallet signature messages. */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Unified authentication hook that merges Supabase auth (Web2) and wallet
 * connection (Web3) into a single identity-aware interface.
 */
export function useUnifiedAuth(): UnifiedAuthState {
  const auth = useAuthContext();
  const web3 = useWeb3();
  const passkey = usePasskeyAuth();
  const { showToast } = useToast();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletAuthStep, setWalletAuthStep] = useState<WalletAuthStep>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user_identities record when the auth user changes
  useEffect(() => {
    if (!auth.user) {
      setIdentity(null);
      return undefined;
    }

    const currentUser = auth.user;
    let cancelled = false;

    /** Loads the user_identities record from Supabase for the current user. */
    const fetchIdentity = async () => {
      const { data, error: fetchError } = await supabase
        .from("user_identities")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (!cancelled) {
        if (fetchError) {
          // Identity record may not exist yet for existing users
          Logger.info("No user_identities record found", {
            userId: currentUser.id,
          });
        } else {
          setIdentity(data as UserIdentity);
        }
      }
    };

    fetchIdentity();
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  const isAuthenticated = Boolean(auth.user);
  const authMethod =
    identity?.primary_auth_method ?? (auth.user ? "email" : null);
  const isWalletLinked = Boolean(identity?.wallet_address);
  const resolvedRole = (auth.userType ?? "donor") as UnifiedAuthState["role"];

  const unifiedUser = useMemo<UnifiedUser | null>(() => {
    if (!auth.user) return null;
    return {
      id: auth.user.id,
      email: auth.user.email ?? null,
      role: resolvedRole,
      walletAddress: identity?.wallet_address ?? null,
      authMethod: authMethod as "email" | "wallet",
      displayName: (auth.user.user_metadata?.name as string) ?? null,
    };
  }, [auth.user, resolvedRole, identity?.wallet_address, authMethod]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);

        // Use AuthContext login without account type enforcement
        // Pass 'donor' as the accountType for backward compatibility
        // but the unified flow doesn't enforce the split
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sign in";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata: Record<string, unknown> = {},
    ) => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { type: "donor", ...metadata },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.user) {
          throw new Error("Failed to create account");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sign up";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signInWithWallet = useCallback(
    async (
      accountType: "donor" | "charity" = "donor",
      walletInfo?: {
        wallet: UnifiedWalletProvider;
        chainType: ChainType;
        address: string;
      },
    ) => {
      try {
        setLoading(true);
        setWalletAuthStep("connecting");
        setError(null);

        let address: string;
        let signature: string;
        let chainType: ChainType = "evm";
        const nonce = generateNonce();
        const message = `Sign in to Give Protocol.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

        if (walletInfo) {
          // Use the wallet provider passed by the caller to ensure the correct
          // extension is used (prevents Phantom from hijacking MetaMask via window.ethereum)
          address = walletInfo.address;
          chainType = walletInfo.chainType;

          setWalletAuthStep("signing");
          signature = await walletInfo.wallet.signMessage(message, chainType);
        } else {
          // Legacy fallback: no wallet info passed, use window.ethereum directly
          if (typeof window !== "undefined" && !("ethereum" in window)) {
            throw new Error(
              "No wallet detected. Please install a browser wallet extension such as MetaMask (https://metamask.io) to continue.",
            );
          }

          if (!web3.provider) {
            await web3.connect();
          }

          const provider =
            web3.provider ??
            (typeof window !== "undefined" && window.ethereum
              ? new ethers.BrowserProvider(window.ethereum)
              : null);
          if (!provider) {
            throw new Error("No wallet provider available");
          }

          setWalletAuthStep("signing");
          const signer = await (provider as ethers.BrowserProvider).getSigner();
          address = await signer.getAddress();
          signature = await signer.signMessage(message);
        }

        setWalletAuthStep("verifying");
        const fnResponse = await fetch(
          `${ENV.SUPABASE_URL}/functions/v1/wallet-auth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
              apikey: ENV.SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              walletAddress: address,
              signature,
              message,
              nonce,
              accountType,
              chainType,
            }),
          },
        );

        const data = await fnResponse.json();

        if (!fnResponse.ok || !data?.success) {
          Logger.error("[wallet-auth] Failed response", { data });
          throw new Error(data?.error ?? "Wallet authentication failed");
        }

        setWalletAuthStep("session");
        // Set the session from the edge function response
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Wallet sign-in failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
        setWalletAuthStep(null);
      }
    },
    [web3],
  );

  const linkWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auth.user) {
        throw new Error("You must be signed in to link a wallet");
      }

      if (!web3.isConnected) {
        await web3.connect();
      }

      const walletProvider = web3.provider;
      if (!walletProvider) {
        throw new Error("No wallet provider available");
      }
      const signer = await (
        walletProvider as ethers.BrowserProvider
      ).getSigner();
      const address = await signer.getAddress();
      const message = `Link wallet to Give Protocol account.\n\nAccount: ${auth.user.email ?? auth.user.id}\nTimestamp: ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${ENV.SUPABASE_URL}/functions/v1/link-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: ENV.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ walletAddress: address, signature, message }),
        },
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error ?? "Failed to link wallet");
      }

      // Refresh identity state
      setIdentity((prev) =>
        prev
          ? {
              ...prev,
              wallet_address: result.walletAddress,
              wallet_linked_at: result.linkedAt,
            }
          : null,
      );
      showToast({
        type: "success",
        title: "Wallet linked",
        message: "Your wallet has been linked to this account.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to link wallet";
      showToast({ type: "error", title: "Link failed", message });
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [auth.user, web3, showToast]);

  const unlinkWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auth.user) {
        throw new Error("You must be signed in to unlink a wallet");
      }

      const { error: updateError } = await supabase
        .from("user_identities")
        .update({
          wallet_address: null,
          wallet_linked_at: null,
        })
        .eq("user_id", auth.user.id);

      if (updateError) {
        throw updateError;
      }

      setIdentity((prev) =>
        prev
          ? {
              ...prev,
              wallet_address: null,
              wallet_linked_at: null,
            }
          : null,
      );
      showToast({
        type: "success",
        title: "Wallet unlinked",
        message: "Your wallet has been removed from this account.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlink wallet";
      showToast({ type: "error", title: "Unlink failed", message });
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [auth.user, showToast]);

  const signInWithPasskey = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await passkey.loginWithPasskey();
      // Session is set inside usePasskeyAuth via supabase.auth.setSession
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey sign-in failed";
      // Don't set error for user cancellation
      if (
        !message.includes("cancelled") &&
        !message.includes("AbortError") &&
        !message.includes("NotAllowedError")
      ) {
        setError(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [passkey]);

  const registerPasskey = useCallback(
    async (deviceName?: string) => {
      try {
        setLoading(true);
        setError(null);
        await passkey.registerPasskey(deviceName);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Passkey registration failed";
        if (
          !message.includes("cancelled") &&
          !message.includes("AbortError") &&
          !message.includes("NotAllowedError")
        ) {
          setError(message);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [passkey],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await auth.loginWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const signInWithApple = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Apple";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (web3.isConnected) {
        await web3.disconnect();
      }
      await supabase.auth.signOut();

      setIdentity(null);
      window.location.href = `${window.location.origin}/auth`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3]);

  return {
    user: unifiedUser,
    isAuthenticated,
    authMethod: authMethod as "email" | "wallet" | "passkey" | null,
    email: auth.user?.email ?? null,
    walletAddress: identity?.wallet_address ?? web3.address,
    isWalletConnected: web3.isConnected,
    isWalletLinked,
    isPasskeySupported: passkey.isSupported,
    chainId: web3.chainId,
    role: resolvedRole,
    loading: loading || auth.loading || passkey.loading,
    walletAuthStep,
    error: error ?? passkey.error,
    signInWithEmail,
    signUpWithEmail,
    signInWithWallet,
    signInWithPasskey,
    registerPasskey,
    signInWithGoogle,
    signInWithApple,
    linkWallet,
    unlinkWallet,
    signOut,
  };
}
