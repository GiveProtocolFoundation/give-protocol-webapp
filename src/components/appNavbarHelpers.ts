/**
 * Pure(-ish) helpers extracted from AppNavbar so the network-switching
 * branches can be unit-tested without mounting the full navbar.
 */

import type { NetworkType } from "./Wallet";

/** Subset of MultiChainContext that the network-switch helpers depend on. */
export interface MultiChainHandle {
  switchChainType: (_chainType: "evm" | "solana" | "polkadot") => void;
  switchChain: (_chainId: number | string, _chainType: string) => Promise<void>;
  activeChainType: string;
  wallet: unknown;
}

/** Dependencies that the helpers receive from the surrounding component. */
export interface NetworkSwitchDeps {
  evmChainIds: Partial<Record<NetworkType, number>>;
  isConnected: boolean;
  setNetwork: (_network: NetworkType) => void;
  switchChain: (_chainId: number) => Promise<void>;
  multiChain: MultiChainHandle;
}

/**
 * Switch to an EVM chain via Web3Context. When no chain id is configured
 * for the network or the wallet isn't connected, the helper falls back to
 * a local-only state update so the UI still reflects the user's choice.
 */
export async function switchEvmNetwork(
  network: NetworkType,
  deps: NetworkSwitchDeps,
): Promise<void> {
  const { evmChainIds, isConnected, setNetwork, switchChain, multiChain } =
    deps;
  const targetChainId = evmChainIds[network];
  if (!targetChainId || !isConnected) {
    setNetwork(network);
    return;
  }
  try {
    if (multiChain.activeChainType !== "evm") {
      multiChain.switchChainType("evm");
    }
    await switchChain(targetChainId);
    setNetwork(network);
  } catch (err) {
    console.error("Failed to switch network:", err);
  }
}

/** Switch the active chain type to Solana via MultiChainContext. */
export function switchSolanaNetwork(
  network: NetworkType,
  deps: Pick<NetworkSwitchDeps, "setNetwork" | "multiChain">,
): void {
  const { setNetwork, multiChain } = deps;
  try {
    multiChain.switchChainType("solana");
    setNetwork(network);
  } catch (err) {
    console.error("Failed to switch to Solana:", err);
  }
}

/**
 * Switch to a Polkadot/Kusama chain via MultiChainContext. When a wallet is
 * connected the helper also forwards the network id to multiChain.switchChain.
 */
export async function switchPolkadotNetwork(
  network: NetworkType,
  deps: Pick<NetworkSwitchDeps, "setNetwork" | "multiChain">,
): Promise<void> {
  const { setNetwork, multiChain } = deps;
  try {
    multiChain.switchChainType("polkadot");
    if (multiChain.wallet) {
      await multiChain.switchChain(network, "polkadot");
    }
    setNetwork(network);
  } catch (err) {
    console.error("Failed to switch to Polkadot network:", err);
  }
}
