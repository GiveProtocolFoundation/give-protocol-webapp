import { useState, useEffect } from "react";
import { useContract } from "./useContract";
import { getAddress, isAddress, ZeroAddress } from "ethers";
import { Logger } from "@/utils/logger";

interface CharityInfo {
  isRegistered: boolean;
  walletAddress: string;
  totalReceived: bigint;
  availableBalance: bigint;
}

/**
 * Hook for fetching charity information from the contract
 * @param charityAddress The charity address to query
 * @param tokenAddress The token address to query (use ZeroAddress for native token)
 * @returns Charity information including registration status and balances
 */
export function useCharityInfo(
  charityAddress: string | null,
  tokenAddress: string = ZeroAddress,
) {
  const { contract } = useContract("donation");
  const [charityInfo, setCharityInfo] = useState<CharityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /** Fetches charity info from the smart contract for the given address. */
    const fetchCharityInfo = async () => {
      if (!contract || !charityAddress) {
        setCharityInfo(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Validate addresses
        if (!isAddress(charityAddress)) {
          throw new Error("Invalid charity address");
        }
        if (!isAddress(tokenAddress)) {
          throw new Error("Invalid token address");
        }

        const normalizedCharity = getAddress(charityAddress);
        const normalizedToken = getAddress(tokenAddress);

        const getCharityInfoFunction = contract.getFunction("getCharityInfo");
        const info = await getCharityInfoFunction(
          normalizedCharity,
          normalizedToken,
        );

        setCharityInfo({
          isRegistered: info.isRegistered,
          walletAddress: info.walletAddress,
          totalReceived: info.totalReceived,
          availableBalance: info.availableBalance,
        });

        Logger.info("Charity info fetched", {
          charity: normalizedCharity,
          token: normalizedToken,
          isRegistered: info.isRegistered,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch charity info"),
        );
        Logger.error("Failed to fetch charity info", { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharityInfo();
  }, [contract, charityAddress, tokenAddress]);

  return { charityInfo, isLoading, error };
}
