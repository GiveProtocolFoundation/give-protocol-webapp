import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { CharityWallet } from "@/types/charityWallet";
import { Logger } from "@/utils/logger";

/** Parameters for adding an EOA or Safe wallet via the verify-wallet-control edge function. */
interface VerifiedWalletParams {
  charity_profile_id: string;
  wallet_address: string;
  chain_id: number;
  wallet_type: "eoa" | "safe";
  signature: string;
  message: string;
  signer_count?: number;
  signer_threshold?: number;
}

/** Parameters for adding an institutional wallet via direct insert + file upload. */
interface InstitutionalWalletParams {
  charity_profile_id: string;
  wallet_address: string;
  chain_id: number;
  custodian_name: string;
  attestation_file: File;
}

/** Successful response from the verify-wallet-control edge function. */
interface VerifyWalletResponse {
  success: boolean;
  wallet: CharityWallet;
}

/** Maps edge function error codes to user-friendly messages. */
const EDGE_FUNCTION_ERRORS: Record<string, string> = {
  INVALID_SIGNATURE: "Wallet signature verification failed. Please sign again.",
  DUPLICATE_WALLET: "This wallet is already registered for your charity.",
  CHARITY_NOT_FOUND: "Charity profile not found.",
  NOT_OWNER: "You do not have permission to manage this charity's wallets.",
  SAFE_CONFIG_MISMATCH:
    "On-chain Safe configuration does not match submitted values.",
  RATE_LIMITED: "Primary wallet was changed recently. Please wait 24 hours.",
};

/**
 * Parses an error from the edge function or Supabase into a user-friendly message.
 * @param error - The error object from supabase.functions.invoke or table query
 * @returns A user-facing error string
 */
function parseError(error: { message?: string; code?: string } | null): string {
  if (!error) return "An unknown error occurred.";
  if (error.code && EDGE_FUNCTION_ERRORS[error.code]) {
    return EDGE_FUNCTION_ERRORS[error.code];
  }
  return error.message ?? "An unknown error occurred.";
}

/**
 * Hook for CRUD operations on the charity_wallets table with
 * verify-wallet-control Edge Function integration.
 * @returns Wallet CRUD operations and loading/error state
 */
export const useCharityWallets = () => {
  const [wallets, setWallets] = useState<CharityWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all wallets for a charity (owner view).
   * @param charityProfileId - The charity profile UUID
   * @returns Array of CharityWallet records
   */
  const fetchWallets = useCallback(async (charityProfileId: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("charity_wallets")
        .select("*")
        .eq("charity_profile_id", charityProfileId)
        .order("is_primary", { ascending: false });

      if (fetchError) throw fetchError;
      const rows = (data ?? []) as CharityWallet[];
      setWallets(rows);
      return rows;
    } catch (err) {
      const msg = "Failed to load wallets.";
      setError(msg);
      Logger.error("useCharityWallets.fetchWallets", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches only the primary wallet for a charity+chain (public view).
   * @param charityProfileId - The charity profile UUID
   * @param chainId - EVM chain ID
   * @returns The primary CharityWallet or null
   */
  const fetchPrimaryWallet = useCallback(
    async (
      charityProfileId: string,
      chainId: number,
    ): Promise<CharityWallet | null> => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from("charity_wallets")
          .select("*")
          .eq("charity_profile_id", charityProfileId)
          .eq("chain_id", chainId)
          .eq("is_primary", true)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") return null;
          throw fetchError;
        }
        return (data as CharityWallet) ?? null;
      } catch (err) {
        const msg = "Failed to load primary wallet.";
        setError(msg);
        Logger.error("useCharityWallets.fetchPrimaryWallet", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Adds an EOA or Safe wallet by calling the verify-wallet-control edge function.
   * @param params - Wallet address, signature, chain, and type details
   * @returns The created CharityWallet or null on failure
   */
  const addVerifiedWallet = useCallback(
    async (params: VerifiedWalletParams): Promise<CharityWallet | null> => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: invokeError } =
          await supabase.functions.invoke<VerifyWalletResponse>(
            "verify-wallet-control",
            { body: params },
          );

        if (invokeError) {
          const msg = parseError(
            invokeError as { message?: string; code?: string },
          );
          setError(msg);
          Logger.error("useCharityWallets.addVerifiedWallet", invokeError);
          return null;
        }

        if (!data?.success || !data?.wallet) {
          setError("Wallet verification returned an invalid response.");
          return null;
        }

        setWallets((prev) => [...prev, data.wallet]);
        return data.wallet;
      } catch (err) {
        const msg = "Failed to verify and add wallet.";
        setError(msg);
        Logger.error("useCharityWallets.addVerifiedWallet", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Adds an institutional wallet via direct insert + attestation file upload.
   * @param params - Wallet details and attestation file
   * @returns The created CharityWallet or null on failure
   */
  const addInstitutionalWallet = useCallback(
    async (
      params: InstitutionalWalletParams,
    ): Promise<CharityWallet | null> => {
      try {
        setLoading(true);
        setError(null);

        const filePath = `${params.charity_profile_id}/${Date.now()}-${params.attestation_file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("charity-attestations")
          .upload(filePath, params.attestation_file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setError("Failed to upload attestation document.");
          Logger.error(
            "useCharityWallets.addInstitutionalWallet:upload",
            uploadError,
          );
          return null;
        }

        const { data: urlData } = supabase.storage
          .from("charity-attestations")
          .getPublicUrl(filePath);

        const { data, error: insertError } = await supabase
          .from("charity_wallets")
          .insert({
            charity_profile_id: params.charity_profile_id,
            wallet_address: params.wallet_address,
            chain_id: params.chain_id,
            wallet_type: "institutional" as const,
            custodian_name: params.custodian_name,
            custodian_attestation_doc_url: urlData.publicUrl,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        const wallet = data as CharityWallet;
        setWallets((prev) => [...prev, wallet]);
        return wallet;
      } catch (err) {
        const msg = "Failed to add institutional wallet.";
        setError(msg);
        Logger.error("useCharityWallets.addInstitutionalWallet", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Swaps the primary designation to a different wallet.
   * Respects the 24-hour rate limit enforced by the DB trigger.
   * @param walletId - The wallet UUID to make primary
   * @returns True on success, false on failure
   */
  const setPrimary = useCallback(
    async (walletId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const target = wallets.find((w) => w.id === walletId);
        if (!target) {
          setError("Wallet not found.");
          return false;
        }

        const currentPrimary = wallets.find(
          (w) =>
            w.is_primary &&
            w.charity_profile_id === target.charity_profile_id &&
            w.chain_id === target.chain_id,
        );

        if (currentPrimary) {
          const { error: unsetError } = await supabase
            .from("charity_wallets")
            .update({ is_primary: false })
            .eq("id", currentPrimary.id);

          if (unsetError) throw unsetError;
        }

        const { error: setError_ } = await supabase
          .from("charity_wallets")
          .update({ is_primary: true })
          .eq("id", walletId);

        if (setError_) throw setError_;

        setWallets((prev) =>
          prev.map((w) => {
            if (w.id === walletId) return { ...w, is_primary: true };
            if (
              w.id === currentPrimary?.id &&
              w.charity_profile_id === target.charity_profile_id &&
              w.chain_id === target.chain_id
            ) {
              return { ...w, is_primary: false };
            }
            return w;
          }),
        );
        return true;
      } catch (err) {
        const msg =
          err instanceof Error && err.message.includes("24")
            ? "Primary wallet was changed recently. Please wait 24 hours."
            : "Failed to set primary wallet.";
        setError(msg);
        Logger.error("useCharityWallets.setPrimary", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [wallets],
  );

  /**
   * Deletes a non-primary wallet.
   * @param walletId - The wallet UUID to delete
   * @returns True on success, false on failure
   */
  const deleteWallet = useCallback(
    async (walletId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const target = wallets.find((w) => w.id === walletId);
        if (target?.is_primary) {
          setError("Cannot delete the primary wallet.");
          return false;
        }

        const { error: deleteError } = await supabase
          .from("charity_wallets")
          .delete()
          .eq("id", walletId);

        if (deleteError) throw deleteError;
        setWallets((prev) => prev.filter((w) => w.id !== walletId));
        return true;
      } catch (err) {
        const msg = "Failed to delete wallet.";
        setError(msg);
        Logger.error("useCharityWallets.deleteWallet", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [wallets],
  );

  return {
    wallets,
    loading,
    error,
    fetchWallets,
    fetchPrimaryWallet,
    addVerifiedWallet,
    addInstitutionalWallet,
    setPrimary,
    deleteWallet,
  };
};
