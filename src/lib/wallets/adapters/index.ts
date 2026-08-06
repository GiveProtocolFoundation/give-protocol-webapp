/**
 * Chain Adapter exports for Give Protocol
 * Unified access to EVM and Solana adapters
 */

// EVM Adapter
export {
  EVMAdapter,
  createEVMAdapter,
  isEIP1193Provider,
  EVM_ERROR_CODES,
} from "./EVMAdapter";

// Solana Adapter
export {
  SolanaAdapter,
  createSolanaAdapter,
  isSolanaProvider,
} from "./SolanaAdapter";
