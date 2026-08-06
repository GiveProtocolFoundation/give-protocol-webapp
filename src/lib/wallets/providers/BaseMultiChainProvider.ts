/**
 * Base class for multi-chain wallet providers
 * Extracts shared logic from Phantom and Coinbase providers
 */

import { Logger } from "@/utils/logger";
import type {
  ChainType,
  UnifiedAccount,
  UnifiedWalletProvider,
  UnifiedTransactionRequest,
  WalletCategory,
} from "@/types/wallet";
import { EVMAdapter, isEIP1193Provider } from "../adapters/EVMAdapter";
import { DEFAULT_EVM_CHAIN_ID } from "@/config/chains";

/**
 * Common interface for secondary chain adapters (Solana)
 * SolanaAdapter satisfies this interface
 */
export interface SecondaryChainAdapter {
  disconnect(): Promise<void>;
  getAccounts(): Promise<UnifiedAccount[]>;
  signTransaction(_tx: UnifiedTransactionRequest): Promise<string>;
  signMessage(_message: string | Uint8Array): Promise<string>;
  switchCluster?(_clusterId: string): Promise<void>;
  switchChain?(_chainId: string): Promise<void>;
}

/**
 * BaseMultiChainProvider - Abstract base for wallets supporting EVM + one secondary chain
 * Implements: connect, connectEVM, disconnect, getAccounts, switchChain, signTransaction, signMessage
 */
export abstract class BaseMultiChainProvider implements UnifiedWalletProvider {
  abstract readonly name: string;
  abstract readonly icon: string;
  abstract readonly category: WalletCategory;
  abstract readonly supportedChainTypes: ChainType[];
  abstract get providers(): Record<string, unknown>;

  protected evmAdapter: EVMAdapter | null = null;
  protected connectedChainType: ChainType | null = null;

  /** The non-EVM chain type this provider supports (e.g., "solana") */
  protected abstract readonly secondaryChainType: ChainType;

  abstract isInstalled(): boolean;

  /** @returns The EVM provider object from the window */
  protected abstract getEVMProvider(): unknown;

  /** Connect the secondary chain and return accounts */
  protected abstract connectSecondary(): Promise<UnifiedAccount[]>;

  /** @returns The secondary adapter instance, or null if not connected */
  protected abstract getSecondaryAdapter(): SecondaryChainAdapter | null;

  /** Clears the secondary adapter reference (called during disconnect) */
  protected abstract clearSecondaryAdapter(): void;

  /** Default EVM chain ID for this provider. Override to change (e.g., Coinbase defaults to Base). */
  protected defaultEVMChainId: number = DEFAULT_EVM_CHAIN_ID;

  /**
   * Connect to the wallet
   * @param chainType - Chain type to connect (defaults to EVM)
   * @returns Array of connected accounts
   */
  async connect(chainType: ChainType = "evm"): Promise<UnifiedAccount[]> {
    if (!this.isInstalled()) {
      throw new Error(`${this.name} is not installed`);
    }

    const accounts: UnifiedAccount[] = [];

    try {
      if (chainType === "evm") {
        accounts.push(...(await this.connectEVM()));
        this.connectedChainType = "evm";
      }

      if (chainType === this.secondaryChainType) {
        accounts.push(...(await this.connectSecondary()));
        this.connectedChainType = this.secondaryChainType;
      }

      if (accounts.length === 0) {
        throw new Error("No accounts connected");
      }

      Logger.info(`${this.name} connected`, {
        chainType,
        accountCount: accounts.length,
      });

      return accounts;
    } catch (error) {
      Logger.error(`${this.name} connection failed`, { error, chainType });
      throw error;
    }
  }

  /**
   * Connect to the EVM provider
   * @returns Array of EVM accounts
   */
  protected async connectEVM(): Promise<UnifiedAccount[]> {
    const evmProvider = this.getEVMProvider();
    if (!evmProvider || !isEIP1193Provider(evmProvider)) {
      throw new Error(`${this.name} EVM provider not available`);
    }

    this.evmAdapter = new EVMAdapter(evmProvider);
    return await this.evmAdapter.connect(this.defaultEVMChainId);
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.evmAdapter) {
        await this.evmAdapter.disconnect();
        this.evmAdapter = null;
      }

      const secondary = this.getSecondaryAdapter();
      if (secondary) {
        await secondary.disconnect();
        this.clearSecondaryAdapter();
      }

      this.connectedChainType = null;
      Logger.info(`${this.name} disconnected`);
    } catch (error) {
      Logger.error(`${this.name} disconnect failed`, { error });
      throw error;
    }
  }

  /**
   * Get accounts from the wallet
   * @param chainType - Optional chain type filter
   * @returns Array of accounts
   */
  async getAccounts(chainType?: ChainType): Promise<UnifiedAccount[]> {
    const accounts: UnifiedAccount[] = [];

    if ((!chainType || chainType === "evm") && this.evmAdapter) {
      const evmAccounts = await this.evmAdapter.getAccounts();
      accounts.push(...evmAccounts);
    }

    const secondary = this.getSecondaryAdapter();
    if ((!chainType || chainType === this.secondaryChainType) && secondary) {
      const secondaryAccounts = await secondary.getAccounts();
      accounts.push(...secondaryAccounts);
    }

    return accounts;
  }

  /**
   * Switch to a different chain
   * @param chainId - Target chain ID
   * @param chainType - Chain type
   */
  async switchChain(
    chainId: number | string,
    chainType: ChainType,
  ): Promise<void> {
    if (chainType === "evm" && this.evmAdapter) {
      await this.evmAdapter.switchChain(chainId as number);
    } else if (chainType === this.secondaryChainType) {
      await this.switchSecondaryChain(chainId);
    } else {
      throw new Error(`Cannot switch chain for ${chainType}`);
    }
  }

  /**
   * Switch the secondary chain. Override in subclasses that need different behavior.
   * @param chainId - Target chain ID
   */
  protected async switchSecondaryChain(
    chainId: number | string,
  ): Promise<void> {
    const secondary = this.getSecondaryAdapter();
    if (!secondary) {
      throw new Error(`Cannot switch chain for ${this.secondaryChainType}`);
    }
    if (secondary.switchCluster) {
      await secondary.switchCluster(chainId as string);
    } else if (secondary.switchChain) {
      await secondary.switchChain(chainId as string);
    }
  }

  /**
   * Sign a transaction
   * @param tx - Transaction request
   * @returns Transaction hash or signature
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (tx.chainType === "evm" && this.evmAdapter) {
      return await this.evmAdapter.signTransaction(tx);
    }

    const secondary = this.getSecondaryAdapter();
    if (tx.chainType === this.secondaryChainType && secondary) {
      return await secondary.signTransaction(tx);
    }

    throw new Error(`Cannot sign transaction for ${tx.chainType}`);
  }

  /**
   * Sign a message
   * @param message - Message to sign
   * @param chainType - Chain type for signing
   * @returns Signature
   */
  async signMessage(
    message: string | Uint8Array,
    chainType: ChainType,
  ): Promise<string> {
    if (chainType === "evm" && this.evmAdapter) {
      return await this.evmAdapter.signMessage(message);
    }

    const secondary = this.getSecondaryAdapter();
    if (chainType === this.secondaryChainType && secondary) {
      return await secondary.signMessage(message);
    }

    throw new Error(`Cannot sign message for ${chainType}`);
  }
}
