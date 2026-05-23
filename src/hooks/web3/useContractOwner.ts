import { useState, useEffect } from "react";
import { useContract } from "./useContract";
import { useWeb3 } from "@/contexts/Web3Context";
import { Logger } from "@/utils/logger";

/**
 * Hook for checking if the current user is the contract owner
 * @returns Object containing owner address, whether current user is owner, and loading state
 */
export function useContractOwner() {
  const { contract } = useContract("donation");
  const { address } = useWeb3();
  const [owner, setOwner] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /** Fetches the contract owner address and checks if the connected wallet matches. */
    const fetchOwner = async () => {
      if (!contract) {
        setOwner(null);
        setIsOwner(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const ownerFunction = contract.getFunction("owner");
        const ownerAddress = await ownerFunction();

        setOwner(ownerAddress);
        setIsOwner(
          address
            ? ownerAddress.toLowerCase() === address.toLowerCase()
            : false,
        );

        Logger.info("Contract owner fetched", {
          owner: ownerAddress,
          currentAddress: address,
          isOwner: address
            ? ownerAddress.toLowerCase() === address.toLowerCase()
            : false,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch contract owner"),
        );
        Logger.error("Failed to fetch contract owner", { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwner();
  }, [contract, address]);

  return { owner, isOwner, isLoading, error };
}
