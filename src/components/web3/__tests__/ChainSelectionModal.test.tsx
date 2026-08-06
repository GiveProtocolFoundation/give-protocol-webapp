import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChainSelectionModal } from "../ChainSelectionModal";
import { ChainProvider, CHAIN_IDS } from "@/contexts/ChainContext";
import { Web3Provider } from "@/contexts/Web3Context";

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

// Wrapper component with ChainProvider and Web3Provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChainProvider>
    <Web3Provider>{children}</Web3Provider>
  </ChainProvider>
);

describe("ChainSelectionModal", () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("visibility", () => {
    it("renders nothing when not open", () => {
      const { container } = render(
        <TestWrapper>
          <ChainSelectionModal isOpen={false} onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when open", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      expect(screen.getByText("Welcome to Give Protocol")).toBeInTheDocument();
    });
  });

  describe("chain options", () => {
    it("displays mainnet chains", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Optimism")).toBeInTheDocument();
    });
  });

  describe("selection behavior", () => {
    it("allows selecting a chain", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      // Find and click the Base button (contains "Base" text)
      const baseButton = screen.getByRole("button", { name: /Base/i });
      fireEvent.click(baseButton);

      // Continue button should now be enabled
      const continueButton = screen.getByRole("button", { name: /Continue/i });
      expect(continueButton).not.toBeDisabled();
    });

    it("disables continue button when no chain selected", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      const continueButton = screen.getByRole("button", { name: /Continue/i });
      expect(continueButton).toBeDisabled();
    });

    it("pre-selects detected chain if supported", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal
            isOpen
            onComplete={mockOnComplete}
            detectedChainId={CHAIN_IDS.BASE}
          />
        </TestWrapper>,
      );

      // Continue button should be enabled when chain is pre-selected
      const continueButton = screen.getByRole("button", { name: /Continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe("completion", () => {
    it("calls onComplete when continue is clicked", async () => {
      render(
        <TestWrapper>
          <ChainSelectionModal
            isOpen
            onComplete={mockOnComplete}
            detectedChainId={CHAIN_IDS.BASE}
          />
        </TestWrapper>,
      );

      const continueButton = screen.getByRole("button", { name: /Continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    it("persists selected chain to localStorage via context", async () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      // Select Optimism
      const optimismButton = screen.getByRole("button", { name: /Optimism/i });
      fireEvent.click(optimismButton);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "giveprotocol_selected_chain",
          "10",
        );
      });
    });
  });

  describe("accessibility", () => {
    it("has correct ARIA attributes", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute(
        "aria-labelledby",
        "chain-selection-title",
      );
    });

    it("has accessible chain selection buttons", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      // Each chain option should be a button
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(1); // At least chain options + continue
    });
  });

  describe("information text", () => {
    it("shows network switch hint", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      expect(
        screen.getByText(/You can switch networks anytime/i),
      ).toBeInTheDocument();
    });

    it("shows chain descriptions", () => {
      render(
        <TestWrapper>
          <ChainSelectionModal isOpen onComplete={mockOnComplete} />
        </TestWrapper>,
      );

      expect(
        screen.getByText(/Fast, secure, and powered by Coinbase/i),
      ).toBeInTheDocument();
    });
  });
});
