/**
 * Wallets module exports for Give Protocol
 * Unified access to adapters and providers for multi-chain wallet support
 */

// Chain Adapters
export {
  EVMAdapter,
  createEVMAdapter,
  isEIP1193Provider,
  EVM_ERROR_CODES,
  SolanaAdapter,
  createSolanaAdapter,
  isSolanaProvider,
} from "./adapters";

// Wallet Providers
export {
  MetaMaskProvider,
  createMetaMaskProvider,
  RabbyProvider,
  createRabbyProvider,
  PhantomProvider,
  createPhantomProvider,
  CoinbaseProvider,
  createCoinbaseProvider,
  SafeProvider,
  createSafeProvider,
  isInSafeAppContext,
  LedgerProvider,
  createLedgerProvider,
  supportsLedgerConnection,
} from "./providers";
