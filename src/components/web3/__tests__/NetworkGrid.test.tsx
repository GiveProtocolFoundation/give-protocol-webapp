import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { NetworkGrid } from "../NetworkGrid";
import type { ChainConfig } from "@/contexts/ChainContext";

const mockChains: ChainConfig[] = [
  {
    id: 8453,
    name: "Base",
    shortName: "base",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
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
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Ethereum Layer 2 with strong DeFi ecosystem.",
  },
  {
    id: 1284,
    name: "Moonbeam",
    shortName: "moonbeam",
    nativeCurrency: { name: "Glimmer", symbol: "GLMR", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbeam.network"],
    blockExplorerUrls: ["https://moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: false,
    description: "Polkadot ecosystem with cross-chain compatibility.",
  },
];

describe("NetworkGrid", () => {
  const mockOnChainSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correct number of chain cards", () => {
    render(
      <NetworkGrid
        chains={mockChains}
        selectedChainId={null}
        onChainSelect={mockOnChainSelect}
      />,
    );

    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Optimism")).toBeInTheDocument();
    expect(screen.getByText("Moonbeam")).toBeInTheDocument();
  });

  it("renders coming soon placeholder cards", () => {
    render(
      <NetworkGrid
        chains={mockChains}
        selectedChainId={null}
        onChainSelect={mockOnChainSelect}
        comingSoonCount={2}
      />,
    );

    const comingSoonButtons = screen.getAllByRole("button", {
      name: /Coming Soon/i,
    });
    expect(comingSoonButtons).toHaveLength(2);
  });

  it("auto-fills coming soon cards to complete last row", () => {
    render(
      <NetworkGrid
        chains={mockChains}
        selectedChainId={null}
        onChainSelect={mockOnChainSelect}
      />,
    );

    // 3 chains fills a row of 3, so auto-fill adds 1 placeholder
    const comingSoonButtons = screen.getAllByRole("button", {
      name: /Coming Soon/i,
    });
    expect(comingSoonButtons).toHaveLength(1);
  });

  it("passes selected state to correct card", () => {
    render(
      <NetworkGrid
        chains={mockChains}
        selectedChainId={8453}
        onChainSelect={mockOnChainSelect}
      />,
    );

    const baseButton = screen.getByRole("button", { name: /Base/i });
    expect(baseButton).toHaveAttribute("aria-pressed", "true");

    const optimismButton = screen.getByRole("button", { name: /Optimism/i });
    expect(optimismButton).toHaveAttribute("aria-pressed", "false");
  });

  it("has scrollable container", () => {
    const { container } = render(
      <NetworkGrid
        chains={mockChains}
        selectedChainId={null}
        onChainSelect={mockOnChainSelect}
      />,
    );

    const scrollContainer = container.querySelector(".scrollbar-styled");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass("overflow-y-auto");
  });
});
