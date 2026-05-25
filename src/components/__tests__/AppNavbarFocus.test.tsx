/**
 * Tests for AppNavbar WCAG 2.4.3 focus management (GIV-109)
 * Verifies that keyboard focus moves correctly when the mobile menu opens/closes.
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppNavbar } from "../AppNavbar";

// WalletButton and NetworkSelector are not in moduleNameMapper; mock them here.
// AppNavbar only renders WalletButton/NetworkSelector when isConnected && address,
// which is false by default (useWeb3 mock returns isConnected: false).
jest.mock("../Wallet", () => ({
  WalletButton: () => null,
  NetworkSelector: () => null,
}));

// All other deps (SettingsMenu, Logo, useTranslation, AuthContext,
// Web3Context, MultiChainContext, DOCS_CONFIG) are mocked via moduleNameMapper.

const renderNavbar = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppNavbar />
    </MemoryRouter>,
  );

describe("AppNavbar mobile menu focus management (WCAG 2.4.3 — GIV-109)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("M1 — mobile menu focus on open", () => {
    it("moves focus to the first menu item when the mobile menu opens", async () => {
      renderNavbar();

      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await act(() => {
        fireEvent.click(menuButton);
      });

      const mobileMenu = document.getElementById("mobile-menu");
      expect(mobileMenu).not.toBeNull();

      const firstFocusable = mobileMenu?.querySelector<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      expect(firstFocusable).not.toBeNull();
      expect(document.activeElement).toBe(firstFocusable);
    });

    it("returns focus to the menu toggle button when the Escape key closes the menu", async () => {
      renderNavbar();

      const menuButton = screen.getByRole("button", { name: /open menu/i });

      await act(() => {
        fireEvent.click(menuButton);
      });

      await act(() => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      expect(document.activeElement).toBe(menuButton);
    });

    it("mobile menu is not present before the toggle button is clicked", () => {
      renderNavbar();
      expect(document.getElementById("mobile-menu")).toBeNull();
    });

    it("mobile menu is present and visible after the toggle button is clicked", async () => {
      renderNavbar();

      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await act(() => {
        fireEvent.click(menuButton);
      });

      expect(document.getElementById("mobile-menu")).not.toBeNull();
    });
  });
});
