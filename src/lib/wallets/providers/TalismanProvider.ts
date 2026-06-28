/**
 * Talisman Wallet Provider
 * Multi-chain wallet supporting EVM and Polkadot/Substrate chains
 */

import { Logger } from "@/utils/logger";
import type { ChainType, UnifiedAccount, WalletCategory } from "@/types/wallet";
import {
  PolkadotAdapter,
  enablePolkadotExtension,
} from "../adapters/PolkadotAdapter";
import {
  BaseMultiChainProvider,
  type SecondaryChainAdapter,
} from "./BaseMultiChainProvider";

const APP_NAME = "Give Protocol";

/**
 * TalismanProvider - Multi-chain wallet for EVM and Polkadot
 * Talisman is the leading Polkadot ecosystem wallet with full EVM support
 */
export class TalismanProvider extends BaseMultiChainProvider {
  readonly name = "Talisman";
  readonly icon = "talisman";
  readonly category: WalletCategory = "multichain";
  readonly supportedChainTypes: ChainType[] = ["evm", "polkadot"];

  private polkadotAdapter: PolkadotAdapter | null = null;

  protected readonly secondaryChainType: ChainType = "polkadot";

  /**
   * Get underlying provider objects
   */
  get providers() {
    return {
      evm: this.getEVMProvider(),
      polkadot: this.polkadotAdapter?.getExtension() ?? null,
    };
  }

  /** @returns The Polkadot adapter instance, or null if not connected */
  protected getSecondaryAdapter(): SecondaryChainAdapter | null {
    return this.polkadotAdapter;
  }

  /** Clears the Polkadot adapter reference during disconnect */
  protected clearSecondaryAdapter(): void {
    this.polkadotAdapter = null;
  }

  /**
   * Check if Talisman is installed
   * @returns True if Talisman extension is available
   */
  isInstalled(): boolean {
    if (this.supportedChainTypes.length === 0) return false;
    if (typeof window === "undefined") return false;

    // Check for Talisman EVM provider
    const hasTalismanEth = typeof window.talismanEth !== "undefined";

    // Check for Talisman Polkadot extension
    const injectedWeb3 = (window as { injectedWeb3?: Record<string, unknown> })
      .injectedWeb3;
    const hasTalismanSub = Boolean(injectedWeb3?.talisman);

    return hasTalismanEth || hasTalismanSub;
  }

  /**
   * Check if Talisman EVM is available
   * @returns True if Talisman EVM provider exists
   */
  hasEVMSupport(): boolean {
    if (!this.supportedChainTypes.includes("evm")) return false;
    return (
      typeof window !== "undefined" && typeof window.talismanEth !== "undefined"
    );
  }

  /**
   * Check if Talisman Polkadot is available
   * @returns True if Talisman Polkadot extension exists
   */
  hasPolkadotSupport(): boolean {
    if (!this.supportedChainTypes.includes("polkadot")) return false;
    if (typeof window === "undefined") return false;
    const injectedWeb3 = (window as { injectedWeb3?: Record<string, unknown> })
      .injectedWeb3;
    return Boolean(injectedWeb3?.talisman);
  }

  /**
   * Connect to Talisman wallet
   * Overrides base to add EVM/Polkadot support checks before connecting
   * @param chainType - Chain type to connect (defaults to EVM)
   * @returns Array of connected accounts
   */
  override async connect(
    chainType: ChainType = "evm",
  ): Promise<UnifiedAccount[]> {
    if (!this.isInstalled()) {
      throw new Error("Talisman wallet is not installed");
    }

    const accounts: UnifiedAccount[] = [];

    try {
      if (chainType === "evm") {
        if (!this.hasEVMSupport()) {
          throw new Error("Talisman EVM provider not available");
        }
        accounts.push(...(await this.connectEVM()));
        this.connectedChainType = "evm";
      }

      if (chainType === "polkadot") {
        if (!this.hasPolkadotSupport()) {
          throw new Error("Talisman Polkadot extension not available");
        }
        accounts.push(...(await this.connectSecondary()));
        this.connectedChainType = "polkadot";
      }

      if (accounts.length === 0) {
        throw new Error("No accounts connected");
      }

      Logger.info("Talisman connected", {
        chainType,
        accountCount: accounts.length,
      });

      return accounts;
    } catch (error) {
      // Talisman is installed but not onboarded — provide a clear message
      if (
        error instanceof Error &&
        error.message.includes("not been configured yet")
      ) {
        throw new Error(
          "Talisman needs to be set up first. Please complete its onboarding and refresh the page.",
        );
      }
      Logger.error("Talisman connection failed", { error, chainType });
      throw error;
    }
  }

  /**
   * Get Talisman EVM provider from window
   */
  protected getEVMProvider(): unknown {
    if (!this.isInstalled()) return null;
    return window.talismanEth ?? null;
  }

  /**
   * Connect to Talisman Polkadot extension
   * @returns Array of Polkadot accounts
   */
  protected async connectSecondary(): Promise<UnifiedAccount[]> {
    this.polkadotAdapter = await enablePolkadotExtension("talisman", APP_NAME);

    if (!this.polkadotAdapter) {
      throw new Error("Failed to enable Talisman Polkadot extension");
    }

    return this.polkadotAdapter.connect();
  }
}

/**
 * Create a Talisman provider instance
 * @returns TalismanProvider if available, null otherwise
 */
export function createTalismanProvider(): TalismanProvider | null {
  const provider = new TalismanProvider();
  return provider.isInstalled() ? provider : null;
}
