/**
 * MultiChainContext - Unified multi-chain wallet state management
 * Provides a single source of truth for EVM and Solana connections
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from "react";
import { Logger } from "@/utils/logger";
import type {
  ChainType,
  UnifiedAccount,
  UnifiedWalletProvider,
  MultiChainContextType,
  UnifiedTransactionRequest,
} from "@/types/wallet";
import { DEFAULT_EVM_CHAIN_ID } from "@/config/chains";

const STORAGE_KEY = "giveprotocol_multichain_state";

/**
 * Persisted state interface
 */
interface PersistedState {
  activeChainType: ChainType;
  lastWalletName: string | null;
  lastAccountId: string | null;
}

/**
 * Load persisted state from localStorage
 * @returns Persisted state or defaults
 */
function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return {
      activeChainType: "evm",
      lastWalletName: null,
      lastAccountId: null,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PersistedState;
    }
  } catch (error) {
    Logger.warn("Failed to load multichain state", { error });
  }

  return {
    activeChainType: "evm",
    lastWalletName: null,
    lastAccountId: null,
  };
}

/**
 * Save state to localStorage
 * @param state - State to persist
 */
function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    Logger.warn("Failed to save multichain state", { error });
  }
}

const MultiChainContext = createContext<MultiChainContextType | undefined>();

/**
 * MultiChain Provider Props
 */
interface MultiChainProviderProps {
  children: React.ReactNode;
}

/**
 * MultiChain Provider Component
 * Manages unified wallet connections across EVM and Solana chains
 * @param children - Child components
 */
export function MultiChainProvider({ children }: MultiChainProviderProps) {
  // Initialize with SSR-safe defaults; hydrate from localStorage in useEffect
  const [wallet, setWallet] = useState<UnifiedWalletProvider | null>(null);
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UnifiedAccount | null>(
    null,
  );
  const [activeChainType, setActiveChainType] = useState<ChainType>("evm");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Hydrate chain type from localStorage after mount
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted.activeChainType !== "evm") {
      startTransition(() => {
        setActiveChainType(persisted.activeChainType);
      });
    }
  }, []);

  // Refs for avoiding stale closures
  const walletRef = useRef<UnifiedWalletProvider | null>(null);
  const isConnectingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  // Persist state changes
  useEffect(() => {
    savePersistedState({
      activeChainType,
      lastWalletName: wallet?.name ?? null,
      lastAccountId: activeAccount?.id ?? null,
    });
  }, [activeChainType, wallet?.name, activeAccount?.id]);

  /**
   * Connect to a wallet provider
   * @param walletProvider - Wallet provider to connect
   * @param chainType - Optional chain type to connect
   */
  const connect = useCallback(
    async (walletProvider: UnifiedWalletProvider, chainType?: ChainType) => {
      if (isConnectingRef.current) {
        Logger.warn("Connection already in progress");
        return;
      }

      try {
        setIsConnecting(true);
        isConnectingRef.current = true;
        setError(null);

        const targetChainType = chainType || activeChainType;

        // Verify wallet supports the chain type
        if (!walletProvider.supportedChainTypes.includes(targetChainType)) {
          throw new Error(
            `${walletProvider.name} does not support ${targetChainType} chains`,
          );
        }

        // Clear disconnect flag since user is explicitly connecting
        try {
          localStorage.removeItem("giveprotocol_wallet_disconnected");
        } catch {
          // Ignore storage errors
        }

        // Connect to wallet
        const connectedAccounts = await walletProvider.connect(targetChainType);

        if (connectedAccounts.length === 0) {
          throw new Error("No accounts found");
        }

        // Update state
        setWallet(walletProvider);
        setAccounts(connectedAccounts);
        setActiveAccount(connectedAccounts[0]);
        setActiveChainType(targetChainType);

        Logger.info("MultiChain wallet connected", {
          wallet: walletProvider.name,
          chainType: targetChainType,
          accountCount: connectedAccounts.length,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect wallet";
        const connectError = new Error(message);
        setError(connectError);
        Logger.error("MultiChain connection failed", { error: err });
        throw connectError;
      } finally {
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    },
    [activeChainType],
  );

  /**
   * Disconnect from current wallet
   */
  const disconnect = useCallback(async () => {
    try {
      // Mark explicit disconnect to prevent auto-reconnect on page reload
      try {
        localStorage.setItem("giveprotocol_wallet_disconnected", "true");
      } catch {
        // Ignore storage errors
      }

      if (walletRef.current) {
        await walletRef.current.disconnect();
      }

      setWallet(null);
      setAccounts([]);
      setActiveAccount(null);
      setError(null);

      Logger.info("MultiChain wallet disconnected");
    } catch (err) {
      Logger.error("MultiChain disconnect failed", { error: err });
      // Still clear state even if disconnect fails
      setWallet(null);
      setAccounts([]);
      setActiveAccount(null);
    }
  }, []);

  /**
   * Switch active account
   * @param account - Account to switch to
   */
  const switchAccount = useCallback(
    (account: UnifiedAccount) => {
      // Verify account is in our list
      const found = accounts.find((a) => a.id === account.id);
      if (!found) {
        Logger.warn("Account not found in connected accounts", {
          accountId: account.id,
        });
        return;
      }

      setActiveAccount(account);
      Logger.info("Switched active account", {
        address: account.address,
        chainType: account.chainType,
      });
    },
    [accounts],
  );

  /**
   * Switch active chain type
   * @param chainType - Chain type to switch to
   */
  const switchChainType = useCallback(
    (chainType: ChainType) => {
      if (wallet && !wallet.supportedChainTypes.includes(chainType)) {
        Logger.warn("Current wallet does not support chain type", {
          wallet: wallet.name,
          chainType,
        });
        return;
      }

      setActiveChainType(chainType);
      Logger.info("Switched chain type", { chainType });

      // Find an account of the new chain type
      const accountOfType = accounts.find((a) => a.chainType === chainType);
      if (accountOfType) {
        setActiveAccount(accountOfType);
      }
    },
    [wallet, accounts],
  );

  /**
   * Switch to a specific chain
   * @param chainId - Target chain ID
   * @param chainType - Chain type
   */
  const switchChain = useCallback(
    async (chainId: number | string, chainType: ChainType) => {
      if (!wallet) {
        throw new Error("No wallet connected");
      }

      try {
        await wallet.switchChain(chainId, chainType);
        Logger.info("Switched chain", { chainId, chainType });

        // Refresh accounts after chain switch
        const newAccounts = await wallet.getAccounts(chainType);
        setAccounts(newAccounts);

        if (newAccounts.length > 0) {
          setActiveAccount(newAccounts[0]);
        }
      } catch (err) {
        Logger.error("Chain switch failed", { error: err });
        throw err;
      }
    },
    [wallet],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Build context value
  const contextValue = React.useMemo<MultiChainContextType>(
    () => ({
      // State
      wallet,
      accounts,
      activeAccount,
      activeChainType,
      isConnected: wallet !== null && activeAccount !== null,
      isConnecting,
      error,
      // Actions
      connect,
      disconnect,
      switchAccount,
      switchChainType,
      switchChain,
      clearError,
    }),
    [
      wallet,
      accounts,
      activeAccount,
      activeChainType,
      isConnecting,
      error,
      connect,
      disconnect,
      switchAccount,
      switchChainType,
      switchChain,
      clearError,
    ],
  );

  return (
    <MultiChainContext.Provider value={contextValue}>
      {children}
    </MultiChainContext.Provider>
  );
}

/**
 * Hook to access MultiChain context
 * @returns MultiChainContextType
 * @throws Error if used outside MultiChainProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMultiChainContext(): MultiChainContextType {
  const context = useContext(MultiChainContext);
  if (!context) {
    throw new Error(
      "useMultiChainContext must be used within a MultiChainProvider",
    );
  }
  return context;
}

/**
 * Helper hook to get EVM-specific state
 * For backward compatibility with existing EVM-only code
 * @returns EVM-specific wallet state
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMultiChainEVM() {
  const context = useMultiChainContext();

  const evmAccount =
    context.activeAccount?.chainType === "evm" ? context.activeAccount : null;

  const evmChainId = evmAccount?.chainId ?? DEFAULT_EVM_CHAIN_ID;

  return {
    address: evmAccount?.address ?? null,
    chainId: typeof evmChainId === "number" ? evmChainId : null,
    isConnected: evmAccount !== null,
    isConnecting: context.isConnecting,
    error: context.error,
    connect: context.connect,
    disconnect: context.disconnect,
    switchChain: (chainId: number) => context.switchChain(chainId, "evm"),
  };
}

/**
 * Helper hook to sign transactions
 * @returns Transaction signing function
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMultiChainSigner() {
  const { wallet, activeAccount, activeChainType } = useMultiChainContext();

  const signTransaction = useCallback(
    (tx: UnifiedTransactionRequest): Promise<string> => {
      if (!wallet) {
        throw new Error("No wallet connected");
      }
      return wallet.signTransaction(tx);
    },
    [wallet],
  );

  const signMessage = useCallback(
    (message: string | Uint8Array): Promise<string> => {
      if (!wallet) {
        throw new Error("No wallet connected");
      }
      return wallet.signMessage(message, activeChainType);
    },
    [wallet, activeChainType],
  );

  return {
    signTransaction,
    signMessage,
    activeAccount,
    activeChainType,
  };
}
