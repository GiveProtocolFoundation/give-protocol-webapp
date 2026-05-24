import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { AppNavbar } from "../AppNavbar";

// Logo, SettingsMenu, ConnectButton, ClientOnly, Wallet components,
// useTranslation, useAuth, useWeb3, MultiChainContext, and docs config
// are all mocked via moduleNameMapper.
//
// Note: useMultiChainContext mock (from moduleNameMapper) uses default values
// and cannot be overridden via jest.mocked() due to a babel-jest interop
// limitation with jest.fn() identity. The defaults (isConnected: false,
// wallet: null) are sufficient for AppNavbar rendering tests.

const mockUseAuth = jest.mocked(useAuth);
const mockUseWeb3 = jest.mocked(useWeb3);

interface MockAuthUser {
  id: string;
  email: string;
}

interface MockAuthReturnValue {
  user: MockAuthUser | null;
  userType: string | null;
  loading: boolean;
  error: null;
  login: jest.Mock;
  loginWithGoogle: jest.Mock;
  logout: jest.Mock;
  resetPassword: jest.Mock;
  refreshSession: jest.Mock;
  register: jest.Mock;
  sendUsernameReminder: jest.Mock;
}

const createAuthMock = (
  overrides: Partial<MockAuthReturnValue> = {},
): MockAuthReturnValue => ({
  user: null,
  userType: null,
  loading: false,
  error: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  refreshSession: jest.fn(),
  register: jest.fn(),
  sendUsernameReminder: jest.fn(),
  ...overrides,
});

const renderNavbar = (initialRoute = "/browse") =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppNavbar />
    </MemoryRouter>,
  );

// Default useWeb3 state (wallet not connected)
const defaultWeb3State = {
  provider: null,
  signer: null,
  address: null,
  chainId: 1287,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchChain: jest.fn(),
};

describe("AppNavbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(createAuthMock());
    mockUseWeb3.mockReturnValue({ ...defaultWeb3State });
  });

  describe("Brand and logo", () => {
    it("renders the Give Protocol brand name", () => {
      renderNavbar();
      expect(screen.getByText("Give Protocol")).toBeInTheDocument();
    });

    it("renders the logo component", () => {
      renderNavbar();
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("renders the home link with correct aria-label", () => {
      renderNavbar();
      const homeLink = screen.getByLabelText("Give Protocol home");
      expect(homeLink).toBeInTheDocument();
    });
  });

  describe("Navigation links (unauthenticated)", () => {
    it("renders Browse link", () => {
      renderNavbar();
      expect(screen.getByText("Browse Charities")).toBeInTheDocument();
    });

    it("renders Opportunities link", () => {
      renderNavbar();
      expect(screen.getByText("Volunteer Opportunities")).toBeInTheDocument();
    });

    it("does not render Contributions link when not authenticated", () => {
      renderNavbar();
      expect(screen.queryByText("Contribution Tracker")).not.toBeInTheDocument();
    });

    it("does not render Dashboard button when not authenticated", () => {
      renderNavbar();
      expect(screen.queryByText("Give Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("Navigation links (authenticated)", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
        }),
      );
    });

    it("renders Contributions link when authenticated", () => {
      renderNavbar();
      expect(screen.getByText("Contribution Tracker")).toBeInTheDocument();
    });

    it("renders Dashboard button when authenticated", () => {
      renderNavbar();
      expect(screen.getByText("Give Dashboard")).toBeInTheDocument();
    });

    it("does not render Monthly Donations link for donor user type", () => {
      renderNavbar();
      expect(screen.queryByText("Monthly Donations")).not.toBeInTheDocument();
    });

    it("does not render Monthly Donations link for charity user type", () => {
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "charity-1", email: "charity@example.com" },
          userType: "charity",
        }),
      );
      renderNavbar();
      expect(screen.queryByText("Monthly Donations")).not.toBeInTheDocument();
    });
  });

  describe("Limited navigation pages", () => {
    it("renders About, Docs, Legal, Privacy links on /about page", () => {
      renderNavbar("/about");
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByText("Documentation")).toBeInTheDocument();
      expect(screen.getByText("Legal")).toBeInTheDocument();
      expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("does not render Browse link on limited navigation pages", () => {
      renderNavbar("/about");
      expect(screen.queryByText("Browse Charities")).not.toBeInTheDocument();
    });
  });

  describe("Sign In button", () => {
    it("renders Sign In link when not connected and not authenticated", () => {
      renderNavbar();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("does not render Sign In link when authenticated", () => {
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
        }),
      );
      renderNavbar();
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });
  });

  describe("Connect button (authenticated, not connected)", () => {
    it("renders ConnectButton when authenticated but wallet not connected", () => {
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
        }),
      );
      renderNavbar();
      expect(screen.getByTestId("connect-button")).toBeInTheDocument();
    });
  });

  describe("Connect button (guest visitor)", () => {
    it("renders ConnectButton for unauthenticated visitors so they can donate without signing in", () => {
      renderNavbar();
      expect(screen.getByTestId("connect-button")).toBeInTheDocument();
    });

    it("renders ConnectButton alongside Sign In link for guests", () => {
      renderNavbar();
      expect(screen.getByTestId("connect-button")).toBeInTheDocument();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });
  });

  describe("Settings menu", () => {
    it("renders the settings menu", () => {
      renderNavbar();
      expect(screen.getByTestId("settings-menu")).toBeInTheDocument();
    });
  });

  describe("Mobile menu toggle", () => {
    it("renders a mobile menu button", () => {
      renderNavbar();
      const menuButton = screen.getByLabelText("Open menu");
      expect(menuButton).toBeInTheDocument();
    });

    it("opens mobile menu when button is clicked", () => {
      renderNavbar();
      const menuButton = screen.getByLabelText("Open menu");
      fireEvent.click(menuButton);

      const mobileMenu = document.getElementById("mobile-menu");
      expect(mobileMenu).toBeInTheDocument();
    });

    it("shows close menu label when menu is open", () => {
      renderNavbar();
      const menuButton = screen.getByLabelText("Open menu");
      fireEvent.click(menuButton);
      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    });

    it("closes mobile menu when toggled again", () => {
      renderNavbar();
      const menuButton = screen.getByLabelText("Open menu");

      fireEvent.click(menuButton);
      expect(document.getElementById("mobile-menu")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close menu"));
      expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
    });
  });

  describe("Application navigation aria label", () => {
    it("renders nav with application navigation aria-label", () => {
      renderNavbar();
      expect(
        screen.getByLabelText("Application navigation"),
      ).toBeInTheDocument();
    });
  });

  describe("Connected wallet UI", () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 8453,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchChain: jest.fn(),
      });
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
        }),
      );
    });

    it("renders wallet menu button when wallet is connected", () => {
      renderNavbar();
      expect(screen.getByLabelText("Wallet menu")).toBeInTheDocument();
    });

    it("displays formatted wallet address when connected", () => {
      renderNavbar();
      expect(screen.getByText("Main Wallet")).toBeInTheDocument();
    });

    it("does not render Sign In link when wallet is connected", () => {
      renderNavbar();
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    it("does not render ConnectButton when wallet is connected", () => {
      renderNavbar();
      expect(screen.queryByTestId("connect-button")).not.toBeInTheDocument();
    });
  });

  describe("handleDisconnect", () => {
    it("calls disconnect and logout when disconnect is triggered", async () => {
      const mockDisconnect = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());
      const mockLogout = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());

      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 8453,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: mockDisconnect,
        switchChain: jest.fn(),
      });
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
          logout: mockLogout,
        }),
      );

      renderNavbar();

      // Open wallet dropdown
      fireEvent.click(screen.getByLabelText("Wallet menu"));

      // Click Disconnect in the dropdown
      await act(() => {
        fireEvent.click(screen.getByText("Disconnect"));
      });

      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it("calls disconnect without logout when no user is logged in", async () => {
      const mockDisconnect = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());

      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 8453,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: mockDisconnect,
        switchChain: jest.fn(),
      });
      mockUseAuth.mockReturnValue(createAuthMock());

      renderNavbar();

      // Open wallet dropdown
      fireEvent.click(screen.getByLabelText("Wallet menu"));

      // Click Disconnect in the dropdown
      await act(() => {
        fireEvent.click(screen.getByText("Disconnect"));
      });

      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
      });
    });
  });

  describe("handleSignOut", () => {
    it("calls logout when Sign Out is clicked", async () => {
      const mockLogout = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());

      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
          logout: mockLogout,
        }),
      );

      renderNavbar();
      const signOutButton = screen.getByLabelText("Sign out");

      await act(() => {
        fireEvent.click(signOutButton);
      });

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it("does not throw when logout rejects", async () => {
      const mockLogout = jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error("Logout failed"));

      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
          logout: mockLogout,
        }),
      );

      renderNavbar();
      const signOutButton = screen.getByLabelText("Sign out");

      await act(() => {
        fireEvent.click(signOutButton);
      });

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe("Mobile Sign Out button", () => {
    it("renders Sign Out in mobile menu when authenticated and not connected", () => {
      mockUseAuth.mockReturnValue(
        createAuthMock({
          user: { id: "user-1", email: "test@example.com" },
          userType: "donor",
        }),
      );
      renderNavbar();

      // Open mobile menu
      fireEvent.click(screen.getByLabelText("Open menu"));

      // Mobile menu should be visible
      const mobileMenu = document.getElementById("mobile-menu");
      expect(mobileMenu).toBeInTheDocument();

      // Find Sign Out text within the mobile menu
      // The button contains a LogOut icon SVG + "Sign Out" text
      const signOutElements = screen.getAllByText(/Sign Out/);
      expect(signOutElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Escape key closes mobile menu", () => {
    it("closes mobile menu when Escape key is pressed", () => {
      renderNavbar();
      const menuButton = screen.getByLabelText("Open menu");
      fireEvent.click(menuButton);
      expect(document.getElementById("mobile-menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
    });
  });
});
