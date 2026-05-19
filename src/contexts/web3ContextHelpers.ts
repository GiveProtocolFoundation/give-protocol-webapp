import { Logger } from "@/utils/logger";
import { CHAIN_CONFIGS, type ChainId } from "@/config/contracts";

// EIP-1193 Provider interface
/** Standard EIP-1193 Ethereum provider interface (MetaMask, WalletConnect, etc.). */
export interface EIP1193Provider {
  request: (_args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (_event: string, _handler: (..._args: unknown[]) => void) => void;
  removeListener?: (
    _event: string,
    _handler: (..._args: unknown[]) => void,
  ) => void;
  disconnect?: () => Promise<void>;
}

/**
 * Type guard to check if a provider is EIP-1193 compliant
 * @param provider - The provider to check
 * @returns True if the provider has a request method
 */
export function isEIP1193Provider(
  provider: unknown,
): provider is EIP1193Provider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    typeof (provider as EIP1193Provider).request === "function"
  );
}

// Error type guards for Web3 errors
interface WalletError {
  code?: number;
  message?: string;
}

/**
 * Type guard to check if an error is a wallet error with code and message properties
 * @param error - The error object to check
 * @returns True if the error is a wallet error, false otherwise
 */
export function isWalletError(error: unknown): error is WalletError {
  return typeof error === "object" && error !== null;
}

/**
 * Checks if an error has a specific error code
 * @param error - The error object to check
 * @param code - The error code to match
 * @returns True if the error has the specified code, false otherwise
 */
export function hasErrorCode(error: unknown, code: number): boolean {
  return isWalletError(error) && error.code === code;
}

/**
 * Checks if an error message contains a specific substring
 * @param error - The error object to check
 * @param message - The message substring to search for
 * @returns True if the error message contains the substring, false otherwise
 */
export function hasErrorMessage(error: unknown, message: string): boolean {
  return (
    isWalletError(error) &&
    typeof error.message === "string" &&
    error.message.includes(message)
  );
}

/**
 * Checks if a value is a browser event (e.g., from onClick={connect})
 * @param value - The value to check
 * @returns True if the value is an event object
 */
export function isEventObject(value: unknown): boolean {
  if (value instanceof Event) return true;
  return typeof value === "object" && value !== null && "nativeEvent" in value;
}

/**
 * Builds wallet_addEthereumChain params from chain config
 * @param chainId - The chain ID to get params for
 * @returns Chain params for wallet_addEthereumChain or null if unsupported
 */
export function getChainParams(chainId: ChainId) {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return null;

  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: config.rpcUrls,
    blockExplorerUrls: config.blockExplorerUrls,
  };
}

/**
 * Attempts to switch to a specified network
 * @param walletProvider - The EIP-1193 wallet provider
 * @param chainId - The target chain ID
 * @throws Error if user rejects or switch fails
 */
export async function switchToChain(
  walletProvider: EIP1193Provider,
  chainId: ChainId,
): Promise<void> {
  const chainParams = getChainParams(chainId);
  if (!chainParams) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  try {
    await walletProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainParams.chainId }],
    });
    Logger.info("Switched network", { chainId });
  } catch (switchError: unknown) {
    // Chain not added - try to add it
    if (hasErrorCode(switchError, 4902)) {
      await walletProvider.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      });
      Logger.info("Added network", { chainId, name: chainParams.chainName });
      return;
    }
    // User rejected
    if (hasErrorCode(switchError, 4001)) {
      const config = CHAIN_CONFIGS[chainId];
      throw new Error(
        `Please switch to ${config?.name || "the selected network"}`,
      );
    }
    // Other errors
    Logger.error("Failed to switch network", { error: switchError, chainId });
    throw new Error("Failed to switch network. Please try again.");
  }
}
