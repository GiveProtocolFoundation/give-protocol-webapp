import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletModal } from "../WalletModal";
import type { UnifiedWalletProvider } from "@/types/wallet";

// ChainContext is mocked via moduleNameMapper → chainContextMock.js
// Portal renders into document.body in jsdom

const mockOnClose = jest.fn();
const mockOnConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined); // skipcq: JS-W1042 — mockResolvedValue requires an argument

const mockWallets: UnifiedWalletProvider[] = [
  {
    name: "MetaMask",
    icon: "metamask",
    category: "browser",
    supportedChainTypes: ["evm"],
    isInstalled: () => true,
  },
  {
    name: "Phantom",
    icon: "phantom",
    category: "multichain",
    supportedChainTypes: ["evm", "solana"],
    isInstalled: () => false,
  },
];

const renderModal = (isOpen = true) =>
  render(
    <WalletModal
      isOpen={isOpen}
      onClose={mockOnClose}
      wallets={mockWallets}
      onConnect={mockOnConnect}
    />,
  );

describe("WalletModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("visibility", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = renderModal(false);
      expect(container.firstChild).toBeNull();
    });

    it("renders Step 1 when isOpen is true", () => {
      renderModal();
      expect(screen.getByText("Select Network")).toBeInTheDocument();
    });
  });

  describe("Step 1 — network selection", () => {
    it("shows mainnet chain options", () => {
      renderModal();
      expect(screen.getByRole("button", { name: /Base/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Optimism/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Moonbeam/i })).toBeInTheDocument();
    });

    it("disables Continue button when no network is selected", () => {
      renderModal();
      const continueBtn = screen.getByRole("button", { name: /Next Step: Connect Wallet/i });
      expect(continueBtn).toBeDisabled();
    });

    it("enables Continue button after selecting a network", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      const continueBtn = screen.getByRole("button", { name: /Next Step: Connect Wallet/i });
      expect(continueBtn).not.toBeDisabled();
    });

    it("calls onClose when the close button is clicked", () => {
      renderModal();
      // Two "Close modal" buttons exist: the backdrop (tabIndex=-1) and the dialog header button.
      // We click the header button (the one without tabIndex=-1).
      const closeButtons = screen.getAllByLabelText("Close modal");
      const headerClose = closeButtons.find(
        (el) => el.getAttribute("tabindex") !== "-1",
      );
      if (!headerClose) throw new Error("Header close button not found");
      fireEvent.click(headerClose);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("has correct ARIA attributes on the dialog", () => {
      renderModal();
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "wallet-modal-title");
    });
  });

  describe("Step 1 → Step 2 transition", () => {
    it("transitions to Step 2 when Continue is clicked after selecting a network", async () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));

      await waitFor(() => {
        expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
      });
    });

    it("shows chain type tabs in Step 2", async () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /EVM/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Solana/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Polkadot/i })).toBeInTheDocument();
      });
    });

    it("shows available wallets in Step 2", async () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));

      await waitFor(() => {
        expect(screen.getByText("MetaMask")).toBeInTheDocument();
      });
    });
  });

  describe("Step 2 — back navigation", () => {
    const goToStep2 = async () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));
      await waitFor(() => {
        expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
      });
    };

    it("shows a back button in Step 2", async () => {
      await goToStep2();
      expect(screen.getByLabelText("Back to network selection")).toBeInTheDocument();
    });

    it("returns to Step 1 when back button is clicked", async () => {
      await goToStep2();
      fireEvent.click(screen.getByLabelText("Back to network selection"));
      await waitFor(() => {
        expect(screen.getByText("Select Network")).toBeInTheDocument();
      });
    });
  });

  describe("modal lifecycle", () => {
    it("resets to Step 1 when modal reopens", async () => {
      const { rerender } = renderModal();

      // Go to Step 2
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));
      await waitFor(() => {
        expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
      });

      // Close and reopen
      rerender(
        <WalletModal
          isOpen={false}
          onClose={mockOnClose}
          wallets={mockWallets}
          onConnect={mockOnConnect}
        />,
      );
      rerender(
        <WalletModal
          isOpen
          onClose={mockOnClose}
          wallets={mockWallets}
          onConnect={mockOnConnect}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Select Network")).toBeInTheDocument();
      });
    });

    it("dismisses on Escape key when on Step 1", () => {
      renderModal();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("dismisses on Escape key when on Step 2", async () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Base/i }));
      fireEvent.click(screen.getByRole("button", { name: /Next Step: Connect Wallet/i }));
      await waitFor(() => {
        expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
