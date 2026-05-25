/**
 * Multi-chain wallet type definitions for Give Protocol
 * Provides unified interfaces for EVM, Solana, and Polkadot chains
 */

/**
 * Supported blockchain types
 */
export type ChainType = "evm" | "solana" | "polkadot";

/**
 * Wallet category for UI grouping
 */
export type WalletCategory = "browser" | "multichain" | "hardware" | "institutional";

/**
 * Unified account representation across all chain types
 */
export interface UnifiedAccount {
  /** Unique identifier for the account */
  id: string;
  /** Account address (format varies by chain type) */
  address: string;
  /** Type of blockchain this account belongs to */
  chainType: ChainType;
  /** Chain ID (number for EVM, string for Solana/Polkadot) */
  chainId: number | string;
  /** Human-readable chain name */
  chainName: string;
  /** Wallet source (e.g., "Phantom", "Talisman") */
  source: string;
  /** Optional account name from wallet */
  name?: string;
}

/**
 * Unified transaction request across chain types
 */
export interface UnifiedTransactionRequest {
  /** Type of chain for this transaction */
  chainType: ChainType;
  /** Chain ID */
  chainId: number | string;
  /** Recipient address */
  to: string;
  /** Transaction value (native currency) */
  value?: string;
  /** Transaction data (EVM) or instructions (Solana) */
  data?: string | Uint8Array;
  /** Gas limit (EVM only) */
  gasLimit?: string;
  /** Gas price (EVM only) */
  gasPrice?: string;
  /** Solana-specific transaction object */
  solanaTransaction?: unknown;
  /** Polkadot-specific extrinsic */
  polkadotExtrinsic?: unknown;
}

/**
 * Unified wallet provider interface for multi-chain support
 */
export interface UnifiedWalletProvider {
  /** Wallet display name */
  name: string;
  /** Icon identifier for the wallet */
  icon: string;
  /** Wallet category for UI grouping */
  category: WalletCategory;
  /** Chain types this wallet supports */
  supportedChainTypes: ChainType[];
  /** Underlying provider objects by chain type */
  providers: {
    evm?: unknown;
    solana?: unknown;
    polkadot?: unknown;
  };

  /**
   * Check if the wallet extension is installed
   * @returns True if wallet is available
   */
  isInstalled(): boolean;

  /**
   * Connect to the wallet
   * @param chainType - Optional chain type to connect (defaults to primary)
   * @returns Array of connected accounts
   */
  connect(_chainType?: ChainType): Promise<UnifiedAccount[]>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Get currently connected accounts
   * @param _chainType - Optional chain type filter
   * @returns Array of accounts
   */
  getAccounts(_chainType?: ChainType): Promise<UnifiedAccount[]>;

  /**
   * Switch to a different chain
   * @param _chainId - Target chain ID
   * @param _chainType - Chain type
   */
  switchChain(_chainId: number | string, _chainType: ChainType): Promise<void>;

  /**
   * Sign a transaction
   * @param _tx - Unified transaction request
   * @returns Signed transaction hash or signature
   */
  signTransaction(_tx: UnifiedTransactionRequest): Promise<string>;

  /**
   * Sign a message
   * @param _message - Message to sign
   * @param _chainType - Chain type for signing
   * @returns Signature
   */
  signMessage(_message: string | Uint8Array, _chainType: ChainType): Promise<string>;
}

/**
 * Wallet connection state
 */
export interface WalletConnectionState {
  /** Currently connected wallet provider */
  wallet: UnifiedWalletProvider | null;
  /** Connected accounts */
  accounts: UnifiedAccount[];
  /** Primary active account */
  activeAccount: UnifiedAccount | null;
  /** Currently selected chain type */
  activeChainType: ChainType;
  /** Connection status */
  isConnected: boolean;
  /** Connection in progress */
  isConnecting: boolean;
  /** Connection error */
  error: Error | null;
}

/**
 * Multi-chain context actions
 */
export interface MultiChainActions {
  /** Connect to a wallet */
  connect: (_wallet: UnifiedWalletProvider, _chainType?: ChainType) => Promise<void>;
  /** Disconnect from current wallet */
  disconnect: () => Promise<void>;
  /** Switch active account */
  switchAccount: (_account: UnifiedAccount) => void;
  /** Switch chain type */
  switchChainType: (_chainType: ChainType) => void;
  /** Switch to specific chain */
  switchChain: (_chainId: number | string, _chainType: ChainType) => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Complete multi-chain context type
 */
export type MultiChainContextType = WalletConnectionState & MultiChainActions;
