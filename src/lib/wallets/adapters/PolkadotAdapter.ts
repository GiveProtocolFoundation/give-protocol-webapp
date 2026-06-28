/**
 * Polkadot Chain Adapter for Give Protocol
 * Wraps @polkadot/extension-dapp for Substrate blockchain interactions
 */

import { Logger } from "@/utils/logger";
import {
  getPolkadotChainConfig,
  isPolkadotChainSupported,
  DEFAULT_POLKADOT_CHAIN,
  type PolkadotChainId,
} from "@/config/chains";
import type { UnifiedAccount, UnifiedTransactionRequest } from "@/types/wallet";

/**
 * Polkadot injected account interface
 */
interface InjectedAccountWithMeta {
  address: string;
  meta: {
    name?: string;
    source: string;
    genesisHash?: string | null;
  };
  type?: string;
}

/**
 * Polkadot wallet extension interface
 */
interface PolkadotExtension {
  name: string;
  version: string;
  accounts: {
    get: (_anyType?: boolean) => Promise<InjectedAccountWithMeta[]>;
    subscribe: (
      _callback: (_accounts: InjectedAccountWithMeta[]) => void,
    ) => () => void;
  };
  signer: {
    signPayload: (_payload: unknown) => Promise<{ signature: string }>;
    signRaw: (_raw: {
      address: string;
      data: string;
      type: "bytes" | "payload";
    }) => Promise<{ signature: string }>;
  };
}

/**
 * Type guard for Polkadot extension
 * @param provider - Provider to check
 * @returns True if provider has Polkadot extension interface
 */
export function isPolkadotExtension(
  provider: unknown,
): provider is PolkadotExtension {
  return (
    typeof provider === "object" &&
    provider !== null &&
    typeof (provider as PolkadotExtension).accounts?.get === "function" &&
    typeof (provider as PolkadotExtension).signer?.signRaw === "function"
  );
}

/**
 * Polkadot Chain Adapter
 * Provides unified interface for Polkadot/Substrate blockchain operations
 */
export class PolkadotAdapter {
  private readonly extension: PolkadotExtension;
  private readonly extensionName: string;
  private currentChain: PolkadotChainId;
  private accounts: InjectedAccountWithMeta[] = [];
  private unsubscribe: (() => void) | null = null;

  /**
   * Wraps a Polkadot wallet extension with adapter state.
   * @param extension - The injected Polkadot extension to wrap.
   * @param extensionName - Human-readable extension identifier used in dApp authorization prompts.
   * @param chain - Initial chain selection (defaults to {@link DEFAULT_POLKADOT_CHAIN}).
   */
  constructor(
    extension: PolkadotExtension,
    extensionName: string,
    chain: PolkadotChainId = DEFAULT_POLKADOT_CHAIN,
  ) {
    this.extension = extension;
    this.extensionName = extensionName;
    this.currentChain = chain;
  }

  /**
   * Get the underlying extension
   * @returns Polkadot extension instance
   */
  getExtension(): PolkadotExtension {
    return this.extension;
  }

  /**
   * Get the extension name
   * @returns Extension name (e.g., "talisman", "subwallet-js")
   */
  getExtensionName(): string {
    return this.extensionName;
  }

  /**
   * Get current chain
   * @returns Current Polkadot chain ID
   */
  getChain(): PolkadotChainId {
    return this.currentChain;
  }

  /**
   * Check if connected (has accounts)
   * @returns True if has accounts
   */
  isConnected(): boolean {
    return this.accounts.length > 0;
  }

  /**
   * Connect to the Polkadot extension
   * Retrieves Substrate accounts from the extension (excludes EVM accounts)
   * @returns Array of connected accounts
   */
  async connect(): Promise<UnifiedAccount[]> {
    try {
      // Get accounts from extension and filter to Substrate-only
      const allAccounts = await this.extension.accounts.get(true);
      this.accounts = PolkadotAdapter.filterSubstrateAccounts(allAccounts);

      if (this.accounts.length === 0) {
        Logger.info("Polkadot extension has no Substrate accounts", {
          extension: this.extensionName,
          totalAccounts: allAccounts.length,
        });
        return [];
      }

      Logger.info("Polkadot adapter connected", {
        extension: this.extensionName,
        accountCount: this.accounts.length,
        chain: this.currentChain,
      });

      return this.toUnifiedAccounts(this.accounts);
    } catch (error) {
      Logger.error("Polkadot adapter connection failed", { error });
      throw error;
    }
  }

  /**
   * Disconnect from the extension
   */
  disconnect(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.accounts = [];
    Logger.info("Polkadot adapter disconnected");
    return Promise.resolve();
  }

  /**
   * Get current Substrate accounts
   * @returns Array of connected accounts (EVM accounts excluded)
   */
  async getAccounts(): Promise<UnifiedAccount[]> {
    // Refresh accounts from extension, filter to Substrate-only
    const allAccounts = await this.extension.accounts.get(true);
    this.accounts = PolkadotAdapter.filterSubstrateAccounts(allAccounts);
    return this.toUnifiedAccounts(this.accounts);
  }

  /**
   * Switch to a different Polkadot chain
   * @param chainId - Target chain ID
   */
  switchChain(chainId: string): Promise<void> {
    if (!isPolkadotChainSupported(chainId)) {
      throw new Error(`Unsupported Polkadot chain: ${chainId}`);
    }

    this.currentChain = chainId as PolkadotChainId;
    Logger.info("Switched Polkadot chain", { chain: chainId });

    // Note: Polkadot extensions support multiple chains simultaneously
    // The chain selection affects which RPC endpoint we use for transactions
    return Promise.resolve();
  }

  /**
   * Sign a transaction/extrinsic
   * @param tx - Transaction request
   * @returns Signed transaction signature
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (tx.chainType !== "polkadot") {
      throw new Error("Transaction is not for Polkadot chain");
    }

    if (!tx.polkadotExtrinsic) {
      throw new Error("Polkadot extrinsic is required");
    }

    // Use the signer to sign the payload
    const { signature } = await this.extension.signer.signPayload(
      tx.polkadotExtrinsic,
    );

    Logger.info("Polkadot extrinsic signed");
    return signature;
  }

  /**
   * Sign a raw message
   * @param message - Message to sign
   * @param address - Address to sign with
   * @returns Signature
   */
  async signMessage(
    message: string | Uint8Array,
    address?: string,
  ): Promise<string> {
    const signerAddress = address || this.accounts[0]?.address;
    if (!signerAddress) {
      throw new Error("No account available for signing");
    }

    const data =
      typeof message === "string"
        ? message
        : PolkadotAdapter.bytesToHex(message);

    const { signature } = await this.extension.signer.signRaw({
      address: signerAddress,
      data,
      type: "bytes",
    });

    Logger.info("Polkadot message signed");
    return signature;
  }

  /**
   * Subscribe to account changes
   * @param callback - Callback for account updates
   * @returns Cleanup function
   */
  subscribeAccounts(
    callback: (_accounts: UnifiedAccount[]) => void,
  ): () => void {
    /** Handles account changes from the Polkadot extension */
    const handleAccountsChanged = (accounts: InjectedAccountWithMeta[]) => {
      this.accounts = accounts;
      callback(this.toUnifiedAccounts(accounts));
    };

    this.unsubscribe = this.extension.accounts.subscribe(handleAccountsChanged);

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  /**
   * Convert injected accounts to unified accounts.
   * Assumes accounts are already filtered to Substrate-only.
   * @param accounts - Array of Substrate injected accounts
   * @returns Array of unified accounts
   */
  private toUnifiedAccounts(
    accounts: InjectedAccountWithMeta[],
  ): UnifiedAccount[] {
    const chainConfig = getPolkadotChainConfig(this.currentChain);

    return accounts.map((account) => ({
      id: `polkadot-${this.currentChain}-${account.address}`,
      address: account.address,
      chainType: "polkadot" as const,
      chainId: this.currentChain,
      chainName: chainConfig?.name || "Polkadot",
      source: account.meta?.source || this.extensionName,
      name: account.meta?.name,
    }));
  }

  /**
   * Filter to Substrate accounts only.
   * Multi-chain wallets (SubWallet) return both EVM and Substrate accounts.
   * @param accounts - All accounts from extension
   * @returns Only Substrate accounts (excludes 0x addresses and ethereum type)
   */
  private static filterSubstrateAccounts(
    accounts: InjectedAccountWithMeta[],
  ): InjectedAccountWithMeta[] {
    return accounts.filter(
      (account) =>
        !account.address.startsWith("0x") && account.type !== "ethereum",
    );
  }

  /**
   * Convert bytes to hex string
   * @param bytes - Bytes to encode
   * @returns Hex encoded string
   */
  private static bytesToHex(bytes: Uint8Array): string {
    return `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
}

/**
 * Enable a Polkadot wallet extension using @polkadot/extension-dapp.
 * This library handles browser-specific issues (Firefox DataCloneError, etc.)
 * and provides a normalized interface across extension versions.
 * @param extensionName - Name of the extension (e.g., "talisman", "subwallet-js")
 * @param appName - Name of this app (shown in extension popup)
 * @returns PolkadotAdapter instance or null
 */
export async function enablePolkadotExtension(
  extensionName: string,
  appName: string,
): Promise<PolkadotAdapter | null> {
  try {
    // Dynamic import to avoid SSR crashes — the module accesses window at top level
    const { web3Enable } = await import("@polkadot/extension-dapp");

    // Use @polkadot/extension-dapp which handles browser compatibility
    // (Firefox structured clone issues, extension messaging, etc.)
    const extensions = await web3Enable(appName);

    if (extensions.length === 0) {
      Logger.info("No Polkadot extensions enabled", { extensionName });
      return null;
    }

    // Find the specific extension by name
    const extension = extensions.find((ext) => ext.name === extensionName);

    if (!extension) {
      Logger.info("Polkadot extension not found or not authorized", {
        extensionName,
        availableExtensions: extensions.map((e) => e.name),
      });
      return null;
    }

    if (!isPolkadotExtension(extension)) {
      Logger.error("Invalid Polkadot extension interface", { extensionName });
      return null;
    }

    return new PolkadotAdapter(extension, extensionName);
  } catch (error) {
    Logger.error("Failed to enable Polkadot extension", {
      extensionName,
      error,
    });
    return null;
  }
}

/**
 * Get list of available Polkadot extensions
 * @returns Array of extension names
 */
export function getAvailablePolkadotExtensions(): string[] {
  const injectedWeb3 = (window as { injectedWeb3?: Record<string, unknown> })
    .injectedWeb3;

  if (!injectedWeb3) {
    return [];
  }

  return Object.keys(injectedWeb3);
}
