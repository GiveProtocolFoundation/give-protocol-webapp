/**
 * Solana Chain Adapter for Give Protocol
 * Wraps @solana/web3.js for Solana blockchain interactions
 */

import { Logger } from "@/utils/logger";
import {
  getSolanaClusterConfig,
  isSolanaClusterSupported,
  DEFAULT_SOLANA_CLUSTER,
  type SolanaClusterId,
} from "@/config/chains";
import type { UnifiedAccount, UnifiedTransactionRequest } from "@/types/wallet";

/**
 * Solana wallet provider interface (matches window.solana)
 */
interface SolanaProvider {
  publicKey: { toBase58(): string } | null;
  isConnected: boolean;
  connect: (
    _opts?: { onlyIfTrusted?: boolean }
  ) => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (_transaction: unknown) => Promise<unknown>;
  signAllTransactions: (_transactions: unknown[]) => Promise<unknown[]>;
  signMessage: (_message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  on: (_event: string, _callback: (..._args: unknown[]) => void) => void;
  off: (_event: string, _callback: (..._args: unknown[]) => void) => void;
}

/**
 * Type guard for Solana provider
 * @param provider - Provider to check
 * @returns True if provider has Solana wallet interface
 */
export function isSolanaProvider(provider: unknown): provider is SolanaProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    typeof (provider as SolanaProvider).connect === "function" &&
    typeof (provider as SolanaProvider).signMessage === "function"
  );
}

/**
 * Solana Chain Adapter
 * Provides unified interface for Solana blockchain operations
 */
export class SolanaAdapter {
  private readonly provider: SolanaProvider;
  private currentCluster: SolanaClusterId;
  private connectedAddress: string | null = null;

  /**
   * Wraps a Solana wallet provider with adapter state.
   * @param provider - The Solana wallet provider to wrap.
   * @param cluster - Initial Solana cluster (defaults to {@link DEFAULT_SOLANA_CLUSTER}).
   */
  constructor(provider: SolanaProvider, cluster: SolanaClusterId = DEFAULT_SOLANA_CLUSTER) {
    this.provider = provider;
    this.currentCluster = cluster;
  }

  /**
   * Get the underlying Solana provider
   * @returns Solana provider instance
   */
  getProvider(): SolanaProvider {
    return this.provider;
  }

  /**
   * Get current cluster
   * @returns Current Solana cluster ID
   */
  getCluster(): SolanaClusterId {
    return this.currentCluster;
  }

  /**
   * Check if wallet is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.provider.isConnected && this.provider.publicKey !== null;
  }

  /**
   * Connect to the Solana wallet
   * @param onlyIfTrusted - Only connect if already trusted (no popup)
   * @returns Array of connected accounts
   */
  async connect(onlyIfTrusted = false): Promise<UnifiedAccount[]> {
    try {
      const response = await this.provider.connect({ onlyIfTrusted });
      this.connectedAddress = response.publicKey.toBase58();

      Logger.info("Solana adapter connected", {
        address: this.connectedAddress,
        cluster: this.currentCluster,
      });

      return this.toUnifiedAccounts([this.connectedAddress]);
    } catch (error) {
      // If onlyIfTrusted fails, it means user hasn't trusted the app yet
      if (onlyIfTrusted) {
        Logger.info("Solana wallet not pre-authorized");
        return [];
      }
      Logger.error("Solana adapter connection failed", { error });
      throw error;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this.provider.disconnect();
      this.connectedAddress = null;
      Logger.info("Solana adapter disconnected");
    } catch (error) {
      Logger.error("Solana adapter disconnect failed", { error });
      throw error;
    }
  }

  /**
   * Get current accounts
   * @returns Array of connected accounts
   */
  getAccounts(): Promise<UnifiedAccount[]> {
    if (!this.provider.publicKey) {
      return Promise.resolve([]);
    }
    const address = this.provider.publicKey.toBase58();
    return Promise.resolve(this.toUnifiedAccounts([address]));
  }

  /**
   * Switch to a different Solana cluster
   * Note: Solana wallets typically don't support network switching via API
   * This updates the local cluster reference only
   * @param clusterId - Target cluster ID
   */
  switchCluster(clusterId: string): Promise<void> {
    if (!isSolanaClusterSupported(clusterId)) {
      throw new Error(`Unsupported Solana cluster: ${clusterId}`);
    }

    this.currentCluster = clusterId as SolanaClusterId;
    Logger.info("Switched Solana cluster (local)", { cluster: clusterId });

    // Note: Most Solana wallets require users to switch networks manually in the wallet UI
    // This adapter only tracks the intended cluster for RPC calls
    return Promise.resolve();
  }

  /**
   * Sign a transaction
   * @param tx - Transaction request
   * @returns Serialized signed transaction
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (tx.chainType !== "solana") {
      throw new Error("Transaction is not for Solana chain");
    }

    if (!tx.solanaTransaction) {
      throw new Error("Solana transaction object is required");
    }

    const signedTx = await this.provider.signTransaction(tx.solanaTransaction);
    Logger.info("Solana transaction signed");

    // Return serialized transaction
    // Note: The actual serialization depends on the transaction type
    return JSON.stringify(signedTx);
  }

  /**
   * Sign multiple transactions
   * @param transactions - Array of Solana transactions
   * @returns Array of signed transactions
   */
  async signAllTransactions(transactions: unknown[]): Promise<unknown[]> {
    const signedTxs = await this.provider.signAllTransactions(transactions);
    Logger.info("Solana transactions signed", { count: transactions.length });
    return signedTxs;
  }

  /**
   * Sign a message
   * @param message - Message to sign (Uint8Array)
   * @returns Base58 encoded signature
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageBytes =
      typeof message === "string" ? new TextEncoder().encode(message) : message;

    const { signature } = await this.provider.signMessage(messageBytes);
    Logger.info("Solana message signed");

    // Convert signature to base58
    return SolanaAdapter.bytesToBase58(signature);
  }

  /**
   * Setup event listeners
   * @param onConnect - Callback for connect events
   * @param onDisconnect - Callback for disconnect events
   * @param onAccountChange - Callback for account changes
   * @returns Cleanup function
   */
  setupEventListeners(
    onConnect: (_publicKey: string) => void,
    onDisconnect: () => void,
    onAccountChange: (_publicKey: string | null) => void
  ): () => void {
    /** Forwards connect event with base58 public key */
    const handleConnect = (publicKey: { toBase58(): string }) => {
      onConnect(publicKey.toBase58());
    };

    /** Forwards account change event with base58 public key or null */
    const handleAccountChange = (publicKey: { toBase58(): string } | null) => {
      onAccountChange(publicKey?.toBase58() || null);
    };

    this.provider.on("connect", handleConnect);
    this.provider.on("disconnect", onDisconnect);
    this.provider.on("accountChanged", handleAccountChange);

    return () => {
      this.provider.off("connect", handleConnect);
      this.provider.off("disconnect", onDisconnect);
      this.provider.off("accountChanged", handleAccountChange);
    };
  }

  /**
   * Convert raw addresses to unified accounts
   * @param addresses - Array of Solana addresses (base58)
   * @returns Array of unified accounts
   */
  private toUnifiedAccounts(addresses: string[]): UnifiedAccount[] {
    const clusterConfig = getSolanaClusterConfig(this.currentCluster);

    return addresses.map((address, index) => ({
      id: `solana-${this.currentCluster}-${address}`,
      address,
      chainType: "solana" as const,
      chainId: this.currentCluster,
      chainName: clusterConfig?.name || "Solana",
      source: "Solana",
      name: index === 0 ? "Primary Account" : `Account ${index + 1}`,
    }));
  }

  /**
   * Convert bytes to base58 string
   * Simple implementation for signature encoding
   * @param bytes - Bytes to encode
   * @returns Base58 encoded string
   */
  private static bytesToBase58(bytes: Uint8Array): string {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let result = "";
    let num = BigInt(0);

    for (const byte of bytes) {
      num = num * BigInt(256) + BigInt(byte);
    }

    while (num > 0) {
      result = ALPHABET[Number(num % BigInt(58))] + result;
      num = num / BigInt(58);
    }

    // Add leading zeros
    for (const byte of bytes) {
      if (byte === 0) {
        result = `1${result}`;
      } else {
        break;
      }
    }

    return result || "1";
  }
}

/**
 * Create a Solana adapter from a raw provider
 * @param provider - Solana wallet provider
 * @param cluster - Solana cluster to use
 * @returns SolanaAdapter instance or null
 */
export function createSolanaAdapter(
  provider: unknown,
  cluster?: SolanaClusterId
): SolanaAdapter | null {
  if (!isSolanaProvider(provider)) {
    return null;
  }
  return new SolanaAdapter(provider, cluster);
}
