import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useContract } from "./useContract";
import { useWeb3 } from "@/contexts/Web3Context";
import { Logger } from "@/utils/logger";
import { getContractAddress } from "@/config/contracts";

/** A portfolio fund that distributes donations across multiple charities. */
export interface PortfolioFund {
  id: string;
  name: string;
  description: string;
  active: boolean;
  charities: string[];
  ratios: number[];
  totalRaised: string;
  totalDistributed: string;
}

/** On-chain charity information returned from the PortfolioFunds contract. */
export interface CharityInfo {
  address: string;
  name: string;
  claimableAmount: string;
  totalClaimed: string;
}

/**
 * Hook for interacting with Portfolio Funds contract
 * @function usePortfolioFunds
 * @description Manages portfolio fund donations, claiming, and viewing fund details
 * @returns {Object} Portfolio funds utilities and state
 * @returns {Function} returns.donateToFund - Donate to portfolio fund: (fundId: string, token: string, amount: string) => Promise<void>
 * @returns {Function} returns.donateNativeToFund - Donate native DEV to fund: (fundId: string, amount: string) => Promise<void>
 * @returns {Function} returns.claimFunds - Claim funds for charity: (fundId: string, token: string) => Promise<void>
 * @returns {Function} returns.getAllFunds - Get all active portfolio funds: () => Promise<PortfolioFund[]>
 * @returns {Function} returns.getFundDetails - Get specific fund details: (fundId: string) => Promise<PortfolioFund | null>
 * @returns {Function} returns.getCharityClaimableAmount - Get claimable amount for charity: (fundId: string, charity: string, token: string) => Promise<string>
 * @returns {boolean} returns.loading - Loading state for operations
 * @returns {string | null} returns.error - Error message or null if no error
 */
export function usePortfolioFunds() {
  const { chainId } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = getContractAddress(
    "PORTFOLIO_FUNDS",
    chainId || 1287,
  );
  const contract = useContract(contractAddress, [
    // Fund management
    "function createPortfolioFund(string memory fundName, string memory description, address[] memory charities, string[] memory charityNames) external",
    "function getAllActiveFunds() external view returns (bytes32[] memory)",
    "function getFundDetails(bytes32 fundId) external view returns (string memory name, string memory description, bool active, address[] memory charities, uint256[] memory ratios, uint256 totalRaised, uint256 totalDistributed)",

    // Donations
    "function donateToFund(bytes32 fundId, address token, uint256 amount) external",
    "function donateNativeToFund(bytes32 fundId) external payable",

    // Claiming
    "function claimFunds(bytes32 fundId, address token) external",
    "function claimMultipleTokens(bytes32 fundId, address[] memory tokens) external",

    // View functions
    "function getCharityClaimableAmount(bytes32 fundId, address charity, address token) external view returns (uint256)",
    "function getCharityTotalClaimed(bytes32 fundId, address charity, address token) external view returns (uint256)",
    "function getCharityFunds(address charity) external view returns (bytes32[] memory)",
    "function getFundBalance(bytes32 fundId, address token) external view returns (uint256)",

    // Admin functions
    "function addVerifiedCharity(address charity, string memory name) external",
    "function verifiedCharities(address) external view returns (bool)",
    "function charityNames(address) external view returns (string memory)",

    // Platform settings
    "function platformFeeRate() external view returns (uint256)",
    "function treasury() external view returns (address)",

    // Events
    "event DonationReceived(bytes32 indexed fundId, address indexed donor, address token, uint256 totalAmount, uint256 platformFee, uint256 netAmount)",
    "event CharityClaimedFunds(bytes32 indexed fundId, address indexed charity, address token, uint256 amount, uint256 totalClaimed)",
    "event FundCreated(bytes32 indexed fundId, string name, address[] charities, uint256[] ratios)",
  ]);

  const donateToFund = useCallback(
    async (fundId: string, tokenAddress: string, amount: string) => {
      if (!contract) {
        throw new Error("Contract not available");
      }

      setLoading(true);
      setError(null);

      try {
        const amountWei = ethers.parseUnits(amount, 18); // Assumes 18 decimals
        const tx = await contract.donateToFund(fundId, tokenAddress, amountWei);
        await tx.wait();

        Logger.info("Portfolio fund donation successful", {
          fundId,
          tokenAddress,
          amount,
          txHash: tx.hash,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to donate to fund";
        setError(errorMessage);
        Logger.error("Portfolio fund donation failed", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contract],
  );

  const donateNativeToFund = useCallback(
    async (fundId: string, amount: string) => {
      if (!contract) {
        throw new Error("Contract not available");
      }

      setLoading(true);
      setError(null);

      try {
        const amountWei = ethers.parseEther(amount);
        const tx = await contract.donateNativeToFund(fundId, {
          value: amountWei,
        });
        await tx.wait();

        Logger.info("Native portfolio fund donation successful", {
          fundId,
          amount,
          txHash: tx.hash,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to donate native to fund";
        setError(errorMessage);
        Logger.error("Native portfolio fund donation failed", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contract],
  );

  const claimFunds = useCallback(
    async (fundId: string, tokenAddress: string) => {
      if (!contract) {
        throw new Error("Contract not available");
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await contract.claimFunds(fundId, tokenAddress);
        await tx.wait();

        Logger.info("Portfolio fund claim successful", {
          fundId,
          tokenAddress,
          txHash: tx.hash,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to claim funds";
        setError(errorMessage);
        Logger.error("Portfolio fund claim failed", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contract],
  );

  const getAllFunds = useCallback(async (): Promise<PortfolioFund[]> => {
    if (!contract) {
      return [];
    }

    try {
      const fundIds = await contract.getAllActiveFunds();
      const funds = await Promise.all(
        fundIds.map(async (fundId: string) => {
          const details = await contract.getFundDetails(fundId);
          return {
            id: fundId,
            name: details[0],
            description: details[1],
            active: details[2],
            charities: details[3],
            ratios: details[4].map((ratio: bigint) => Number(ratio)),
            totalRaised: ethers.formatEther(details[5]),
            totalDistributed: ethers.formatEther(details[6]),
          };
        }),
      );

      return funds;
    } catch (err) {
      Logger.error("Failed to get all funds", err);
      return [];
    }
  }, [contract]);

  const getFundDetails = useCallback(
    async (fundId: string): Promise<PortfolioFund | null> => {
      if (!contract) {
        return null;
      }

      try {
        const details = await contract.getFundDetails(fundId);
        return {
          id: fundId,
          name: details[0],
          description: details[1],
          active: details[2],
          charities: details[3],
          ratios: details[4].map((ratio: bigint) => Number(ratio)),
          totalRaised: ethers.formatEther(details[5]),
          totalDistributed: ethers.formatEther(details[6]),
        };
      } catch (err) {
        Logger.error("Failed to get fund details", err);
        return null;
      }
    },
    [contract],
  );

  const getCharityClaimableAmount = useCallback(
    async (
      fundId: string,
      charityAddress: string,
      tokenAddress: string,
    ): Promise<string> => {
      if (!contract) {
        return "0";
      }

      try {
        const amount = await contract.getCharityClaimableAmount(
          fundId,
          charityAddress,
          tokenAddress,
        );
        return ethers.formatEther(amount);
      } catch (err) {
        Logger.error("Failed to get claimable amount", err);
        return "0";
      }
    },
    [contract],
  );

  const getCharityInfo = useCallback(
    async (
      charityAddress: string,
      fundId: string,
      tokenAddress: string,
    ): Promise<CharityInfo | null> => {
      if (!contract) {
        return null;
      }

      try {
        const [claimableAmount, totalClaimed, charityName] = await Promise.all([
          contract.getCharityClaimableAmount(
            fundId,
            charityAddress,
            tokenAddress,
          ),
          contract.getCharityTotalClaimed(fundId, charityAddress, tokenAddress),
          contract.charityNames(charityAddress),
        ]);

        return {
          address: charityAddress,
          name: charityName,
          claimableAmount: ethers.formatEther(claimableAmount),
          totalClaimed: ethers.formatEther(totalClaimed),
        };
      } catch (err) {
        Logger.error("Failed to get charity info", err);
        return null;
      }
    },
    [contract],
  );

  const getPlatformFee = useCallback(async (): Promise<number> => {
    if (!contract) {
      return 100; // Default 1%
    }

    try {
      const feeRate = await contract.platformFeeRate();
      return Number(feeRate); // Returns basis points (100 = 1%)
    } catch (err) {
      Logger.error("Failed to get platform fee", err);
      return 100;
    }
  }, [contract]);

  return {
    // Main functions
    donateToFund,
    donateNativeToFund,
    claimFunds,
    getAllFunds,
    getFundDetails,
    getCharityClaimableAmount,
    getCharityInfo,
    getPlatformFee,

    // State
    loading,
    error,
    contract,
  };
}
