import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  startTransition,
} from "react";
import { ethers } from "ethers";
import { Logger } from "@/utils/logger";
import { type ChainId } from "@/config/contracts";
import { useChain } from "./ChainContext";
import { useMultiChainContext } from "./MultiChainContext";
import {
  isEIP1193Provider,
  hasErrorCode,
  hasErrorMessage,
  isEventObject,
  switchToChain,
} from "./web3ContextHelpers";
import type { UnifiedWalletProvider } from "@/types/wallet";

interface Web3ContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (_walletProvider?: unknown) => Promise<void>;
  disconnect: () => Promise<void>;
  error: Error | null;
  switchChain: (_chainId: number) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>();

/**
 * Web3 provider component that manages blockchain wallet connections and state
 * Handles MetaMask/wallet connections, chain switching, and account management
 * @param children - React components to wrap with Web3 context
 */
export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Get selected chain from ChainContext
  const { selectedChainId } = useChain();

  // MultiChainContext for syncing connection state
  const multiChain = useMultiChainContext();

  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentWalletProvider, setCurrentWalletProvider] = useState<
    unknown | null
  >(null);
  // Track if a connection is in progress to prevent race conditions with polling
  const isConnectingRef = React.useRef(false);
  // Track current address for polling to avoid stale closure issues
  const addressRef = React.useRef<string | null>(null);
  // Track whether current connection was synced from MultiChainContext
  const syncedFromMultiChainRef = React.useRef(false);

  // Keep refs in sync with state
  React.useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setAddress(null);
      setProvider(null);
      setSigner(null);
      setChainId(null);
      setCurrentWalletProvider(null);
      Logger.info("Wallet disconnected via accountsChanged event");
    } else {
      setAddress(accounts[0]);
      Logger.info("Account changed", { address: accounts[0] });
    }
  }, []);

  // Handle chain changes — refresh provider/signer instead of reloading page
  // Debounced to prevent MetaMask's rapid chainChanged event spam from
  // creating multiple providers and triggering cascading RPC calls
  const chainChangeTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handleChainChanged = useCallback(
    (chainIdHex: string) => {
      const newChainId = Number.parseInt(chainIdHex, 16);
      setChainId(newChainId);

      // Debounce provider rebuild — MetaMask fires chainChanged multiple times
      if (chainChangeTimerRef.current) {
        clearTimeout(chainChangeTimerRef.current);
      }
      chainChangeTimerRef.current = setTimeout(async () => {
        chainChangeTimerRef.current = null;
        Logger.info("Chain changed", { chainId: newChainId });

        // Rebuild ethers provider and signer for the new chain
        const walletProvider =
          currentWalletProvider ||
          (typeof window !== "undefined" ? window.ethereum : null);

        if (walletProvider && isEIP1193Provider(walletProvider)) {
          try {
            const newProvider = new ethers.BrowserProvider(
              walletProvider as ethers.Eip1193Provider,
            );
            const newSigner = await newProvider.getSigner();
            startTransition(() => {
              setProvider(newProvider);
              setSigner(newSigner);
            });
            Logger.info("Provider refreshed after chain change", {
              chainId: newChainId,
            });
          } catch (err) {
            Logger.error("Failed to refresh provider after chain change", {
              error: err,
            });
          }
        }
      }, 500);
    },
    [currentWalletProvider],
  );

  // Initialize provider and check for existing connection
  useEffect(() => {
    /** Check for existing wallet connection and restore provider state */
    const initProvider = async () => {
      // Don't auto-restore if user explicitly disconnected
      try {
        if (
          localStorage.getItem("giveprotocol_wallet_disconnected") === "true"
        ) {
          return;
        }
      } catch {
        // Ignore storage errors
      }

      // Only auto-restore if the user has previously connected a wallet.
      // Calling eth_accounts on some wallets (e.g. MetaMask in Comet browser)
      // triggers a connection popup even though the method is documented as
      // passive. Guard with an explicit "has connected before" flag so first-
      // time visitors never see an unsolicited wallet prompt.
      try {
        if (
          localStorage.getItem("giveprotocol_wallet_previously_connected") !==
          "true"
        ) {
          return;
        }
      } catch {
        // Ignore storage errors
      }

      // Skip auto-restore on auth pages — the user hasn't chosen a wallet yet,
      // and calling eth_accounts on window.ethereum can trigger Phantom's popup
      // when it has hijacked the global provider.
      if (window.location.pathname.startsWith("/auth")) {
        return;
      }

      if (typeof window.ethereum !== "undefined") {
        try {
          // Find a safe provider to query. Avoid the raw window.ethereum when
          // Phantom has overridden it, as even eth_accounts can trigger its UI.
          type ProviderLike = {
            isPhantom?: boolean;
            isMetaMask?: boolean;
            providers?: ProviderLike[];
            request: (_args: {
              method: string;
              params?: unknown[];
            }) => Promise<unknown>;
          };
          const ethereum = window.ethereum as ProviderLike;

          // If the top-level provider belongs to Phantom and there is no
          // providers[] array with a genuine MetaMask entry, skip auto-restore
          // entirely — the user must explicitly choose a wallet.
          let safeProvider: ProviderLike | null = null;
          if (
            Array.isArray(ethereum.providers) &&
            ethereum.providers.length > 0
          ) {
            safeProvider =
              ethereum.providers.find((p) => p.isMetaMask && !p.isPhantom) ??
              null;
          } else if (!ethereum.isPhantom) {
            safeProvider = ethereum;
          }

          if (!safeProvider) {
            Logger.info("Skipping auto-restore: no safe EVM provider found");
            return;
          }

          // Check if already connected (eth_accounts is passive — no popup)
          const accounts = (await safeProvider.request({
            method: "eth_accounts",
          })) as string[];
          if (accounts.length > 0) {
            const newProvider = new ethers.BrowserProvider(safeProvider);
            const newSigner = await newProvider.getSigner();
            const network = await newProvider.getNetwork();

            startTransition(() => {
              setProvider(newProvider);
              setSigner(newSigner);
              setAddress(accounts[0]);
              setChainId(Number(network.chainId));
              // Store the safe provider so event listeners use it instead of
              // falling back to the raw window.ethereum (which can be Phantom or
              // another injected provider that triggers unwanted UI in some browsers).
              setCurrentWalletProvider(safeProvider);
            });
            Logger.info("Restored existing connection", {
              address: accounts[0],
              chainId: network.chainId,
            });
          }
        } catch (err: unknown) {
          // Clear any existing connection state
          startTransition(() => {
            setProvider(null);
            setSigner(null);
            setAddress(null);
            setChainId(null);
          });

          // Handle unauthorized error specifically
          if (hasErrorMessage(err, "has not been authorized")) {
            const error = new Error(
              'Wallet connection needs authorization. Please click "Connect" to continue.',
            );
            startTransition(() => {
              setError(error);
            });
            Logger.info("Wallet needs reauthorization");
          } else {
            Logger.error("Failed to restore connection", { error: err });
          }
        }
      }
    };

    initProvider();
  }, []);

  // Sync Web3Context from MultiChainContext when it connects/disconnects.
  // This ensures all 39+ components using useWeb3() see the connection
  // established via the WalletModal → MultiChainContext flow.
  useEffect(() => {
    const evmAccount = multiChain.accounts.find((a) => a.chainType === "evm");

    if (multiChain.isConnected && multiChain.wallet && evmAccount) {
      const evmProvider = multiChain.wallet.providers.evm;
      if (!evmProvider || !isEIP1193Provider(evmProvider)) return;

      // Already synced with this address
      if (
        addressRef.current === evmAccount.address &&
        syncedFromMultiChainRef.current
      ) {
        return;
      }

      /** Sync Web3Context state from MultiChainContext EVM connection */
      const syncProvider = async () => {
        try {
          isConnectingRef.current = true;

          // Clear disconnect flag — user connected via MultiChain
          try {
            localStorage.removeItem("giveprotocol_wallet_disconnected");
          } catch {
            // Ignore storage errors
          }

          const ethersProvider = new ethers.BrowserProvider(
            evmProvider as ethers.Eip1193Provider,
          );
          const ethersSigner = await ethersProvider.getSigner();
          const network = await ethersProvider.getNetwork();

          startTransition(() => {
            setProvider(ethersProvider);
            setSigner(ethersSigner);
            setAddress(evmAccount.address);
            setChainId(Number(network.chainId));
            setCurrentWalletProvider(evmProvider);
            setError(null);
          });

          syncedFromMultiChainRef.current = true;
          Logger.info("Web3Context synced from MultiChainContext", {
            address: evmAccount.address,
            chainId: Number(network.chainId),
          });
        } catch (err) {
          Logger.error("Failed to sync Web3Context from MultiChainContext", {
            error: err,
          });
        } finally {
          isConnectingRef.current = false;
        }
      };

      syncProvider();
    } else if (!multiChain.isConnected && syncedFromMultiChainRef.current) {
      // MultiChain disconnected — clear only if we were synced from it
      startTransition(() => {
        setProvider(null);
        setSigner(null);
        setAddress(null);
        setChainId(null);
        setCurrentWalletProvider(null);
      });
      syncedFromMultiChainRef.current = false;
      Logger.info("Web3Context cleared after MultiChainContext disconnect");
    }
  }, [multiChain.isConnected, multiChain.wallet, multiChain.accounts]);

  // Set up event listeners
  useEffect(() => {
    // Only fall back to window.ethereum when the user has previously connected.
    // In some browsers (e.g. Comet) even subscribing to accountsChanged on
    // window.ethereum triggers a wallet connection popup. First-time visitors
    // have no prior connection state, so we skip event listeners entirely for
    // them — they'll get listeners registered once they explicitly connect and
    // currentWalletProvider is set.
    const hasPreviouslyConnected = (() => {
      try {
        return (
          localStorage.getItem("giveprotocol_wallet_previously_connected") ===
          "true"
        );
      } catch {
        return false;
      }
    })();

    const walletProvider =
      currentWalletProvider ||
      (hasPreviouslyConnected && typeof window !== "undefined"
        ? window.ethereum
        : null);
    if (!walletProvider || typeof walletProvider.on !== "function") return;

    /** Clear all connection state when wallet fires disconnect event */
    const handleDisconnect = () => {
      setProvider(null);
      setSigner(null);
      setAddress(null);
      setChainId(null);
      setCurrentWalletProvider(null);
    };

    walletProvider.on("accountsChanged", handleAccountsChanged);
    walletProvider.on("chainChanged", handleChainChanged);
    walletProvider.on("disconnect", handleDisconnect);

    // React cleanup functions return void/undefined by design
    // eslint-disable-next-line consistent-return
    return () => {
      walletProvider.removeListener?.("accountsChanged", handleAccountsChanged);
      walletProvider.removeListener?.("chainChanged", handleChainChanged);
      walletProvider.removeListener?.("disconnect", handleDisconnect);
    };
  }, [handleAccountsChanged, handleChainChanged, currentWalletProvider]);

  // Poll for account changes as a fallback (some wallets don't fire events reliably)
  useEffect(() => {
    // Only poll if we think we're connected
    if (!address) {
      return undefined;
    }

    const checkConnection = async () => {
      // Skip polling while a connection is in progress to avoid race conditions
      if (isConnectingRef.current) {
        return;
      }

      const walletProvider =
        currentWalletProvider ||
        (typeof window !== "undefined" ? window.ethereum : null);
      if (!walletProvider || typeof walletProvider.request !== "function")
        return;

      try {
        const accounts = await walletProvider.request({
          method: "eth_accounts",
        });
        // Use ref to get current address value, avoiding stale closure
        if (accounts.length === 0 && addressRef.current) {
          // Wallet was disconnected externally
          Logger.info("Wallet disconnected (detected via polling)");
          setAddress(null);
          setProvider(null);
          setSigner(null);
          setChainId(null);
          setCurrentWalletProvider(null);
        }
      } catch (err) {
        // Ignore errors during polling
        Logger.warn("Error polling wallet connection", { error: err });
      }
    };

    // Check every 10 seconds (reduced from 2s to limit re-renders)
    const intervalId = setInterval(checkConnection, 10000);

    return () => clearInterval(intervalId);
  }, [address, currentWalletProvider]);

  const switchChain = useCallback(
    async (targetChainId: number) => {
      const walletProvider =
        currentWalletProvider ||
        (typeof window !== "undefined" ? window.ethereum : null);
      if (!walletProvider) {
        throw new Error("No wallet provider found");
      }

      if (!isEIP1193Provider(walletProvider)) {
        throw new Error("Invalid wallet provider");
      }

      await switchToChain(walletProvider, targetChainId as ChainId);
    },
    [currentWalletProvider],
  );

  const connect = useCallback(
    async (_walletProvider?: unknown) => {
      if (isConnectingRef.current) {
        Logger.warn("Wallet connection already in progress, skipping");
        return;
      }

      // Resolve wallet provider (ignore events from onClick={connect})
      const defaultProvider =
        typeof window !== "undefined" ? window.ethereum : null;
      const walletProvider = isEventObject(_walletProvider)
        ? defaultProvider
        : _walletProvider || defaultProvider;

      if (!walletProvider) {
        const error = new Error(
          "No wallet provider found. Please install a wallet extension.",
        );
        Logger.error("Wallet provider not found", { error });
        setError(error);
        throw error;
      }

      if (!isEIP1193Provider(walletProvider)) {
        const error = new Error(
          "Wallet provider is not EIP-1193 compliant. Please try refreshing the page.",
        );
        Logger.error("Invalid wallet provider", {
          hasRequest: typeof (walletProvider as { request?: unknown }).request,
          providerType: typeof walletProvider,
        });
        setError(error);
        throw error;
      }

      try {
        setIsConnecting(true);
        isConnectingRef.current = true;
        setError(null);

        // Clear disconnect flag and record that user has connected at least once
        try {
          localStorage.removeItem("giveprotocol_wallet_disconnected");
          localStorage.setItem(
            "giveprotocol_wallet_previously_connected",
            "true",
          );
        } catch {
          // Ignore storage errors
        }

        // Request account access
        const accounts = (await walletProvider.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found");
        }

        // Check if we need to switch networks
        const initialProvider = new ethers.BrowserProvider(walletProvider);
        const initialNetwork = await initialProvider.getNetwork();
        const currentChainId = Number(initialNetwork.chainId);

        // Switch to selected chain if on wrong network
        if (currentChainId !== selectedChainId) {
          await switchToChain(walletProvider, selectedChainId);
        }

        // Create provider AFTER chain switch is complete
        const provider = new ethers.BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const finalNetwork = await provider.getNetwork();
        const finalChainId = Number(finalNetwork.chainId);

        // Set all state atomically after all operations succeed
        setProvider(provider);
        setSigner(signer);
        setCurrentWalletProvider(walletProvider);
        setChainId(finalChainId);
        setAddress(accounts[0]);

        Logger.info("Wallet connected successfully", {
          address: accounts[0],
          chainId: finalChainId,
        });
      } catch (err: unknown) {
        // Clear any partial state on error
        setProvider(null);
        setSigner(null);
        setCurrentWalletProvider(null);
        setChainId(null);
        setAddress(null);

        // Handle user rejected request
        if (hasErrorCode(err, 4001)) {
          const error = new Error("User rejected wallet connection");
          setError(error);
          throw error;
        }

        // Handle "already pending" request (-32002)
        if (hasErrorCode(err, -32002)) {
          const error = new Error(
            "A wallet connection request is already pending. Please check your wallet extension and approve or reject it first.",
          );
          setError(error);
          throw error;
        }

        // Handle other errors
        const message =
          err instanceof Error ? err.message : "Failed to connect wallet";
        const error = new Error(message);
        Logger.error("Wallet connection failed", { error });
        setError(error);
        throw error;
      } finally {
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    },
    [selectedChainId],
  );

  const disconnect = useCallback(async () => {
    try {
      // Mark explicit disconnect to prevent auto-reconnect on page reload
      try {
        localStorage.setItem("giveprotocol_wallet_disconnected", "true");
        localStorage.removeItem("giveprotocol_wallet_previously_connected");
      } catch {
        // Ignore storage errors
      }

      // Clear state immediately
      setProvider(null);
      setSigner(null);
      setAddress(null);
      setChainId(null);
      setError(null);
      setCurrentWalletProvider(null);

      // Most wallets don't have a disconnect method, but we can try various approaches
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Try the WalletConnect disconnect method if available
          if (typeof window.ethereum.disconnect === "function") {
            await window.ethereum.disconnect();
          }
          // Try to clear permissions (MetaMask)
          else if (typeof window.ethereum.request === "function") {
            try {
              await window.ethereum.request({
                method: "wallet_revokePermissions",
                params: [{ eth_accounts: {} }],
              });
            } catch (revokeError) {
              // Silently ignore if method doesn't exist
              Logger.info("Revoke permissions not supported", {
                error: revokeError,
              });
            }
          }
        } catch (walletError) {
          // Log but don't throw - state is already cleared
          Logger.info("Wallet-specific disconnect failed, but state cleared", {
            error: walletError,
          });
        }
      }

      Logger.info("Wallet disconnected successfully");
    } catch (err) {
      Logger.error("Error during wallet disconnect", { error: err });
      // Don't throw error - we still want to clear the state
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({
      provider,
      signer,
      address,
      chainId,
      isConnected: Boolean(address),
      isConnecting,
      connect,
      disconnect,
      error,
      switchChain,
    }),
    [
      provider,
      signer,
      address,
      chainId,
      isConnecting,
      connect,
      disconnect,
      error,
      switchChain,
    ],
  );

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
}

/**
 * Hook to access Web3 context for blockchain interactions
 * Provides wallet connection state, provider access, and connection methods
 * @returns Web3ContextType containing wallet state and blockchain interaction methods
 * @throws Error if used outside of Web3Provider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

/**
 * Bridge hook that uses MultiChainContext but provides Web3Context interface
 * Use this for new code that needs backward compatibility during migration
 * @returns Web3ContextType-compatible interface backed by MultiChainContext
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useWeb3MultiChain() {
  const multiChain = useMultiChainContext();

  // Only get EVM account
  const evmAccount = multiChain.accounts.find((a) => a.chainType === "evm");
  const chainId =
    evmAccount && typeof evmAccount.chainId === "number"
      ? evmAccount.chainId
      : null;

  // Create ethers provider from the unified wallet if available
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    /** Create ethers provider and signer from unified wallet EVM provider */
    const setupEthers = async () => {
      if (!multiChain.wallet?.providers.evm) {
        setProvider(null);
        setSigner(null);
        return;
      }

      try {
        const evmProvider = multiChain.wallet.providers.evm;
        if (isEIP1193Provider(evmProvider)) {
          const ethersProvider = new ethers.BrowserProvider(
            evmProvider as ethers.Eip1193Provider,
          );
          const ethersSigner = await ethersProvider.getSigner();
          setProvider(ethersProvider);
          setSigner(ethersSigner);
        }
      } catch (error) {
        Logger.error("Failed to setup ethers provider", { error });
        setProvider(null);
        setSigner(null);
      }
    };

    setupEthers();
  }, [multiChain.wallet?.providers.evm]);

  const connect = useCallback(
    async (walletProvider?: unknown) => {
      // If a wallet provider is passed, wrap it in a UnifiedWalletProvider
      if (walletProvider && isEIP1193Provider(walletProvider)) {
        // Create a minimal unified provider for backward compatibility
        const unifiedProvider: UnifiedWalletProvider = {
          name: "Legacy EVM Wallet",
          icon: "wallet",
          category: "browser",
          supportedChainTypes: ["evm"],
          providers: { evm: walletProvider },
          isInstalled: () => true,
          connect: async () => {
            const accounts = (await walletProvider.request({
              method: "eth_requestAccounts",
            })) as string[];
            return accounts.map((addr) => ({
              id: `evm-legacy-${addr}`,
              address: addr,
              chainType: "evm" as const,
              chainId: chainId || 1,
              chainName: "EVM",
              source: "Legacy",
            }));
          },
          disconnect: () => {
            // EVM wallets typically don't have disconnect
            return Promise.resolve();
          },
          getAccounts: () => Promise.resolve([]),
          switchChain: async (newChainId: number | string) => {
            await walletProvider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: `0x${Number(newChainId).toString(16)}` }],
            });
          },
          signTransaction: () => Promise.resolve(""),
          signMessage: () => Promise.resolve(""),
        };

        await multiChain.connect(unifiedProvider, "evm");
        return;
      }

      // No provider passed, throw error
      throw new Error("No wallet provider specified");
    },
    [multiChain, chainId],
  );

  const switchChain = useCallback(
    async (targetChainId: number) => {
      await multiChain.switchChain(targetChainId, "evm");
    },
    [multiChain],
  );

  return {
    provider,
    signer,
    address: evmAccount?.address ?? null,
    chainId,
    isConnected: evmAccount !== null,
    isConnecting: multiChain.isConnecting,
    connect,
    disconnect: multiChain.disconnect,
    error: multiChain.error,
    switchChain,
  };
}
