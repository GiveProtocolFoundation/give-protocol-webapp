/**
 * TypeScript interfaces for Give Protocol wallet components
 */

import type { RefObject } from "react";

/**
 * Supported wallet provider types
 */
export type WalletProviderType =
  | "nova"
  | "metamask";

/**
 * Supported network types
 */
export type NetworkType =
  | "ethereum"
  | "base"
  | "optimism"
  | "arbitrum"
  | "polygon"
  | "avalanche"
  | "base-sepolia"
  | "optimism-sepolia"
  | "solana-mainnet";

/**
 * Wallet balance information
 */
export interface WalletBalances {
  /** Native token balance (ETH, etc.) */
  native?: string;
  /** Total USD value of all balances */
  usdValue?: string;
  /** Loading state for balance fetching */
  isLoading?: boolean;
}

/**
 * Props for the main WalletButton component
 */
export interface WalletButtonProps {
  /** Connected wallet address */
  address: string;
  /** Wallet provider being used */
  provider: WalletProviderType;
  /** Current network */
  network: NetworkType;
  /** Callback when user disconnects wallet */
  onDisconnect: () => void;
  /** Callback when user wants to switch accounts */
  onSwitchAccount: () => void;
  /** Callback when network is changed */
  onNetworkChange: (_network: NetworkType) => void;
  /** Number of pending transactions (optional) */
  pendingTxCount?: number;
  /** Wallet balances (optional - will fetch if not provided) */
  balances?: WalletBalances;
  /** Additional CSS classes */
  className?: string;
  /** Whether multiple accounts are available for switching */
  hasMultipleAccounts?: boolean;
  /** True when the wallet is connected but the user is NOT signed in to an
   *  account. Drives a "Guest" label on the button, surfaces a "Sign In"
   *  menu item, and hides the "Account Settings" link (which is gated
   *  behind auth and would bounce a guest to /auth). Defaults to false. */
  isGuest?: boolean;
}

/**
 * Internal state for WalletButton component
 */
export interface WalletButtonState {
  /** Whether dropdown menu is open */
  isDropdownOpen: boolean;
  /** Whether address was recently copied */
  copied: boolean;
  /** Number of pending transactions */
  pendingTransactions: number;
  /** Wallet balances */
  balances: WalletBalances;
}

/**
 * Props for the WalletDropdown component
 */
export interface WalletDropdownProps {
  /** Connected wallet address */
  address: string;
  /** Wallet provider name */
  provider: WalletProviderType;
  /** Current network */
  network: NetworkType;
  /** Wallet balances */
  balances: WalletBalances;
  /** Whether address was recently copied */
  copied: boolean;
  /** Callback when copy button is clicked */
  onCopy: () => void;
  /** Callback when disconnect is clicked */
  onDisconnect: () => void;
  /** Callback when switch account is clicked */
  onSwitchAccount: () => void;
  /** Callback when settings is clicked */
  onSettings: () => void;
  /** Whether multiple accounts are available */
  hasMultipleAccounts?: boolean;
  /** Reference to anchor element for positioning (used with Portal) */
  anchorRef?: RefObject<HTMLElement>;
  /** True when the wallet is connected as a guest (not signed in). Replaces
   *  "Account Settings" with "Sign In". Defaults to false. */
  isGuest?: boolean;
  /** Callback when the guest user clicks "Sign In". Required when isGuest. */
  onSignIn?: () => void;
}

/**
 * Props for the NetworkSelector component
 */
export interface NetworkSelectorProps {
  /** Currently selected network */
  currentNetwork: NetworkType;
  /** Callback when network is changed */
  onNetworkChange: (_network: NetworkType) => void;
  /** Override displayed networks (defaults to all NETWORKS) */
  networks?: NetworkConfig[];
  /** Additional CSS classes */
  className?: string;
  /** Whether selector is disabled */
  disabled?: boolean;
}

/**
 * Network configuration for display
 */
export interface NetworkConfig {
  /** Network identifier */
  id: NetworkType;
  /** Display name */
  name: string;
  /** Token symbol */
  token: string;
  /** Network icon/color for display */
  color: string;
  /** Chain ecosystem type */
  chainType: "evm" | "solana";
}

/**
 * Available networks configuration
 */
export const NETWORKS: NetworkConfig[] = [
  // EVM Mainnets
  {
    id: "ethereum",
    name: "Ethereum",
    token: "ETH",
    color: "#627EEA",
    chainType: "evm",
  },
  {
    id: "base",
    name: "Base",
    token: "ETH",
    color: "#0052FF",
    chainType: "evm",
  },
  {
    id: "optimism",
    name: "Optimism",
    token: "ETH",
    color: "#FF0420",
    chainType: "evm",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    token: "ETH",
    color: "#28A0F0",
    chainType: "evm",
  },
  {
    id: "polygon",
    name: "Polygon",
    token: "POL",
    color: "#8247E5",
    chainType: "evm",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    token: "AVAX",
    color: "#E84142",
    chainType: "evm",
  },
  // EVM Testnets
  {
    id: "base-sepolia",
    name: "Base Sepolia",
    token: "ETH",
    color: "#0052FF",
    chainType: "evm",
  },
  {
    id: "optimism-sepolia",
    name: "OP Sepolia",
    token: "ETH",
    color: "#FF0420",
    chainType: "evm",
  },
  // Solana
  {
    id: "solana-mainnet",
    name: "Solana",
    token: "SOL",
    color: "#9945FF",
    chainType: "solana",
  },
];

/**
 * Props for WalletAvatar component
 */
export interface WalletAvatarProps {
  /** Wallet address for gradient generation */
  address: string;
  /** Size of avatar in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for ConnectionStatus indicator
 */
export interface ConnectionStatusProps {
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Whether there's a pending connection */
  isPending?: boolean;
  /** Size of indicator ('sm' | 'md') */
  size?: "sm" | "md";
}
