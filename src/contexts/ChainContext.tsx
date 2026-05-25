import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import {
  type ChainId,
  type ChainConfig,
  CHAIN_CONFIGS,
  DEFAULT_CHAIN_ID,
  getAvailableChains,
  isChainSupported,
} from "../config/contracts";
import { ENV } from "../config/env";

const STORAGE_KEY = "giveprotocol_selected_chain";

interface ChainContextType {
  /** Currently selected chain ID */
  selectedChainId: ChainId;
  /** Currently selected chain configuration */
  selectedChain: ChainConfig;
  /** All available chains (filtered by testnet setting) */
  availableChains: ChainConfig[];
  /** Whether testnets are shown */
  showTestnets: boolean;
  /** Switch to a different chain */
  selectChain: (_chainId: ChainId) => void;
  /** Check if a chain ID is supported */
  isSupported: (_chainId: number) => boolean;
  /** Get chain config by ID */
  getChain: (_chainId: ChainId) => ChainConfig | undefined;
}

const ChainContext = createContext<ChainContextType | undefined>();

/**
 * Hook to access chain context
 * @returns Chain context value
 * @throws Error if used outside ChainProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useChain = (): ChainContextType => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("useChain must be used within a ChainProvider");
  }
  return context;
};

interface ChainProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for chain selection state
 * @param props - Provider props
 * @param props.children - Child components
 * @returns Provider component
 */
export const ChainProvider: React.FC<ChainProviderProps> = ({ children }) => {
  // Determine if testnets should be shown
  const showTestnets = ENV.SHOW_TESTNETS;

  // Initialize with SSR-safe default; hydrate from localStorage in useEffect
  const [selectedChainId, setSelectedChainId] =
    useState<ChainId>(DEFAULT_CHAIN_ID);

  // Hydrate chain selection from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedId = Number.parseInt(stored, 10);
      if (isChainSupported(parsedId)) {
        startTransition(() => {
          setSelectedChainId(parsedId as ChainId);
        });
      }
    }
  }, []);

  // Get available chains based on testnet setting
  const availableChains = React.useMemo(
    () => getAvailableChains(showTestnets),
    [showTestnets],
  );

  // Get selected chain config
  const selectedChain = React.useMemo(
    () => CHAIN_CONFIGS[selectedChainId],
    [selectedChainId],
  );

  // Persist selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, selectedChainId.toString());
    }
  }, [selectedChainId]);

  // Select a new chain
  const selectChain = useCallback((chainId: ChainId) => {
    if (isChainSupported(chainId)) {
      setSelectedChainId(chainId);
    } else {
      console.warn(`Chain ${chainId} is not supported`);
    }
  }, []);

  // Check if chain is supported
  const isSupported = useCallback((chainId: number): boolean => {
    return isChainSupported(chainId);
  }, []);

  // Get chain by ID
  const getChain = useCallback((chainId: ChainId): ChainConfig | undefined => {
    return CHAIN_CONFIGS[chainId];
  }, []);

  const contextValue = React.useMemo(
    () => ({
      selectedChainId,
      selectedChain,
      availableChains,
      showTestnets,
      selectChain,
      isSupported,
      getChain,
    }),
    [
      selectedChainId,
      selectedChain,
      availableChains,
      showTestnets,
      selectChain,
      isSupported,
      getChain,
    ],
  );

  return (
    <ChainContext.Provider value={contextValue}>
      {children}
    </ChainContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { CHAIN_IDS, CHAIN_CONFIGS } from "../config/contracts";
export type { ChainId, ChainConfig } from "../config/contracts";
