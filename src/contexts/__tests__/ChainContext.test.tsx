import React from "react";
import { jest } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import { ChainProvider, useChain, CHAIN_IDS } from "../ChainContext";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      const { [key]: _, ...rest } = store;
      store = rest;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Test component to access chain context
const TestComponent: React.FC = () => {
  const chain = useChain();

  const handleSelectBase = React.useCallback(() => {
    chain.selectChain(CHAIN_IDS.BASE);
  }, [chain]);

  const handleSelectOptimism = React.useCallback(() => {
    chain.selectChain(CHAIN_IDS.OPTIMISM);
  }, [chain]);

  return (
    <div>
      <div data-testid="selected-chain-id">{chain.selectedChainId}</div>
      <div data-testid="selected-chain-name">{chain.selectedChain.name}</div>
      <div data-testid="available-chains">
        {chain.availableChains.map((c) => c.id).join(",")}
      </div>
      <div data-testid="show-testnets">
        {chain.showTestnets ? "true" : "false"}
      </div>
      <button data-testid="select-base" onClick={handleSelectBase}>
        Select Base
      </button>
      <button data-testid="select-optimism" onClick={handleSelectOptimism}>
        Select Optimism
      </button>
      <div data-testid="is-supported-base">
        {chain.isSupported(CHAIN_IDS.BASE) ? "true" : "false"}
      </div>
      <div data-testid="is-supported-invalid">
        {chain.isSupported(99999) ? "true" : "false"}
      </div>
    </div>
  );
};

describe("ChainContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("ChainProvider", () => {
    it("provides default chain when no stored preference", () => {
      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      // Default is BASE (8453)
      expect(screen.getByTestId("selected-chain-id")).toHaveTextContent("8453");
      expect(screen.getByTestId("selected-chain-name")).toHaveTextContent(
        "Base",
      );
    });

    it("restores chain from localStorage", () => {
      localStorageMock.setItem("giveprotocol_selected_chain", "10"); // Optimism

      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      expect(screen.getByTestId("selected-chain-id")).toHaveTextContent("10");
      expect(screen.getByTestId("selected-chain-name")).toHaveTextContent(
        "Optimism",
      );
    });

    it("falls back to default for invalid stored chain", () => {
      localStorageMock.setItem("giveprotocol_selected_chain", "99999");

      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      // Should fall back to default (BASE)
      expect(screen.getByTestId("selected-chain-id")).toHaveTextContent("8453");
    });

    it("selects chain and persists to localStorage", () => {
      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      const selectOptimismButton = screen.getByTestId("select-optimism");

      act(() => {
        selectOptimismButton.click();
      });

      expect(screen.getByTestId("selected-chain-id")).toHaveTextContent("10");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "giveprotocol_selected_chain",
        "10",
      );
    });

    it("provides available chains", () => {
      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      const availableChains =
        screen.getByTestId("available-chains").textContent;
      // Should include mainnet chains
      expect(availableChains).toContain("8453"); // Base
      expect(availableChains).toContain("10"); // Optimism
      expect(availableChains).toContain("42161"); // Arbitrum
    });

    it("checks if chain is supported", () => {
      render(
        <ChainProvider>
          <TestComponent />
        </ChainProvider>,
      );

      expect(screen.getByTestId("is-supported-base")).toHaveTextContent("true");
      expect(screen.getByTestId("is-supported-invalid")).toHaveTextContent(
        "false",
      );
    });
  });

  describe("useChain", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error");
      consoleSpy.mockImplementation(() => {
        // Empty mock to suppress error output
      });

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useChain must be used within a ChainProvider");

      consoleSpy.mockRestore();
    });
  });
});
