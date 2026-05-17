/**
 * EVM Chain Adapter for Give Protocol
 * Wraps ethers.js for EVM-compatible blockchain interactions
 */

import { ethers } from "ethers";
import { Logger } from "@/utils/logger";
import {
  getEVMChainConfig,
  getEVMChainParams,
  isEVMChainSupported,
  type EVMChainId,
} from "@/config/chains";
import type { UnifiedAccount, UnifiedTransactionRequest } from "@/types/wallet";

/**
 * EIP-1193 Provider interface
 */
interface EIP1193Provider {
  request: (_args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (_event: string, _handler: (..._args: unknown[]) => void) => void;
  removeListener?: (
    _event: string,
    _handler: (..._args: unknown[]) => void,
  ) => void;
}

/**
 * EVM chain adapter error codes
 */
export const EVM_ERROR_CODES = {
  USER_REJECTED: 4001,
  CHAIN_NOT_ADDED: 4902,
  UNAUTHORIZED: -32002,
} as const;

/**
 * Type guard for EIP-1193 provider
 * @param provider - Provider to check
 * @returns True if provider is EIP-1193 compliant
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

/**
 * Check if error has a specific code
 * @param error - Error to check
 * @param code - Expected error code
 * @returns True if error has the code
 */
function hasErrorCode(error: unknown, code: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === code
  );
}

/**
 * EVM Chain Adapter
 * Provides unified interface for EVM blockchain operations
 */
export class EVMAdapter {
  private readonly rawProvider: EIP1193Provider;
  private ethersProvider: ethers.BrowserProvider | null = null;
  private ethersSigner: ethers.Signer | null = null;
  private currentChainId: number | null = null;
  private connectedAddress: string | null = null;

  /**
   * Wraps a raw EIP-1193 provider; ethers wrappers are created lazily on connect.
   * @param provider - The injected EIP-1193 provider to adapt.
   */
  constructor(provider: EIP1193Provider) {
    this.rawProvider = provider;
  }

  /**
   * Get the underlying ethers provider
   * @returns ethers.BrowserProvider instance
   */
  getProvider(): ethers.BrowserProvider | null {
    return this.ethersProvider;
  }

  /**
   * Get the current signer
   * @returns ethers.Signer instance
   */
  getSigner(): ethers.Signer | null {
    return this.ethersSigner;
  }

  /**
   * Get current chain ID
   * @returns Current chain ID or null
   */
  getChainId(): number | null {
    return this.currentChainId;
  }

  /**
   * Connect to the EVM provider
   * @param targetChainId - Optional chain ID to switch to after connection
   * @returns Array of connected accounts
   */
  async connect(targetChainId?: number): Promise<UnifiedAccount[]> {
    try {
      // Request account access
      const accounts = (await this.rawProvider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Create ethers provider
      this.ethersProvider = new ethers.BrowserProvider(
        this.rawProvider as ethers.Eip1193Provider,
      );

      // Get current network
      const network = await this.ethersProvider.getNetwork();
      this.currentChainId = Number(network.chainId);

      // Switch chain if needed
      if (targetChainId && this.currentChainId !== targetChainId) {
        await this.switchChain(targetChainId);
        // Recreate provider after chain switch
        this.ethersProvider = new ethers.BrowserProvider(
          this.rawProvider as ethers.Eip1193Provider,
        );
        const newNetwork = await this.ethersProvider.getNetwork();
        this.currentChainId = Number(newNetwork.chainId);
      }

      // Get signer
      this.ethersSigner = await this.ethersProvider.getSigner();
      this.connectedAddress = accounts[0];

      Logger.info("EVM adapter connected", {
        address: accounts[0],
        chainId: this.currentChainId,
      });

      // Convert to unified accounts
      return this.toUnifiedAccounts(accounts);
    } catch (error) {
      Logger.error("EVM adapter connection failed", { error });
      throw error;
    }
  }

  /**
   * Disconnect from the provider
   */
  disconnect(): Promise<void> {
    this.ethersProvider = null;
    this.ethersSigner = null;
    this.currentChainId = null;
    this.connectedAddress = null;
    Logger.info("EVM adapter disconnected");
    return Promise.resolve();
  }

  /**
   * Get current accounts
   * @returns Array of connected accounts
   */
  async getAccounts(): Promise<UnifiedAccount[]> {
    try {
      const accounts = (await this.rawProvider.request({
        method: "eth_accounts",
      })) as string[];
      return this.toUnifiedAccounts(accounts);
    } catch (error) {
      Logger.error("Failed to get EVM accounts", { error });
      return [];
    }
  }

  /**
   * Switch to a different EVM chain
   * @param chainId - Target chain ID
   */
  async switchChain(chainId: number): Promise<void> {
    if (!isEVMChainSupported(chainId)) {
      throw new Error(`Unsupported EVM chain: ${chainId}`);
    }

    const chainParams = getEVMChainParams(chainId);
    if (!chainParams) {
      throw new Error(`No chain params for chain: ${chainId}`);
    }

    try {
      await this.rawProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainParams.chainId }],
      });
      this.currentChainId = chainId;
      Logger.info("Switched EVM chain", { chainId });
    } catch (error) {
      // Chain not added - try to add it
      if (hasErrorCode(error, EVM_ERROR_CODES.CHAIN_NOT_ADDED)) {
        await this.rawProvider.request({
          method: "wallet_addEthereumChain",
          params: [chainParams],
        });
        this.currentChainId = chainId;
        Logger.info("Added and switched to EVM chain", { chainId });
        return;
      }

      // User rejected
      if (hasErrorCode(error, EVM_ERROR_CODES.USER_REJECTED)) {
        const config = getEVMChainConfig(chainId);
        throw new Error(
          `Please switch to ${config?.name || "the selected network"}`,
        );
      }

      throw error;
    }
  }

  /**
   * Sign a transaction
   * @param tx - Transaction request
   * @returns Transaction hash
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (!this.ethersSigner) {
      throw new Error("EVM signer not available");
    }

    if (tx.chainType !== "evm") {
      throw new Error("Transaction is not for EVM chain");
    }

    const ethTx: ethers.TransactionRequest = {
      to: tx.to,
      value: tx.value ? ethers.parseEther(tx.value) : undefined,
      data: tx.data as string | undefined,
      gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
    };

    const response = await this.ethersSigner.sendTransaction(ethTx);
    Logger.info("EVM transaction sent", { hash: response.hash });
    return response.hash;
  }

  /**
   * Sign a message
   * @param message - Message to sign
   * @returns Signature
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.ethersSigner) {
      throw new Error("EVM signer not available");
    }

    const messageStr =
      typeof message === "string" ? message : ethers.hexlify(message);
    const signature = await this.ethersSigner.signMessage(messageStr);
    Logger.info("EVM message signed");
    return signature;
  }

  /**
   * Setup event listeners
   * @param onAccountsChanged - Callback for account changes
   * @param onChainChanged - Callback for chain changes
   * @param onDisconnect - Callback for disconnect
   * @returns Cleanup function
   */
  setupEventListeners(
    onAccountsChanged: (_accounts: string[]) => void,
    onChainChanged: (_chainId: string) => void,
    onDisconnect: () => void,
  ): () => void {
    if (!this.rawProvider.on) {
      return () => {
        // No-op cleanup for providers without event support
      };
    }

    this.rawProvider.on("accountsChanged", onAccountsChanged);
    this.rawProvider.on("chainChanged", onChainChanged);
    this.rawProvider.on("disconnect", onDisconnect);

    return () => {
      this.rawProvider.removeListener?.("accountsChanged", onAccountsChanged);
      this.rawProvider.removeListener?.("chainChanged", onChainChanged);
      this.rawProvider.removeListener?.("disconnect", onDisconnect);
    };
  }

  /**
   * Convert raw addresses to unified accounts
   * @param addresses - Array of EVM addresses
   * @returns Array of unified accounts
   */
  private toUnifiedAccounts(addresses: string[]): UnifiedAccount[] {
    const chainConfig = this.currentChainId
      ? getEVMChainConfig(this.currentChainId as EVMChainId)
      : null;

    return addresses.map((address, index) => ({
      id: `evm-${this.currentChainId}-${address}`,
      address,
      chainType: "evm" as const,
      chainId: this.currentChainId || 1,
      chainName: chainConfig?.name || "Unknown Chain",
      source: "EVM",
      name: index === 0 ? "Primary Account" : `Account ${index + 1}`,
    }));
  }
}

/**
 * Create an EVM adapter from a raw provider
 * @param provider - EIP-1193 provider
 * @returns EVMAdapter instance
 */
export function createEVMAdapter(provider: unknown): EVMAdapter | null {
  if (!isEIP1193Provider(provider)) {
    return null;
  }
  return new EVMAdapter(provider);
}
