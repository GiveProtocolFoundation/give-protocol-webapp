/**
 * Wallet Provider exports for Give Protocol
 * Unified access to all supported wallet providers
 */

// Base classes
export { BaseEVMProvider } from "./BaseEVMProvider";
export {
  BaseMultiChainProvider,
  type SecondaryChainAdapter,
} from "./BaseMultiChainProvider";

// MetaMask - EVM only
export { MetaMaskProvider, createMetaMaskProvider } from "./MetaMaskProvider";

// Rabby - EVM only (security-focused)
export { RabbyProvider, createRabbyProvider } from "./RabbyProvider";

// Phantom - EVM + Solana
export { PhantomProvider, createPhantomProvider } from "./PhantomProvider";

// Coinbase - EVM + Solana
export { CoinbaseProvider, createCoinbaseProvider } from "./CoinbaseProvider";

// Safe - EVM Smart Accounts
export {
  SafeProvider,
  createSafeProvider,
  isInSafeAppContext,
} from "./SafeProvider";

// Ledger - Hardware wallet via DMK
export {
  LedgerProvider,
  createLedgerProvider,
  supportsLedgerConnection,
} from "./LedgerProvider";
