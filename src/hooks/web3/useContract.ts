import { useState, useEffect, useCallback } from "react";
import { Contract, ContractInterface } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { Logger } from "@/utils/logger";
import { getContractAddress } from "@/config/contracts";
import DurationDonationABI from "@/contracts/DurationDonation.sol/DurationDonation.json";

const CONTRACT_ABIS = {
  donation: DurationDonationABI.abi,
};

type ContractType = "donation";

interface ContractConfig {
  maxRetries?: number;
  retryDelay?: number;
  fallbackRPCs?: string[];
}

const DEFAULT_CONFIG: ContractConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  fallbackRPCs: [
    "https://rpc.api.moonbase.moonbeam.network",
    "https://moonbase-alpha.public.blastapi.io",
    "https://moonbase.unitedbloc.com:1000",
  ],
};

/**
 * Hook for interacting with blockchain smart contracts
 * Handles contract initialization, connection retries, and fallback RPC endpoints
 * @param contractType - The type of contract to connect to ('donation')
 * @param config - Optional configuration for retry logic and fallback RPCs
 * @returns Object containing contract instance, connection state, and error information
 */
export function useContract(
  contractType: ContractType,
  config: ContractConfig = DEFAULT_CONFIG,
) {
  const { provider, signer, chainId } = useWeb3();
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializeContract = useCallback(async () => {
    if (!provider || !chainId) return;

    try {
      const contractName = contractType === "donation" ? "DONATION" : "TOKEN";
      let address: string;

      try {
        address = getContractAddress(contractName, chainId);
      } catch (_err) {
        // Use development address if contract address is not found
        Logger.warn("Using development contract address", { contractType });
        // skipcq: SCT-A000 - These are placeholder development Ethereum addresses, not real secrets
        address =
          contractType === "donation"
            ? "0x1234567890123456789012345678901234567890"
            : "0x2345678901234567890123456789012345678901";
      }

      const abi = CONTRACT_ABIS[contractType];

      // Validate ABI
      if (!abi || !Array.isArray(abi)) {
        throw new Error(`Invalid ABI for ${contractType} contract`);
      }

      // Create contract instance with signer for write operations, fallback to provider for read-only
      const contractRunner = signer || provider;
      const contract = new Contract(
        address,
        abi as ContractInterface,
        contractRunner,
      );

      // Check if contract is deployed - but don't throw if not in development
      const code = await provider.getCode(address);
      if (code === "0x" && import.meta.env.PROD) {
        throw new Error(`Contract not deployed at ${address}`);
      }

      setContract(contract);
      setError(null);
      setRetryCount(0);

      Logger.info(`${contractType} contract initialized`, {
        address,
        chainId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize contract";

      // In development, just log a warning
      if (!import.meta.env.PROD) {
        Logger.warn("Contract initialization failed (development)", {
          error: err,
          contractType,
          retryCount,
        });
        return;
      }

      setError(new Error(message));
      Logger.error(`Failed to initialize ${contractType} contract`, {
        error: err,
      });

      // Attempt retry with fallback RPC
      const maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries ?? 3;
      const retryDelay = config.retryDelay ?? DEFAULT_CONFIG.retryDelay ?? 1000;
      if (retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, retryCount);
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          const fallbackRPCs = DEFAULT_CONFIG.fallbackRPCs ?? [];
          const fallbackRPC =
            config.fallbackRPCs?.[retryCount] || fallbackRPCs[retryCount];
          if (fallbackRPC && provider) {
            // Note: This approach needs to be updated as provider.url is not directly accessible in ethers v6
            // This is a placeholder for the actual implementation
            initializeContract();
          }
        }, delay);
      }
    }
  }, [provider, signer, chainId, contractType, config, retryCount]);

  useEffect(() => {
    initializeContract();
  }, [initializeContract]);

  const validateTransaction = useCallback(
    async (method: string, args: unknown[]): Promise<boolean> => {
      if (!contract) return false;

      try {
        // Estimate gas to validate transaction
        // Note: In ethers v6, the syntax for estimating gas has changed
        const gasEstimate = await contract
          .getFunction(method)
          .estimateGas(...args);

        // Check if gas estimate is reasonable
        const maxGas = 1000000n; // 1M gas units
        if (gasEstimate > maxGas) {
          throw new Error("Transaction would require too much gas");
        }

        return true;
      } catch (error) {
        Logger.error("Transaction validation failed", {
          contract: contractType,
          method,
          args,
          error,
        });
        return false;
      }
    },
    [contract, contractType],
  );

  return {
    contract,
    error,
    validateTransaction,
    retryCount,
  };
}
