/**
 * Tests for WalletButton WCAG 2.4.3 focus management (GIV-109 — M4)
 * Verifies that keyboard focus is managed correctly when the wallet dropdown opens/closes.
 */
import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletButton } from "../WalletButton";

// Mock WalletDropdown to render inline (no Portal) with the data-wallet-menu attribute.
// Rendering inline rather than via Portal makes the DOM available to the parent container.
jest.mock("../WalletDropdown", () => ({
  WalletDropdown: ({
    onDisconnect,
  }: {
    onDisconnect: () => void;
    [key: string]: unknown;
  }) => (
    <div data-wallet-menu="true">
      <button type="button" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  ),
}));

// Mock useWalletBalance so no network calls are made
jest.mock("@/hooks/useWalletBalance", () => ({
  useWalletBalance: jest.fn(() => ({
    native: "0",
    usdValue: "0",
    isLoading: false,
  })),
}));

const defaultProps = {
  address: "0x1234567890123456789012345678901234567890",
  provider: "metamask" as const,
  network: "base" as const,
  onDisconnect: jest.fn(),
  onSwitchAccount: jest.fn(),
};

const renderWalletButton = () =>
  render(
    <MemoryRouter>
      <WalletButton {...defaultProps} />
    </MemoryRouter>,
  );

describe("WalletButton focus management (WCAG 2.4.3 — GIV-109)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("M4 — dropdown focus management", () => {
    it("dropdown is not present before the wallet button is clicked", () => {
      renderWalletButton();
      expect(document.querySelector("[data-wallet-menu]")).toBeNull();
    });

    it("renders a focusable first item in the dropdown when it opens", async () => {
      renderWalletButton();

      const walletButton = screen.getByRole("button", { name: /wallet menu/i });
      await act(() => {
        fireEvent.click(walletButton);
      });

      // Dropdown should be open
      expect(walletButton).toHaveAttribute("aria-expanded", "true");

      // The first focusable item must exist in the dropdown menu
      const menu = document.querySelector("[data-wallet-menu]");
      expect(menu).not.toBeNull();

      const firstFocusable = menu?.querySelector<HTMLElement>(
        "button:not([disabled])",
      );
      expect(firstFocusable).not.toBeNull();
    });

    it("returns focus to the wallet button when the dropdown is closed via Escape", async () => {
      renderWalletButton();

      const walletButton = screen.getByRole("button", { name: /wallet menu/i });

      await act(() => {
        fireEvent.click(walletButton);
      });

      await act(() => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      expect(document.activeElement).toBe(walletButton);
    });

    it("returns focus to the wallet button when the dropdown closes via toggle click", async () => {
      renderWalletButton();

      const walletButton = screen.getByRole("button", { name: /wallet menu/i });

      // Open
      await act(() => {
        fireEvent.click(walletButton);
      });

      expect(document.querySelector("[data-wallet-menu]")).not.toBeNull();

      // Close by clicking toggle again
      await act(() => {
        fireEvent.click(walletButton);
      });

      expect(document.activeElement).toBe(walletButton);
    });
  });
});
