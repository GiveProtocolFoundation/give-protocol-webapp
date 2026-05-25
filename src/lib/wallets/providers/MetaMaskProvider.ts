/**
 * MetaMask Wallet Provider
 * EVM-only wallet with broad chain support
 */

import { BaseEVMProvider } from "./BaseEVMProvider";

/** Type for the ethereum provider with common wallet flags */
interface EthereumProvider {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  isBraveWallet?: boolean;
  providers?: EthereumProvider[];
  request: (_args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Find the real MetaMask provider, avoiding imposters like Phantom that also
 * set `isMetaMask = true` on `window.ethereum`.
 *
 * When multiple wallet extensions are installed, MetaMask places all providers
 * in `window.ethereum.providers[]`. We search that array for the entry that
 * has `isMetaMask` but none of the flags belonging to other wallets.
 *
 * @returns The genuine MetaMask provider, or null
 */
function findMetaMaskProvider(): EthereumProvider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;

  const ethereum = window.ethereum as EthereumProvider;

  // When multiple wallets are installed, check the providers array
  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    const real = ethereum.providers.find(
      (p) =>
        p.isMetaMask &&
        !p.isPhantom &&
        !p.isCoinbaseWallet &&
        !p.isRabby &&
        !p.isBraveWallet,
    );
    if (real) return real;
  }

  // Single provider: only return it if it's genuinely MetaMask, not an imposter
  if (
    ethereum.isMetaMask &&
    !(ethereum as EthereumProvider).isPhantom &&
    !(ethereum as EthereumProvider).isCoinbaseWallet
  ) {
    return ethereum;
  }

  return null;
}

/**
 * MetaMaskProvider - EVM-only browser wallet
 * The most popular browser extension wallet for Ethereum and EVM chains
 */
export class MetaMaskProvider extends BaseEVMProvider {
  readonly name = "MetaMask";
  readonly icon = "metamask";

  /**
   * Check if MetaMask is installed
   * @returns True if the genuine MetaMask extension is available
   */
  isInstalled(): boolean {
    if (this.supportedChainTypes.length === 0) return false;
    return findMetaMaskProvider() !== null;
  }

  /**
   * Get the genuine MetaMask EVM provider, filtering out imposters
   * @returns MetaMask provider or null
   */
  protected getEVMProvider(): unknown {
    if (!this.isInstalled()) return null;
    return findMetaMaskProvider();
  }
}

/**
 * Create a MetaMask provider instance
 * @returns MetaMaskProvider if available, null otherwise
 */
export function createMetaMaskProvider(): MetaMaskProvider | null {
  const provider = new MetaMaskProvider();
  return provider.isInstalled() ? provider : null;
}
