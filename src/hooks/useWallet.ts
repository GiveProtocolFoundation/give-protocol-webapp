import { useMemo } from "react";
import { Logger } from "@/utils/logger";
import { CHAIN_IDS } from "@/config/contracts";
import type {
  UnifiedWalletProvider,
  WalletCategory,
  ChainType,
} from "@/types/wallet";
import {
  MetaMaskProvider,
  RabbyProvider,
  PhantomProvider,
  CoinbaseProvider,
  LedgerProvider,
  createSafeProvider,
} from "@/lib/wallets";

/** Normalized interface for interacting with a connected wallet provider. */
export interface WalletProvider {
  name: string;
  icon: string;
  provider: unknown; // The underlying EIP-1193 provider
  isInstalled: () => boolean;
  isConnected: (_address: string) => Promise<boolean>; // Prefixed as unused in interface
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  switchChain: (_chainId: number | string) => Promise<void>;
}

/**
 * Base class for EVM-compatible wallet providers
 * @class EVMWalletBase
 * @implements {WalletProvider}
 * @description Provides common functionality for Ethereum Virtual Machine compatible wallets.
 * Handles connection, disconnection, chain switching, and account management for EVM wallets.
 * @example
 * ```typescript
 * class CustomWallet extends EVMWalletBase {
 *   constructor() {
 *     super('Custom', 'custom-icon', window.ethereum);
 *   }
 * }
 * ```
 */
class EVMWalletBase implements WalletProvider {
  readonly name: string;
  readonly icon: string;
  readonly provider: unknown;
  private disconnectionAttempts = 0;
  private chainParams: Record<number, unknown> | null = null;

  /**
   * Captures the wallet display metadata and the underlying EIP-1193 provider reference.
   * @param name - Human-readable wallet name (e.g. "MetaMask").
   * @param icon - Identifier used to look up the wallet's icon asset.
   * @param provider - The injected provider object exposed by the wallet, or `null` if absent.
   */
  constructor(name: string, icon: string, provider: unknown) {
    this.name = name;
    this.icon = icon;
    this.provider = provider;
  }

  /** Check whether the wallet extension is available in the browser */
  isInstalled(): boolean {
    return Boolean(this.provider);
  }

  /** Check whether the given address is currently connected */
  async isConnected(address: string): Promise<boolean> {
    try {
      if (!this.provider || typeof this.provider.request !== "function") {
        return false;
      }
      const accounts = await this.provider.request({ method: "eth_accounts" });
      return accounts?.includes(address) || false;
    } catch {
      return false;
    }
  }

  /** Request account access and return the connected address */
  async connect(): Promise<string> {
    try {
      if (!this.provider || typeof this.provider.request !== "function") {
        throw new Error(`${this.name} provider not found`);
      }
      const accounts = await this.provider.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("No accounts found");
      }

      return accounts[0];
    } catch (error) {
      Logger.error(`${this.name} connection failed`, { error });
      throw error;
    }
  }

  /** Disconnect the wallet (no-op for most EVM wallets) */
  disconnect(): Promise<void> {
    this.disconnectionAttempts++;
    // Most EVM wallets don't have a disconnect method
    return Promise.resolve();
  }

  /** Switch the wallet to the specified chain, adding it if necessary */
  async switchChain(chainId: number): Promise<void> {
    try {
      if (!this.provider || typeof this.provider.request !== "function") {
        throw new Error(`${this.name} provider not found`);
      }
      await this.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: unknown) {
      const errorCode =
        typeof error === "object" && error !== null
          ? (error as { code?: number }).code
          : undefined;

      if (errorCode === 4902) {
        // Chain not added, add it
        await this.addChain(chainId);
      } else {
        throw error;
      }
    }
  }

  /** Add a new chain to the wallet via wallet_addEthereumChain */
  protected async addChain(chainId: number): Promise<void> {
    const chainParams = this.getChainParams(chainId);
    if (!chainParams) throw new Error("Unsupported chain");

    if (
      !this.provider ||
      typeof (this.provider as { request?: unknown }).request !== "function"
    ) {
      throw new Error(`${this.name} provider not found`);
    }

    await (
      this.provider as {
        request: (_args: {
          method: string;
          params?: unknown[];
        }) => Promise<unknown>;
      }
    ).request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
  }

  /** Look up the RPC/explorer config for a supported chain ID */
  protected getChainParams(chainId: number) {
    if (!this.chainParams) {
      this.chainParams = {};
    }
    const chains = {
      // Base
      [CHAIN_IDS.BASE_SEPOLIA]: {
        chainId: `0x${CHAIN_IDS.BASE_SEPOLIA.toString(16)}`,
        chainName: "Base Sepolia",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://sepolia.base.org"],
        blockExplorerUrls: ["https://sepolia.basescan.org/"],
      },
      [CHAIN_IDS.BASE]: {
        chainId: `0x${CHAIN_IDS.BASE.toString(16)}`,
        chainName: "Base",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://mainnet.base.org"],
        blockExplorerUrls: ["https://basescan.org/"],
      },
      // Optimism
      [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
        chainId: `0x${CHAIN_IDS.OPTIMISM_SEPOLIA.toString(16)}`,
        chainName: "Optimism Sepolia",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://sepolia.optimism.io"],
        blockExplorerUrls: ["https://sepolia-optimistic.etherscan.io/"],
      },
      [CHAIN_IDS.OPTIMISM]: {
        chainId: `0x${CHAIN_IDS.OPTIMISM.toString(16)}`,
        chainName: "Optimism",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://mainnet.optimism.io"],
        blockExplorerUrls: ["https://optimistic.etherscan.io/"],
      },
    };
    return chains[chainId as keyof typeof chains];
  }
}

/**
 * MetaMask wallet provider implementation
 * @class MetaMaskWallet
 * @extends EVMWalletBase
 * @description Integrates with MetaMask browser extension for Ethereum transactions.
 * Provides MetaMask-specific functionality including connection management and chain switching.
 * @example
 * ```typescript
 * const metamask = new MetaMaskWallet();
 * if (metamask.isInstalled()) {
 *   const address = await metamask.connect();
 *   console.log('Connected to:', address);
 * }
 * ```
 */
class MetaMaskWallet extends EVMWalletBase {
  private installationChecks = 0;

  /**
   * Initializes the wallet with the MetaMask-injected `window.ethereum` provider when available.
   */
  constructor() {
    super(
      "MetaMask",
      "metamask",
      typeof window !== "undefined" && window.ethereum?.isMetaMask
        ? window.ethereum
        : null,
    );
  }

  /** Check whether MetaMask extension is available */
  isInstalled(): boolean {
    this.installationChecks++;
    if (typeof window === "undefined") return false;
    return Boolean(window.ethereum?.isMetaMask);
  }
}

/**
 * WalletConnect provider implementation
 * @class WalletConnect
 * @implements {WalletProvider}
 * @description Integrates with WalletConnect protocol for mobile wallet connections.
 * Supports connecting any WalletConnect-compatible wallet via QR code or deep link.
 * @example
 * ```typescript
 * const walletConnect = new WalletConnect();
 * const address = await walletConnect.connect();
 * await walletConnect.switchChain(8453); // Base
 * ```
 */
class WalletConnect implements WalletProvider {
  readonly name = "WalletConnect";
  readonly icon = "walletconnect";
  readonly provider: unknown = null;
  private connectionAttempts = 0;

  /**
   * Reports installation status; WalletConnect is protocol-based and always considered available.
   * @returns Always `true` for WalletConnect.
   */
  isInstalled(): boolean {
    // WalletConnect is always available as it doesn't require installation
    // Using readonly property to satisfy 'this' requirement
    return Boolean(this.name);
  }

  /** Check WalletConnect session status (stub) */
  isConnected(_address: string): Promise<boolean> {
    // Implementation would check WalletConnect session
    this.connectionAttempts++;
    return Promise.resolve(false);
  }

  /** Initialize WalletConnect session (not yet implemented) */
  connect(): Promise<string> {
    this.connectionAttempts++;
    // In a real implementation, this would initialize WalletConnect
    return Promise.reject(new Error("WalletConnect integration pending"));
  }

  /**
   * Terminates the WalletConnect session. Currently a stub that resolves immediately.
   */
  disconnect(): Promise<void> {
    // WalletConnect disconnect would be implemented here
    this.connectionAttempts++;
    return Promise.resolve();
  }

  /** Request chain switch via WalletConnect (stub) */
  switchChain(_chainId: number | string): Promise<void> {
    Logger.info("WalletConnect chain switch requested", {
      chainId: _chainId,
      provider: this.provider,
      connectionAttempts: this.connectionAttempts,
    });
    return Promise.resolve();
  }
}

/**
 * Nova Wallet provider implementation
 * @class NovaWallet
 * @extends EVMWalletBase
 * @description Integrates with Nova Wallet for EVM chains.
 * Nova is a mobile-first multi-chain wallet with EVM support.
 * @example
 * ```typescript
 * const nova = new NovaWallet();
 * if (nova.isInstalled()) {
 *   const address = await nova.connect();
 *   await nova.switchChain(8453); // Base
 * }
 * ```
 */
class NovaWallet extends EVMWalletBase {
  private installationChecks = 0;

  /**
   * Initializes the wallet with the Nova Wallet-injected `window.nova` provider when available.
   */
  constructor() {
    super(
      "Nova Wallet",
      "nova",
      typeof window !== "undefined" && window.nova ? window.nova : null,
    );
  }

  /** Check whether Nova Wallet is available */
  isInstalled(): boolean {
    this.installationChecks++;
    if (typeof window === "undefined") return false;
    return typeof window.nova !== "undefined";
  }
}

/**
 * Coinbase Wallet provider implementation
 * @class CoinbaseWallet
 * @extends EVMWalletBase
 * @description Integrates with Coinbase Wallet for Base ecosystem support.
 * Coinbase Wallet is recommended for Base chain users with seamless integration.
 * @example
 * ```typescript
 * const coinbase = new CoinbaseWallet();
 * if (coinbase.isInstalled()) {
 *   const address = await coinbase.connect();
 *   await coinbase.switchChain(8453); // Base
 * }
 * ```
 */
class CoinbaseWallet extends EVMWalletBase {
  private installationChecks = 0;

  /**
   * Initializes the wallet by selecting the Coinbase Wallet provider exposed at
   * `window.coinbaseWalletExtension` or as `window.ethereum` with the `isCoinbaseWallet` flag.
   */
  constructor() {
    // Coinbase Wallet injects as window.ethereum with isCoinbaseWallet flag
    // or as window.coinbaseWalletExtension
    const isClient = typeof window !== "undefined";
    const coinbaseEthereum =
      isClient && window.ethereum?.isCoinbaseWallet ? window.ethereum : null;
    const provider = isClient
      ? window.coinbaseWalletExtension || coinbaseEthereum
      : null;

    super("Coinbase Wallet", "coinbase", provider);
  }

  /** Check whether Coinbase Wallet extension is available */
  isInstalled(): boolean {
    this.installationChecks++;
    if (typeof window === "undefined") return false;
    return Boolean(
      window.coinbaseWalletExtension || window.ethereum?.isCoinbaseWallet,
    );
  }
}

/**
 * React hook for managing multiple cryptocurrency wallets
 * @function useWallet
 * @description Provides access to various wallet providers including MetaMask, Coinbase, Tally, and Brave.
 * Returns utilities for discovering installed wallets and accessing wallet instances for connection management.
 * @returns {Object} Object containing wallet management utilities
 * @returns {Function} returns.getInstalledWallets - Function that returns array of installed wallet providers
 * @returns {WalletProvider[]} returns.wallets - Array of all available wallet providers
 * @example
 * ```tsx
 * function WalletSelector() {
 *   const { getInstalledWallets, wallets } = useWallet();
 *   const installedWallets = getInstalledWallets();
 *
 *   return (
 *     <div>
 *       {installedWallets.map(wallet => (
 *         <button key={wallet.name} onClick={() => wallet.connect()}>
 *           Connect {wallet.name}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet() {
  const wallets: WalletProvider[] = [
    new MetaMaskWallet(),
    new CoinbaseWallet(),
    new WalletConnect(),
    new NovaWallet(),
  ];

  /** Return only wallets whose browser extension is detected */
  const getInstalledWallets = () => {
    return wallets.filter((wallet) => wallet.isInstalled());
  };

  return {
    getInstalledWallets,
    wallets,
  };
}

/**
 * Hook for unified multi-chain wallet providers
 * Provides access to new wallet providers with multi-chain support
 * @returns Object containing unified wallet providers
 */
export function useUnifiedWallets() {
  const unifiedWallets = useMemo<UnifiedWalletProvider[]>(() => {
    const wallets: UnifiedWalletProvider[] = [];

    // Browser wallets (EVM-only)
    const metamask = new MetaMaskProvider();
    wallets.push(metamask);

    const rabby = new RabbyProvider();
    wallets.push(rabby);

    // Multi-chain wallets - always add them so they show in the UI
    const phantom = new PhantomProvider();
    wallets.push(phantom);

    const coinbase = new CoinbaseProvider();
    wallets.push(coinbase);

    // Hardware wallet - always available (connects via USB/Bluetooth)
    const ledger = new LedgerProvider();
    wallets.push(ledger);

    // Smart wallet (Safe) - only show if in Safe App iframe context
    const safe = createSafeProvider();
    if (safe) {
      wallets.push(safe);
    }

    return wallets;
  }, []);

  /**
   * Get wallets by category
   * @param category - Wallet category to filter by
   * @returns Array of wallets in the category
   */
  const getWalletsByCategory = (
    category: WalletCategory,
  ): UnifiedWalletProvider[] => {
    return unifiedWallets.filter((w) => w.category === category);
  };

  /**
   * Get wallets that support a specific chain type
   * @param chainType - Chain type to filter by
   * @returns Array of wallets supporting the chain type
   */
  const getWalletsByChainType = (
    chainType: ChainType,
  ): UnifiedWalletProvider[] => {
    return unifiedWallets.filter((w) =>
      w.supportedChainTypes.includes(chainType),
    );
  };

  /**
   * Get all available unified wallets
   * @returns Array of all unified wallet providers
   */
  const getAllWallets = (): UnifiedWalletProvider[] => {
    return unifiedWallets;
  };

  /**
   * Check if Safe wallet is available (running in Safe App context)
   * @returns True if in Safe context
   */
  const isSafeAvailable = (): boolean => {
    return unifiedWallets.some((w) => w.name === "Safe");
  };

  return {
    wallets: unifiedWallets,
    getWalletsByCategory,
    getWalletsByChainType,
    getAllWallets,
    isSafeAvailable,
  };
}
