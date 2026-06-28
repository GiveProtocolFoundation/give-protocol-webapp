/**
 * Safe Wallet Provider
 * Integration with Safe (formerly Gnosis Safe) smart contract wallets
 * Supports automatic detection when running inside Safe App iframe
 */

import { Logger } from "@/utils/logger";
import type {
  ChainType,
  UnifiedAccount,
  UnifiedWalletProvider,
  UnifiedTransactionRequest,
  WalletCategory,
} from "@/types/wallet";
import { getEVMChainConfig, type EVMChainId } from "@/config/chains";

/**
 * Safe App SDK types (simplified)
 */
interface SafeInfo {
  safeAddress: string;
  chainId: number;
  owners: string[];
  threshold: number;
  isReadOnly: boolean;
}

interface SafeAppsSdk {
  safe: {
    getInfo: () => Promise<SafeInfo>;
  };
  txs: {
    send: (_txs: {
      txs: SafeTransactionData[];
    }) => Promise<{ safeTxHash: string }>;
  };
}

interface SafeTransactionData {
  to: string;
  value: string;
  data: string;
  operation?: number;
}

/**
 * SafeProvider - Smart contract wallet integration
 * Automatically detects Safe App context and provides multi-sig functionality
 */
export class SafeProvider implements UnifiedWalletProvider {
  readonly name = "Safe";
  readonly icon = "safe";
  readonly category: WalletCategory = "institutional";
  readonly supportedChainTypes: ChainType[] = ["evm"];

  private sdk: SafeAppsSdk | null = null;
  private safeInfo: SafeInfo | null = null;
  private isInSafe = false;

  /**
   * Get underlying provider objects
   */
  get providers() {
    return {
      evm: this.sdk,
    };
  }

  /**
   * Check if running inside Safe App iframe
   * @returns True if in Safe context
   */
  isInSafeContext(): boolean {
    if (this.supportedChainTypes.length === 0) return false;
    if (typeof window === "undefined") return false;

    // Check if we're in an iframe
    const isIframe = window !== window.parent;

    // Check for Safe-specific URL parameters
    const ancestorOrigin = window.location.ancestorOrigins?.[0];
    const ancestorHostname = ancestorOrigin
      ? new URL(ancestorOrigin).hostname
      : "";
    const hasSafeParams =
      window.location.search.includes("safe=") ||
      ancestorHostname === "app.safe.global" ||
      ancestorHostname.endsWith(".safe.global") ||
      ancestorHostname === "gnosis-safe.io" ||
      ancestorHostname.endsWith(".gnosis-safe.io");

    return isIframe && hasSafeParams;
  }

  /**
   * Check if Safe is available
   * Safe is "installed" when running in Safe App context
   * @returns True if in Safe context
   */
  isInstalled(): boolean {
    return this.isInSafeContext();
  }

  /**
   * Connect to Safe
   * @param _chainType - Ignored, Safe only supports EVM
   * @returns Array of Safe accounts
   */
  async connect(_chainType?: ChainType): Promise<UnifiedAccount[]> {
    if (!this.isInSafeContext()) {
      throw new Error("Not running in Safe App context");
    }

    try {
      // Dynamically import Safe Apps SDK
      const { default: SafeAppsSDK } =
        await import("@safe-global/safe-apps-sdk");

      this.sdk = new SafeAppsSDK() as unknown as SafeAppsSdk;
      this.safeInfo = await this.sdk.safe.getInfo();
      this.isInSafe = true;

      Logger.info("Safe connected", {
        safeAddress: this.safeInfo.safeAddress,
        chainId: this.safeInfo.chainId,
        owners: this.safeInfo.owners.length,
        threshold: this.safeInfo.threshold,
      });

      return this.toUnifiedAccounts();
    } catch (error) {
      Logger.error("Safe connection failed", { error });
      throw new Error("Failed to connect to Safe");
    }
  }

  /**
   * Disconnect from Safe
   * Note: Safe Apps cannot truly disconnect, just clear local state
   */
  disconnect(): Promise<void> {
    this.sdk = null;
    this.safeInfo = null;
    this.isInSafe = false;
    Logger.info("Safe disconnected");
    return Promise.resolve();
  }

  /**
   * Get Safe accounts
   * @param _chainType - Ignored, Safe only supports EVM
   * @returns Array of Safe accounts
   */
  getAccounts(_chainType?: ChainType): Promise<UnifiedAccount[]> {
    if (!this.safeInfo) {
      return Promise.resolve([]);
    }
    return Promise.resolve(this.toUnifiedAccounts());
  }

  /**
   * Switch chain
   * Note: Safe Apps use the chain configured in the Safe interface
   * @param _chainId - Target chain ID (ignored)
   * @param _chainType - Chain type (must be EVM)
   */
  switchChain(_chainId: number | string, _chainType: ChainType): Promise<void> {
    // Safe Apps cannot switch chains - the chain is determined by the Safe
    Logger.warn(
      `${this.name}: Cannot switch chains. Please switch in the Safe interface.`,
    );
    return Promise.resolve();
  }

  /**
   * Sign and queue a transaction
   * Safe transactions are queued for multi-sig approval
   * @param tx - Transaction request
   * @returns Safe transaction hash (for tracking)
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (!this.sdk || !this.safeInfo) {
      throw new Error("Safe not connected");
    }

    if (tx.chainType !== "evm") {
      throw new Error("Safe only supports EVM transactions");
    }

    const safeTx: SafeTransactionData = {
      to: tx.to,
      value: tx.value || "0",
      data: (tx.data as string) || "0x",
      operation: 0, // Call operation
    };

    try {
      const result = await this.sdk.txs.send({ txs: [safeTx] });
      Logger.info("Safe transaction queued", { safeTxHash: result.safeTxHash });
      return result.safeTxHash;
    } catch (error) {
      Logger.error("Safe transaction failed", { error });
      throw error;
    }
  }

  /**
   * Sign a message
   * Note: Safe message signing requires on-chain signature
   * @param message - Message to sign
   * @param _chainType - Chain type (must be EVM)
   * @returns Signature
   */
  signMessage(
    message: string | Uint8Array,
    _chainType: ChainType,
  ): Promise<string> {
    if (!this.sdk) {
      throw new Error("Safe not connected");
    }

    // Safe Apps SDK doesn't directly support message signing in the same way
    // This would need to use off-chain signing or the Safe SignMessage contract
    Logger.warn("Safe message signing requires on-chain approval");

    // For now, return a placeholder
    // In production, this would integrate with Safe's signing infrastructure
    const messageStr =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    throw new Error(
      `Safe message signing not implemented. Message: ${messageStr.substring(0, 50)}...`,
    );
  }

  /**
   * Convert Safe info to unified accounts
   * @returns Array of unified accounts
   */
  private toUnifiedAccounts(): UnifiedAccount[] {
    if (!this.safeInfo) return [];

    const chainConfig = getEVMChainConfig(this.safeInfo.chainId as EVMChainId);

    return [
      {
        id: `safe-${this.safeInfo.chainId}-${this.safeInfo.safeAddress}`,
        address: this.safeInfo.safeAddress,
        chainType: "evm" as const,
        chainId: this.safeInfo.chainId,
        chainName: chainConfig?.name || "Unknown Chain",
        source: "Safe",
        name: `Safe (${this.safeInfo.threshold}/${this.safeInfo.owners.length})`,
      },
    ];
  }

  /**
   * Get Safe-specific information
   * @returns Safe info or null
   */
  getSafeInfo(): SafeInfo | null {
    return this.safeInfo;
  }

  /**
   * Check if the Safe is read-only
   * @returns True if cannot execute transactions
   */
  isReadOnly(): boolean {
    return this.safeInfo?.isReadOnly ?? true;
  }

  /**
   * Get Safe owners
   * @returns Array of owner addresses
   */
  getOwners(): string[] {
    return this.safeInfo?.owners ?? [];
  }

  /**
   * Get confirmation threshold
   * @returns Number of required confirmations
   */
  getThreshold(): number {
    return this.safeInfo?.threshold ?? 0;
  }
}

/**
 * Create a Safe provider instance if in Safe context
 * @returns SafeProvider if in Safe App, null otherwise
 */
export function createSafeProvider(): SafeProvider | null {
  const provider = new SafeProvider();
  return provider.isInSafeContext() ? provider : null;
}

/**
 * Check if running in Safe App context
 * Utility function for conditional logic
 * @returns True if in Safe context
 */
export function isInSafeAppContext(): boolean {
  const provider = new SafeProvider();
  return provider.isInSafeContext();
}
