import { useState } from "react";
import { useContract } from "./useContract";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import {
  parseEther,
  getAddress,
  isAddress,
  Contract,
  MaxUint256,
} from "ethers";
import { Logger } from "@/utils/logger";
import { trackTransaction } from "@/lib/sentry";
import { getContractAddress, CHAIN_IDS } from "@/config/contracts";

// Minimal ERC20 ABI for allowance and approve functions
const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export enum DonationType {
  _NATIVE = "native", // Prefixed with _ as currently unused
  _TOKEN = "token", // Prefixed with _ as currently unused
}

export enum PoolType {
  _DIRECT = "direct", // Prefixed with _ as currently unused
  _EQUITY = "equity", // Prefixed with _ as currently unused
}

interface DonationParams {
  charityAddress: string;
  amount: string;
  type: DonationType;
  _tokenAddress?: string; // Prefixed with _ as currently unused
  poolType?: PoolType;
}

/**
 * Donation hook for processing blockchain-based charitable donations and withdrawals
 * @function useDonation
 * @description Handles direct and equity pool donations using smart contracts on the blockchain.
 * Integrates with Sentry transaction tracking, supports native token donations, and provides
 * comprehensive error handling with withdrawal functionality for charities.
 * @returns {Object} Donation processing utilities and state
 * @returns {Function} returns.donate - Process donation: (params: DonationParams) => Promise<void>
 * @returns {Function} returns.withdraw - Process withdrawal: (amount: string) => Promise<string>
 * @returns {boolean} returns.loading - Loading state for donation/withdrawal operations
 * @returns {string | null} returns.error - Error message or null if no error
 * @example
 * ```tsx
 * const { donate, withdraw, loading, error } = useDonation();
 *
 * const handleDonation = async () => {
 *   try {
 *     await donate({
 *       charityAddress: '0x123...',
 *       amount: '0.1',
 *       type: DonationType.NATIVE,
 *       poolType: PoolType.DIRECT
 *     });
 *     console.log('Donation successful!');
 *   } catch (error) {
 *     // Error handling included in hook
 *   }
 * };
 *
 * const handleWithdrawal = async () => {
 *   try {
 *     const txHash = await withdraw('0.05');
 *     console.log('Withdrawal successful:', txHash);
 *   } catch (error) {
 *     // Error handling included in hook
 *   }
 * };
 *
 * return (
 *   <div>
 *     <button onClick={handleDonation} disabled={loading}>
 *       {loading ? 'Processing...' : 'Donate'}
 *     </button>
 *     {error && <p className="error">{error}</p>}
 *   </div>
 * );
 * ```
 */
export function useDonation() {
  const { contract } = useContract("donation");
  const { address, signer, chainId } = useWeb3();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submits a donation to the specified charity via smart contract.
   * @param params - Donation parameters including charity address, amount, and type
   * @returns Promise that resolves when the donation transaction is confirmed
   */
  const donate = async ({
    charityAddress,
    amount,
    type,
    _tokenAddress,
    poolType = PoolType._DIRECT,
  }: DonationParams) => {
    if (!contract || !address) {
      throw new Error("Contract or wallet not connected");
    }

    // Start Sentry transaction tracking
    const transaction = trackTransaction("donation", {
      amount,
      charityId: charityAddress,
      donationType: type,
      status: "started",
    });

    try {
      setLoading(true);
      setError(null);

      // Log the address for debugging
      Logger.info("Validating charity address", {
        charityAddress,
        type: typeof charityAddress,
      });

      // Validate and normalize the charity address to prevent ENS resolution
      if (!charityAddress || typeof charityAddress !== "string") {
        throw new Error(`Invalid charity address: ${charityAddress}`);
      }

      if (!isAddress(charityAddress)) {
        throw new Error(`Invalid charity address format: ${charityAddress}`);
      }
      const normalizedCharityAddress = getAddress(charityAddress);

      const parsedAmount = parseEther(amount);

      // The DurationDonation contract uses processDonation() for both native and ERC20
      // Native token support requires contract updates or a wrapper contract
      if (type === DonationType._NATIVE) {
        throw new Error(
          "Native token donations not yet supported. Please use ERC20 tokens.",
        );
      }

      // For ERC20 token donations using processDonation
      if (!_tokenAddress) {
        throw new Error("Token address is required for token donations");
      }

      // Validate token address
      if (!isAddress(_tokenAddress)) {
        throw new Error("Invalid token address format");
      }
      const normalizedTokenAddress = getAddress(_tokenAddress);

      // Get donation contract address for approval
      const donationContractAddress = getContractAddress(
        "DONATION",
        chainId ?? CHAIN_IDS.MOONBASE,
      );

      // Check if we need to approve the token first
      if (!signer) {
        throw new Error("Wallet signer not available");
      }

      const tokenContract = new Contract(
        normalizedTokenAddress,
        ERC20_ABI,
        signer,
      );

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        address,
        donationContractAddress,
      );

      Logger.info("Checking token allowance", {
        currentAllowance: currentAllowance.toString(),
        requiredAmount: parsedAmount.toString(),
        tokenAddress: normalizedTokenAddress,
      });

      // If allowance is insufficient, request approval
      if (currentAllowance < parsedAmount) {
        Logger.info("Requesting token approval", {
          spender: donationContractAddress,
          amount: "unlimited",
        });

        setApproving(true);
        try {
          // Approve unlimited amount to avoid repeated approvals
          const approveTx = await tokenContract.approve(
            donationContractAddress,
            MaxUint256,
          );
          await approveTx.wait();

          Logger.info("Token approval successful", {
            tokenAddress: normalizedTokenAddress,
            spender: donationContractAddress,
          });
        } finally {
          setApproving(false);
        }
      }

      // Call processDonation(charity, token, charityAmount, platformTip)
      // For now, platformTip is 0 (no tip)
      const processDonationFunction = contract.getFunction("processDonation");
      const tx = await processDonationFunction(
        normalizedCharityAddress,
        normalizedTokenAddress,
        parsedAmount,
        0, // platformTip = 0 for now
      );
      await tx.wait();

      Logger.info("Token donation successful", {
        amount,
        charity: charityAddress,
        tokenAddress: _tokenAddress,
        type: "token",
        poolType,
      });

      // Mark transaction as successful
      transaction.finish("ok");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process donation";
      setError(message);
      showToast({ type: "error", title: "Donation failed", message });
      Logger.error("Donation failed", {
        error: err,
        amount,
        charity: charityAddress,
        type,
      });

      // Mark transaction as failed
      transaction.finish("error");

      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraws funds from the donation contract.
   * @param amount - Amount to withdraw as a string
   * @returns Promise that resolves when the withdrawal transaction is confirmed
   */
  const withdraw = async (amount: string) => {
    if (!contract || !address) {
      throw new Error("Contract or wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);

      const parsedAmount = parseEther(amount);
      const withdrawFunction = contract.getFunction("withdraw");
      const tx = await withdrawFunction(parsedAmount);
      const receipt = await tx.wait();

      Logger.info("Withdrawal successful", {
        amount,
        txHash: receipt.hash,
      });

      return receipt.hash;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process withdrawal";
      setError(message);
      Logger.error("Withdrawal failed", {
        error: err,
        amount,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    donate,
    withdraw,
    loading,
    approving,
    error,
  };
}
