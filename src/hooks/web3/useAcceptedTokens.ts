import { useState, useEffect } from "react";
import { useContract } from "./useContract";
import { getAddress, isAddress, ZeroAddress } from "ethers";
import { Logger } from "@/utils/logger";

/**
 * Hook for checking if a token is accepted by the donation contract
 * @param tokenAddress The token address to check (use ZeroAddress for native token)
 * @returns Whether the token is accepted and loading state
 */
export function useAcceptedTokens(tokenAddress: string = ZeroAddress) {
  const { contract } = useContract("donation");
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /** Checks whether the given token address is accepted by the contract. */
    const checkToken = async () => {
      if (!contract || !tokenAddress) {
        setIsAccepted(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Validate address
        if (!isAddress(tokenAddress)) {
          throw new Error("Invalid token address");
        }

        const normalizedToken = getAddress(tokenAddress);

        const acceptedTokensFunction = contract.getFunction("acceptedTokens");
        const accepted = await acceptedTokensFunction(normalizedToken);

        setIsAccepted(accepted);

        Logger.info("Token acceptance checked", {
          token: normalizedToken,
          isAccepted: accepted,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to check token acceptance"),
        );
        Logger.error("Failed to check token acceptance", { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, [contract, tokenAddress]);

  return { isAccepted, isLoading, error };
}
