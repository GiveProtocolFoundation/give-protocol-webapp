import { useState } from "react";
import { useContract } from "./useContract";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import {
  parseEther,
  parseUnits,
  getAddress,
  isAddress,
  Contract,
  type Provider,
} from "ethers";
import { Logger } from "@/utils/logger";
import { trackTransaction } from "@/lib/sentry";
import { getContractAddress, CHAIN_IDS } from "@/config/contracts";

// Minimal ERC20 ABI for allowance, approve, and decimals. `decimals()` is read
// on-chain so amounts scale correctly for 6-decimal stablecoins (USDC/USDT) as
// well as 18-decimal tokens.
const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// EIP-5792 atomic-batch tuning (wallet_sendCalls / wallet_getCallsStatus).
const EIP5792_STATUS_POLL_MS = 1000;
const EIP5792_TIMEOUT_MS = 90_000;

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

/** A single call within an EIP-5792 `wallet_sendCalls` batch. */
interface Eip5792Call {
  to: string;
  data: string;
  value?: string;
}

/** Minimal EIP-1193/EIP-5792 provider surface used for atomic batching. */
interface Eip5792Provider {
  send: (method: string, params: unknown[]) => Promise<unknown>;
}

/** Shape returned by EIP-5792 `wallet_getCallsStatus`. */
interface Eip5792CallsStatus {
  status?: string;
}

/**
 * Narrow an unknown value to an EIP-5792 provider when it exposes a callable
 * `send` method. Keeps the runtime check and type narrowing in one place so
 * callers do not cast an ethers provider directly.
 * @param value - The value to inspect (typically an ethers provider).
 * @returns An EIP-5792 provider, or undefined when `send` is absent.
 */
function toEip5792Provider(value: unknown): Eip5792Provider | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { send?: unknown };
  if (typeof candidate.send !== "function") return undefined;
  return candidate as Eip5792Provider;
}

/**
 * Narrow an unknown value to a calls-status result with a string `status`.
 * @param value - The value returned by `wallet_getCallsStatus`.
 * @returns A calls-status object, or undefined when the shape is unexpected.
 */
function toCallsStatus(value: unknown): Eip5792CallsStatus | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { status?: unknown };
  if (typeof candidate.status !== "string") return undefined;
  return candidate as Eip5792CallsStatus;
}

/**
 * Detect whether the wallet supports EIP-5792 atomic batching on the given chain.
 * Tolerates both `{ atomicBatch: true }` and `{ atomicBatch: { supported: true } }`
 * capability shapes. Any failure is treated as "unsupported" so callers fall back.
 * @param provider - The connected ethers provider.
 * @param chainId - The chain id to check capabilities for.
 * @returns True when `wallet_getCapabilities` advertises atomic-batch support.
 */
async function supportsAtomicBatch(
  provider: Provider,
  chainId: number,
): Promise<boolean> {
  const p = toEip5792Provider(provider);
  if (!p) return false;
  try {
    const raw = await p.send("wallet_getCapabilities", []);
    if (typeof raw !== "object" || raw === null) return false;
    const capabilities = raw as Record<
      string,
      { atomicBatch?: boolean | { supported?: boolean } }
    >;
    const chainCapabilities = capabilities[`0x${chainId.toString(16)}`];
    if (!chainCapabilities) return false;
    const atomicBatch = chainCapabilities.atomicBatch;
    if (atomicBatch === true) return true;
    return (
      typeof atomicBatch === "object" &&
      atomicBatch !== null &&
      atomicBatch.supported === true
    );
  } catch {
    return false;
  }
}

/**
 * Submit a batch of calls atomically via EIP-5792 `wallet_sendCalls`.
 * Returns null when the wallet rejects the send itself (safe to fall back),
 * or the bundle id when the batch was accepted and must be confirmed.
 * @param provider - The connected ethers provider.
 * @param from - The sender address.
 * @param chainId - The chain id the batch targets.
 * @param calls - The ordered calls to execute in one transaction.
 * @returns The bundle id, or null when nothing was submitted.
 */
async function submitAtomicBatch(
  provider: Provider,
  from: string,
  chainId: number,
  calls: Eip5792Call[],
): Promise<string | null> {
  const p = toEip5792Provider(provider);
  if (!p) return null;
  try {
    const result = await p.send("wallet_sendCalls", [
      {
        version: "1.0",
        chainId: `0x${chainId.toString(16)}`,
        from,
        calls,
      },
    ]);
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

/**
 * Poll EIP-5792 `wallet_getCallsStatus` until the batch is confirmed.
 * @param provider - The connected ethers provider.
 * @param bundleId - The bundle id returned by `wallet_sendCalls`.
 * @throws If the batch fails, is rejected, or confirmation times out.
 */
async function confirmAtomicBatch(
  provider: Provider,
  bundleId: string,
): Promise<void> {
  const p = toEip5792Provider(provider);
  if (!p) {
    throw new Error("Wallet does not support EIP-5792 call status.");
  }
  const deadline = Date.now() + EIP5792_TIMEOUT_MS;
  let confirmed = false;
  while (!confirmed) {
    const status = toCallsStatus(
      await p.send("wallet_getCallsStatus", [bundleId]),
    );
    if (status?.status === "CONFIRMED") {
      confirmed = true;
    } else if (status?.status === "FAILED" || status?.status === "REJECTED") {
      throw new Error("Wallet rejected the batched donation.");
    } else {
      if (Date.now() >= deadline) {
        throw new Error("Batched donation confirmation timed out.");
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, EIP5792_STATUS_POLL_MS);
      });
    }
  }
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
 * @returns {boolean} returns.approving - Loading state for the token-approval step
 * @returns {string | null} returns.error - Error message or null if no error
 * @example
 * ```tsx
 * const { donate, withdraw, loading, approving, error } = useDonation();
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
 * ```
 */
export function useDonation() {
  const { contract } = useContract("donation");
  const { address, signer, chainId, provider } = useWeb3();
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
        chainId ?? CHAIN_IDS.BASE,
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

      // Read the token's decimals on-chain so 6-decimal stablecoins (USDC/USDT)
      // scale correctly instead of being parsed as 18-decimal amounts.
      const decimals = await tokenContract.decimals();
      const parsedAmount = parseUnits(amount, decimals);

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        address,
        donationContractAddress,
      );

      Logger.info("Checking token allowance", {
        currentAllowance: currentAllowance.toString(),
        requiredAmount: parsedAmount.toString(),
        tokenAddress: normalizedTokenAddress,
        decimals: decimals.toString(),
      });

      // Approval is only required when the allowance is insufficient. Exact-amount
      // approval is used (never MaxUint256) so the wallet only authorizes this
      // donation — a security improvement surfaced in the UI (MVP-SEC-04).
      let donationDone = false;
      if (currentAllowance < parsedAmount) {
        // Ethereum USDT's `approve` reverts when changing a non-zero allowance to
        // another non-zero value, so reset to 0 first in that case.
        const needsResetToZero =
          currentAllowance > 0n && currentAllowance < parsedAmount;

        // Encode the atomic batch (approve [+reset] + donate).
        const calls: Eip5792Call[] = [];
        if (needsResetToZero) {
          calls.push({
            to: normalizedTokenAddress,
            data: tokenContract.interface.encodeFunctionData("approve", [
              donationContractAddress,
              0n,
            ]),
            value: "0x0",
          });
        }
        calls.push({
          to: normalizedTokenAddress,
          data: tokenContract.interface.encodeFunctionData("approve", [
            donationContractAddress,
            parsedAmount,
          ]),
          value: "0x0",
        });
        calls.push({
          to: donationContractAddress,
          data: contract.interface.encodeFunctionData("processDonation", [
            normalizedCharityAddress,
            normalizedTokenAddress,
            parsedAmount,
            0n,
          ]),
          value: "0x0",
        });

        // Tier 1 (EIP-5792): if the wallet supports atomic batching, approve and
        // donate in a single transaction.
        let batched = false;
        if (provider) {
          const activeChainId = chainId ?? CHAIN_IDS.BASE;
          if (await supportsAtomicBatch(provider, activeChainId)) {
            // If wallet_sendCalls itself rejects, nothing was submitted and we
            // safely fall back to the guided two-step flow below. If it succeeds,
            // the batch is already in-flight, so we MUST confirm it rather than
            // fall back (which would double-send).
            const bundleId = await submitAtomicBatch(
              provider,
              address,
              activeChainId,
              calls,
            );
            if (bundleId !== null) {
              await confirmAtomicBatch(provider, bundleId);
              batched = true;
              donationDone = true;
              Logger.info("Batched approve + donate confirmed", {
                tokenAddress: normalizedTokenAddress,
                chainId: activeChainId,
              });
            }
          }
        }

        // Tier 2 (fallback): guided two-step approve → donate.
        if (!batched) {
          setApproving(true);
          try {
            if (needsResetToZero) {
              Logger.info("Resetting token allowance to zero (USDT-style)", {
                tokenAddress: normalizedTokenAddress,
              });
              const resetTx = await tokenContract.approve(
                donationContractAddress,
                0n,
              );
              await resetTx.wait();
            }

            Logger.info("Requesting exact-amount token approval", {
              spender: donationContractAddress,
              amount: parsedAmount.toString(),
            });
            const approveTx = await tokenContract.approve(
              donationContractAddress,
              parsedAmount,
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
      }

      // Skip the direct transfer when the atomic batch already executed it.
      if (!donationDone) {
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
      }

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
