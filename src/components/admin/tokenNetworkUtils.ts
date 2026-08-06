/**
 * Token & Network utility types, constants, and serialisation helpers
 * used by both the admin TokenNetworkSettings component and its tests.
 */

import {
  CHAIN_CONFIGS,
  CONTRACT_ADDRESSES,
  SUPPORTED_CHAIN_IDS,
} from "@/config/contracts";
import type { PlatformConfigValue } from "@/types/adminPlatformConfig";

// ─── Network registry ─────────────────────────────────────────────────────────

/** A network row shown in the admin settings, with availability status. */
export interface AdminNetworkOption {
  chainId: number;
  name: string;
  ecosystem: string;
  /** True when the donation flow is integrated for this chain */
  available: boolean;
  /** Shown when the network cannot be enabled yet */
  unavailableReason?: string;
}

/**
 * Check if a chain has a donation contract address configured (non-empty env var).
 * @param chainId - The chain ID to check
 * @returns True if the DONATION contract address is set
 */
function hasDeployedContracts(chainId: number): boolean {
  const addresses =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return Boolean(addresses?.DONATION);
}

/**
 * Full list of networks shown in the admin Token & Network tab: all integrated
 * mainnet chains from the contract registry. Availability is derived from
 * whether the DONATION contract address env var is set for that chain.
 */
export const NETWORK_OPTIONS: AdminNetworkOption[] = SUPPORTED_CHAIN_IDS.map(
  (id) => {
    const config = CHAIN_CONFIGS[id];
    const available = hasDeployedContracts(id);
    return {
      chainId: config.id,
      name: config.name,
      ecosystem: config.ecosystem,
      available,
      ...(!available && {
        unavailableReason: "Donation contracts not deployed",
      }),
    };
  },
);

// ─── Token registry ───────────────────────────────────────────────────────────

/** A token row shown in the admin settings. */
export interface AdminTokenOption {
  symbol: string;
  name: string;
}

/**
 * Tokens the donation flow supports across integrated chains
 * (union of the per-chain mainnet token lists plus non-EVM natives).
 */
export const TOKEN_OPTIONS: AdminTokenOption[] = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "WETH", name: "Wrapped Ether" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether USD" },
  { symbol: "DAI", name: "Dai Stablecoin" },
  { symbol: "OP", name: "Optimism" },
  { symbol: "ARB", name: "Arbitrum" },
  { symbol: "POL", name: "POL (Polygon)" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "WAVAX", name: "Wrapped AVAX" },
  { symbol: "SOL", name: "Solana" },
];

// ─── Value parsing / serialisation ────────────────────────────────────────────

/**
 * Parses a stored supported_networks value into the set of enabled chain IDs.
 * Accepts the canonical `[{chainId, name}]` shape plus legacy string/number
 * array shapes (matched by name against the network registry).
 * @param value - Raw platform_config value for supported_networks
 * @returns Set of enabled chain IDs
 */
export function parseEnabledChainIds(value?: PlatformConfigValue): Set<number> {
  const ids = new Set<number>();
  if (!Array.isArray(value)) return ids;
  for (const item of value) {
    if (typeof item === "number") {
      ids.add(item);
    } else if (typeof item === "string") {
      const match = NETWORK_OPTIONS.find(
        (n) => n.name.toLowerCase() === item.toLowerCase(),
      );
      if (match !== undefined) ids.add(match.chainId);
    } else if (
      item !== null &&
      typeof item === "object" &&
      typeof (item as { chainId?: unknown }).chainId === "number"
    ) {
      ids.add((item as { chainId: number }).chainId);
    }
  }
  return ids;
}

/**
 * Parses a stored supported_tokens value into a set of token symbols.
 * @param value - Raw platform_config value for supported_tokens
 * @returns Set of enabled token symbols (uppercased)
 */
export function parseEnabledTokens(
  value: PlatformConfigValue | undefined,
): Set<string> {
  const symbols = new Set<string>();
  if (!Array.isArray(value)) return symbols;
  for (const item of value) {
    if (typeof item === "string" && item.length > 0) {
      symbols.add(item.toUpperCase());
    }
  }
  return symbols;
}

/**
 * Serialises a set of enabled chain IDs into the canonical stored shape.
 * @param enabled - Set of enabled chain IDs
 * @returns Array of `{chainId, name}` entries ordered like the registry
 */
export function serializeEnabledNetworks(
  enabled: Set<number>,
): Array<{ chainId: number; name: string }> {
  return NETWORK_OPTIONS.filter((n) => enabled.has(n.chainId)).map((n) => ({
    chainId: n.chainId,
    name: n.name,
  }));
}
