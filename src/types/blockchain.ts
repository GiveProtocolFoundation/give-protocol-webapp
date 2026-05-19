
/** Numeric chain/network identifier. */
export type NetworkId = number;
/** Hex-encoded transaction hash. */
export type TransactionHash = string;
/** Block height as an integer. */
export type BlockNumber = number;
/** Token amount represented as a decimal string to avoid floating-point errors. */
export type TokenAmount = string;

/** Connection configuration for a blockchain network. */
export interface BlockchainConfig {
  readonly networkId: NetworkId;
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly explorer: string;
  readonly SUPPORTED_NETWORKS: readonly NetworkId[];
}

/** A blockchain transaction record. */
export interface Transaction {
  hash: TransactionHash;
  from: string;
  to: string;
  value: TokenAmount;
  blockNumber: BlockNumber;
  timestamp: number;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
}

/** Lifecycle state of a blockchain transaction. */
export type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed';

// Note: Unused types removed to improve code quality
// If these types are needed in the future, they can be re-added:
// - TransactionReceipt
// - TransactionEvent
// - IWeb3Provider (renamed from Web3Provider to avoid naming conflict with React component)

/** Parameters for constructing and sending a transaction. */
export interface TransactionRequest {
  to: string;
  value: TokenAmount;
  data?: string;
  gasLimit?: string;
  nonce?: number;
}

/** Cached token price entry fetched from a price API. */
export interface TokenPrice {
  /** Token ID (usually CoinGecko ID) */
  tokenId: string;
  /** Price in target currency */
  price: number;
  /** Currency code (e.g., "usd", "eur") */
  currency: string;
  /** Timestamp of price fetch */
  timestamp: number;
}

/** In-memory price cache keyed by token ID with a last-update timestamp. */
export interface PriceCache {
  /** Cached prices by token ID */
  prices: Record<string, TokenPrice>;
  /** Last update timestamp */
  lastUpdate: number;
}

/** Options for formatting token or fiat currency values. */
export interface CurrencyFormatOptions {
  /** Show currency symbol */
  showSymbol?: boolean;
  /** Number of decimal places */
  decimals?: number;
  /** Use compact notation (K, M, B) */
  compact?: boolean;
}
