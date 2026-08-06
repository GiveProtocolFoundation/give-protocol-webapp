/// <reference types="vite/client" />
/* eslint-disable no-unused-vars */

/** EIP-1193 compatible provider interface */
interface EIP1193Provider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  request: (_args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (_event: string, _callback: (..._args: unknown[]) => void) => void;
  removeListener: (
    _event: string,
    _callback: (..._args: unknown[]) => void,
  ) => void;
  removeAllListeners: (_event: string) => void;
  disconnect?: () => Promise<void>;
}

/** Solana wallet standard interface */
interface SolanaWalletProvider {
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  publicKey: { toBase58(): string } | null;
  isConnected: boolean;
  connect: (_opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (_transaction: unknown) => Promise<unknown>;
  signAllTransactions: (_transactions: unknown[]) => Promise<unknown[]>;
  signMessage: (_message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  on: (_event: string, _callback: (..._args: unknown[]) => void) => void;
  off: (_event: string, _callback: (..._args: unknown[]) => void) => void;
}

interface Window {
  /** Google Analytics gtag command queue (set by index.html; optional — absent in SSR/tests without the script) */
  gtag?: (...args: unknown[]) => void;
  /** GA4 data layer */
  dataLayer?: unknown[];
  /** MetaMask and generic EVM providers */
  ethereum?: EIP1193Provider;
  /** Coinbase Wallet extension */
  coinbaseWalletExtension?: EIP1193Provider;
  /** Nova Wallet provider */
  nova?: EIP1193Provider;
  /** Phantom wallet (multi-chain) */
  phantom?: {
    ethereum?: EIP1193Provider;
    solana?: SolanaWalletProvider;
  };
  /** Solana wallet providers */
  solana?: SolanaWalletProvider;
  solflare?: SolanaWalletProvider;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_DOMAIN: string;
  readonly VITE_DONATION_CONTRACT_ADDRESS: string;
  readonly VITE_TOKEN_CONTRACT_ADDRESS: string;
  readonly VITE_VERIFICATION_CONTRACT_ADDRESS: string;
  readonly VITE_DISTRIBUTION_CONTRACT_ADDRESS: string;
  readonly VITE_NETWORK: string;
  readonly VITE_NETWORK_ENDPOINT: string;
  readonly VITE_ENABLE_GOOGLE_AUTH: string;
  readonly VITE_ENABLE_MAGIC_LINKS: string;
  readonly VITE_MAX_LOGIN_ATTEMPTS: string;
  readonly VITE_LOGIN_COOLDOWN_MINUTES: string;
  readonly VITE_CACHE_TTL_MINUTES: string;
  readonly VITE_API_TIMEOUT_MS: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ANALYTICS_SAMPLE_RATE: string;
  readonly VITE_MONITORING_API_KEY?: string;
  readonly VITE_MONITORING_APP_ID?: string;
  readonly VITE_MONITORING_ENVIRONMENT?: string;
  readonly VITE_MONITORING_ENABLED_MONITORS?: string;
  readonly VITE_MONITORING_ENDPOINT?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BASE_RPC_URL?: string;
  readonly VITE_OPTIMISM_RPC_URL?: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
  readonly VITE_OPTIMISM_SEPOLIA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
