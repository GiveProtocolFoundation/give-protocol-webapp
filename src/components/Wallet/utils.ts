/**
 * Wallet utility functions for Give Protocol
 * Provides address formatting, gradient generation, and explorer URL helpers
 */

/**
 * Gradient color pairs for wallet avatars
 */
const AVATAR_GRADIENTS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a8edea", "#fed6e3"],
  ["#5ee7df", "#b490ca"],
  ["#d299c2", "#fef9d7"],
] as const;

/**
 * Generate a gradient based on wallet address hash
 * @param address - The wallet address to generate gradient from
 * @returns CSS linear-gradient string
 */
export function getAddressGradient(address: string): string {
  if (!address || address.length < 4) {
    return `linear-gradient(135deg, ${AVATAR_GRADIENTS[0][0]}, ${AVATAR_GRADIENTS[0][1]})`;
  }
  const index =
    Number.parseInt(address.slice(2, 4), 16) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg, ${AVATAR_GRADIENTS[index][0]}, ${AVATAR_GRADIENTS[index][1]})`;
}

/**
 * Format address for display with truncation
 * @param address - The wallet address to format
 * @param variant - 'short' (6...4) or 'medium' (8...6); ignored for addresses 12 chars or shorter
 * @returns Formatted address string
 */
export function formatAddress(
  address: string,
  variant: "short" | "medium" = "short",
): string {
  if (!address) return "";
  if (address.length <= 12) return address;

  if (variant === "short") {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Network explorer URL configuration
 */
const EXPLORER_URLS: Record<string, string> = {
  polkadot: "https://polkadot.subscan.io/account/",
  kusama: "https://kusama.subscan.io/account/",
  moonbeam: "https://moonbeam.moonscan.io/address/",
  moonbase: "https://moonbase.moonscan.io/address/",
  base: "https://basescan.org/address/",
  "base-sepolia": "https://sepolia.basescan.org/address/",
  optimism: "https://optimistic.etherscan.io/address/",
  "optimism-sepolia": "https://sepolia-optimistic.etherscan.io/address/",
  "solana-mainnet": "https://explorer.solana.com/address/",
};

/**
 * Get the explorer URL for a given network and address
 * @param network - The network identifier
 * @param address - The wallet address
 * @returns Full explorer URL
 */
export function getExplorerUrl(network: string, address: string): string {
  const baseUrl = EXPLORER_URLS[network] || EXPLORER_URLS.moonbase;
  return `${baseUrl}${address}`;
}

/**
 * Network display names
 */
export const NETWORK_NAMES: Record<string, string> = {
  polkadot: "Polkadot",
  kusama: "Kusama",
  moonbeam: "Moonbeam",
  moonbase: "Moonbase Alpha",
  base: "Base",
  "base-sepolia": "Base Sepolia",
  optimism: "Optimism",
  "optimism-sepolia": "OP Sepolia",
  "solana-mainnet": "Solana",
};

/**
 * Network token symbols
 */
export const NETWORK_TOKENS: Record<string, string> = {
  polkadot: "DOT",
  kusama: "KSM",
  moonbeam: "GLMR",
  moonbase: "DEV",
  base: "ETH",
  "base-sepolia": "ETH",
  optimism: "ETH",
  "optimism-sepolia": "ETH",
  "solana-mainnet": "SOL",
};

/**
 * Wallet provider display names
 */
export const PROVIDER_NAMES: Record<string, string> = {
  "polkadot-js": "Polkadot.js",
  talisman: "Talisman",
  subwallet: "SubWallet",
  nova: "Nova Wallet",
  metamask: "MetaMask",
};

/**
 * Format balance with appropriate decimal places
 * @param balance - The balance string or number
 * @param decimals - Number of decimal places to show
 * @returns Formatted balance string
 */
export function formatBalance(
  balance: string | number | undefined,
  decimals = 4,
): string {
  if (balance === undefined || balance === null || balance === "") {
    return "0.0000";
  }
  const num =
    typeof balance === "string" ? Number.parseFloat(balance) : balance;
  if (Number.isNaN(num)) return "0.0000";
  return num.toFixed(decimals);
}

/**
 * Format USD value with currency symbol
 * @param value - The USD value
 * @returns Formatted USD string
 */
export function formatUsdValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "$0.00";
  }
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Copy text to clipboard with fallback
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      textArea.remove();
    }
  }
}
