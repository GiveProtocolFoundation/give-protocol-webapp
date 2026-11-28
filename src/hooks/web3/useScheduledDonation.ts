import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { getContractAddress } from "@/config/contracts";
import { getTokenByAddressOnChain } from "@/config/tokens";
import { Logger } from "@/utils/logger";
import CharityScheduledDistributionABI from "@/contracts/CharityScheduledDistribution.sol/CharityScheduledDistribution.json";

interface ScheduleParams {
  charityAddress: string;
  tokenAddress: string;
  totalAmount: string;
  /** Token decimals for amount scaling (defaults to 18 when omitted). */
  decimals?: number;
}

interface DonorSchedule {
  id: number;
  charity: string;
  token: string;
  totalAmount: string;
  amountPerMonth: string;
  monthsRemaining: number;
  nextDistribution: Date;
  active: boolean;
}

interface ContractError extends Error {
  code?: number;
  message: string;
  reason?: string;
  data?: unknown;
}

/**
 * Scheduled donation hook for managing recurring charity donations on blockchain
 * @function useScheduledDonation
 * @description Manages scheduled donation functionality including creating, canceling, and retrieving donation schedules.
 * Integrates with CharityScheduledDistribution smart contract, handles token approvals, user transaction rejections,
 * and provides comprehensive error handling with development mode detection.
 * @returns {Object} Scheduled donation management utilities and state
 * @returns {Function} returns.createSchedule - Create new donation schedule: (params: ScheduleParams) => Promise<string>
 * @returns {Function} returns.cancelSchedule - Cancel existing schedule: (scheduleId: number) => Promise<string>
 * @returns {Function} returns.getDonorSchedules - Get all donor's schedules: () => Promise<DonorSchedule[]>
 * @returns {boolean} returns.loading - Loading state for all schedule operations
 * @returns {string | null} returns.error - Error message or null if no error
 * @example
 * ```tsx
 * const {
 *   createSchedule,
 *   cancelSchedule,
 *   getDonorSchedules,
 *   loading,
 *   error
 * } = useScheduledDonation();
 *
 * const handleCreateSchedule = async () => {
 *   try {
 *     const txHash = await createSchedule({
 *       charityAddress: '0x123...',
 *       tokenAddress: '0xabc...',
 *       totalAmount: '100'
 *     });
 *     console.log('Schedule created:', txHash);
 *   } catch (error) {
 *     // Error handling included in hook
 *   }
 * };
 *
 * useEffect(() => {
 *   const loadSchedules = async () => {
 *     const schedules = await getDonorSchedules();
 *     setUserSchedules(schedules);
 *   };
 *   loadSchedules();
 * }, [getDonorSchedules]);
 * ```
 */
export function useScheduledDonation() {
  const { provider, address, chainId } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSchedule = useCallback(
    async ({
      charityAddress,
      tokenAddress,
      totalAmount,
      decimals,
    }: ScheduleParams) => {
      if (!provider || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        setLoading(true);
        setError(null);

        // Get the distribution contract address
        let distributionAddress: string;
        try {
          distributionAddress = getContractAddress("DISTRIBUTION");
        } catch (_err) {
          throw new Error(
            "Distribution contract not deployed. Please check with the development team.",
          );
        }

        // Check if we're using the dummy development address
        if (
          distributionAddress === "0x1234567890123456789012345678901234567890"
        ) {
          throw new Error(
            "Scheduled donations are not available in development mode.",
          );
        }

        // Create contract instance
        const signer = await provider.getSigner();
        const distributionContract = new ethers.Contract(
          distributionAddress,
          CharityScheduledDistributionABI.abi,
          signer,
        );

        // First, approve the token transfer
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function approve(address spender, uint256 amount) returns (bool)"],
          signer,
        );

        const parsedAmount = ethers.parseUnits(totalAmount, decimals ?? 18);

        try {
          const approveTx = await tokenContract.approve(
            distributionAddress,
            parsedAmount,
          );
          await approveTx.wait();
        } catch (approveError: unknown) {
          const contractError = approveError as ContractError;
          // Check if user rejected the transaction
          if (
            contractError.code === 4001 ||
            contractError.message?.includes("user rejected")
          ) {
            throw new Error(
              "Transaction was rejected. Please approve the transaction in your wallet to continue.",
            );
          }
          throw contractError;
        }

        // Create the scheduled donation
        try {
          const tx = await distributionContract.createSchedule(
            charityAddress,
            tokenAddress,
            parsedAmount,
          );

          const receipt = await tx.wait();

          Logger.info("Scheduled donation created", {
            charity: charityAddress,
            amount: totalAmount,
            token: tokenAddress,
            txHash: receipt.hash,
          });

          return receipt.hash;
        } catch (txError: unknown) {
          const contractError = txError as ContractError;
          // Check if user rejected the transaction
          if (
            contractError.code === 4001 ||
            contractError.message?.includes("user rejected")
          ) {
            throw new Error(
              "Transaction was rejected. Please confirm the transaction in your wallet to schedule your donation.",
            );
          }
          throw contractError;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to schedule donation";
        setError(message);
        Logger.error("Scheduled donation failed", { error: err });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [provider, address],
  );

  const cancelSchedule = useCallback(
    async (scheduleId: number) => {
      if (!provider || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        setLoading(true);
        setError(null);

        // Get the distribution contract address
        let distributionAddress: string;
        try {
          distributionAddress = getContractAddress("DISTRIBUTION");
        } catch (_err) {
          throw new Error(
            "Distribution contract not deployed. Please check with the development team.",
          );
        }

        // Check if we're using the dummy development address
        if (
          distributionAddress === "0x1234567890123456789012345678901234567890"
        ) {
          throw new Error(
            "Scheduled donations are not available in development mode.",
          );
        }

        // Create contract instance
        const signer = await provider.getSigner();
        const distributionContract = new ethers.Contract(
          distributionAddress,
          CharityScheduledDistributionABI.abi,
          signer,
        );

        // Cancel the schedule
        try {
          const tx = await distributionContract.cancelSchedule(scheduleId);
          const receipt = await tx.wait();

          Logger.info("Scheduled donation cancelled", {
            scheduleId,
            txHash: receipt.hash,
          });

          return receipt.hash;
        } catch (txError: unknown) {
          const contractError = txError as ContractError;
          // Check if user rejected the transaction
          if (
            contractError.code === 4001 ||
            contractError.message?.includes("user rejected")
          ) {
            throw new Error(
              "Transaction was rejected. Please confirm the transaction in your wallet to cancel your donation schedule.",
            );
          }
          throw contractError;
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to cancel scheduled donation";
        setError(message);
        Logger.error("Schedule cancellation failed", { error: err });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [provider, address],
  );

  const getDonorSchedules = useCallback(async (): Promise<DonorSchedule[]> => {
    if (!provider || !address) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      // Get the distribution contract address
      let distributionAddress: string;
      try {
        distributionAddress = getContractAddress("DISTRIBUTION");
      } catch (_err) {
        Logger.warn(
          "Distribution contract not deployed, returning empty schedules",
        );
        return [];
      }

      // Check if we're using a dummy or zero address
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      const dummyAddresses = [
        "0x1234567890123456789012345678901234567890",
        "0x3456789012345678901234567890123456789012",
        zeroAddress,
      ];

      if (
        dummyAddresses.includes(distributionAddress) ||
        distributionAddress === zeroAddress
      ) {
        Logger.warn(
          "Using invalid contract address, returning empty schedules",
        );
        return [];
      }

      // Create contract instance
      const distributionContract = new ethers.Contract(
        distributionAddress,
        CharityScheduledDistributionABI.abi,
        provider,
      );

      // Get schedule IDs for the donor
      let scheduleIds: bigint[];
      try {
        scheduleIds = await distributionContract.getDonorSchedules(address);
      } catch (contractError) {
        // Handle specific decode error
        if (
          contractError instanceof Error &&
          contractError.message.includes("could not decode result data")
        ) {
          Logger.warn(
            "Contract returned empty data, likely not deployed or invalid address",
          );
          return [];
        }
        throw contractError;
      }

      // Get details for each schedule
      const schedules: DonorSchedule[] = await Promise.all(
        scheduleIds.map(async (id: bigint) => {
          const schedule = await distributionContract.donationSchedules(id);
          const tokenDecimals =
            getTokenByAddressOnChain(schedule.token, chainId ?? 1)?.decimals ??
            18;
          return {
            id: Number(id),
            charity: schedule.charity,
            token: schedule.token,
            totalAmount: ethers.formatUnits(
              schedule.totalAmount,
              tokenDecimals,
            ),
            amountPerMonth: ethers.formatUnits(
              schedule.amountPerMonth,
              tokenDecimals,
            ),
            monthsRemaining: Number(schedule.monthsRemaining),
            nextDistribution: new Date(
              Number(schedule.nextDistributionTimestamp) * 1000,
            ),
            active: schedule.active,
          };
        }),
      );

      return schedules;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to get scheduled donations";
      setError(message);
      Logger.error("Get schedules failed", { error: err });
      return [];
    } finally {
      setLoading(false);
    }
  }, [provider, address, chainId]);

  return {
    createSchedule,
    cancelSchedule,
    getDonorSchedules,
    loading,
    error,
  };
}
