import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkCard } from "../NetworkCard";
import type { ChainConfig } from "@/contexts/ChainContext";

const mockChain: ChainConfig = {
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
};

describe("NetworkCard", () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders chain name", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it("renders description", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      expect(
        screen.getByText(/Fast, secure, and powered by Coinbase/i),
      ).toBeInTheDocument();
    });

    it("renders chain icon", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const icon = screen.getByAltText("Base icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("src", "/chains/base.svg");
    });
  });

  describe("selected state", () => {
    it("shows checkmark when selected", () => {
      const { container } = render(
        <NetworkCard chain={mockChain} isSelected onSelect={mockOnSelect} />,
      );

      // lucide-react Check icon renders as an SVG
      const checkIcon = container.querySelector("svg");
      expect(checkIcon).toBeInTheDocument();
    });

    it("shows glow overlay when selected", () => {
      const { container } = render(
        <NetworkCard chain={mockChain} isSelected onSelect={mockOnSelect} />,
      );

      const glowDiv = container.querySelector(".animate-breathe");
      expect(glowDiv).toBeInTheDocument();
    });

    it("has aria-pressed true when selected", () => {
      render(
        <NetworkCard chain={mockChain} isSelected onSelect={mockOnSelect} />,
      );

      const button = screen.getByRole("button", { name: /Base/i });
      expect(button).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("interaction", () => {
    it("fires onSelect when clicked", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const button = screen.getByRole("button", { name: /Base/i });
      fireEvent.click(button);
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("passes chain id as data attribute", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const button = screen.getByRole("button", { name: /Base/i });
      expect(button).toHaveAttribute("data-chain-id", "8453");
    });
  });

  describe("coming soon", () => {
    it("renders as disabled button", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
          isComingSoon
        />,
      );

      const button = screen.getByRole("button", { name: /Coming Soon/i });
      expect(button).toBeDisabled();
    });

    it("shows Coming Soon text", () => {
      render(
        <NetworkCard
          chain={mockChain}
          isSelected={false}
          onSelect={mockOnSelect}
          isComingSoon
        />,
      );

      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });
  });
});
