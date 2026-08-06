import { jest } from "@jest/globals";

export const useChainContext = jest.fn(() => ({
  chainId: 8453,
  chainName: "Base",
  isSupported: true,
  switchChain: jest.fn(),
}));

const MOCK_CHAINS = [
  {
    id: 8453,
    name: "Base",
    shortName: "base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: false,
    description: "Fast, secure, and powered by Coinbase.",
  },
  {
    id: 10,
    name: "Optimism",
    shortName: "optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Ethereum Layer 2 with strong DeFi ecosystem.",
  },
];

// useChain is the hook used by ChainSelectionModal and other components
export const useChain = jest.fn(() => ({
  selectedChainId: 8453,
  selectedChain: MOCK_CHAINS[0],
  availableChains: MOCK_CHAINS,
  showTestnets: false,
  selectChain: jest.fn((chainId) => {
    localStorage.setItem("giveprotocol_selected_chain", String(chainId));
  }),
  isSupported: jest.fn(() => true),
  getChain: jest.fn((chainId) => MOCK_CHAINS.find((c) => c.id === chainId)),
}));

/** Mock ChainProvider pass-through */
export const ChainProvider = ({ children }) => children;

// Re-export CHAIN_IDS and CHAIN_CONFIGS so ChainContext re-exports work
export const CHAIN_IDS = {
  BASE: 8453,
  OPTIMISM: 10,
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
};

export const CHAIN_CONFIGS = {};
