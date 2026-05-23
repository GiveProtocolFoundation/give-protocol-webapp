import { useState } from "react";
import { useContract } from "./useContract";
import { getAddress, isAddress } from "ethers";
import { Logger } from "@/utils/logger";

/**
 * Hook for registering charities in the donation contract
 * @returns Object containing registerCharity function, loading state, and error
 */
export function useCharityRegistration() {
  const { contract } = useContract("donation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Registers a charity address on the smart contract.
   * @param charityAddress - Ethereum address to register as a charity
   * @returns Promise resolving to the transaction hash
   */
  const registerCharity = async (charityAddress: string): Promise<string> => {
    if (!contract) {
      throw new Error("Contract not connected");
    }

    try {
      setLoading(true);
      setError(null);

      // Validate and normalize the charity address
      if (!isAddress(charityAddress)) {
        throw new Error(`Invalid charity address format: ${charityAddress}`);
      }
      const normalizedAddress = getAddress(charityAddress);

      Logger.info("Registering charity", { charityAddress: normalizedAddress });

      // Call registerCharity function
      const registerFunction = contract.getFunction("registerCharity");
      const tx = await registerFunction(normalizedAddress);
      const receipt = await tx.wait();

      Logger.info("Charity registered successfully", {
        charityAddress: normalizedAddress,
        txHash: receipt.hash,
      });

      return receipt.hash;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to register charity";
      setError(message);
      Logger.error("Charity registration failed", {
        error: err,
        charityAddress,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    registerCharity,
    loading,
    error,
  };
}
