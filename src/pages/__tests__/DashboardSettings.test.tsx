import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardSettings from "../DashboardSettings";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useSettings } from "@/contexts/SettingsContext";

// All sub-section components (LinkedAccountsSection, PhoneSettings,
// SetPasswordSettings, WalletAliasSettings, PrivacySettings) are stubbed via
// moduleNameMapper so this file only exercises DashboardSettings itself.
// useSettings and useTranslation are also globally mocked via moduleNameMapper.

const mockUseUnifiedAuth = jest.mocked(useUnifiedAuth);
const mockUseSettings = jest.mocked(useSettings);

const defaultLanguageOptions = [
  { value: "en" as const, label: "English" },
  { value: "es" as const, label: "Español" },
  { value: "fr" as const, label: "Français" },
];

const baseAuthState = {
  user: null,
  isAuthenticated: false,
  authMethod: null,
  email: null,
  walletAddress: null,
  isWalletConnected: false,
  isWalletLinked: false,
  isPasskeySupported: true,
  chainId: null,
  role: "donor" as const,
  loading: false,
  walletAuthStep: null,
  error: null,
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithWallet: jest.fn(),
  signInWithPasskey: jest.fn(),
  registerPasskey: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  linkWallet: jest.fn(),
  unlinkWallet: jest.fn(),
  signOut: jest.fn(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardSettings />
    </MemoryRouter>,
  );

describe("DashboardSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnifiedAuth.mockReturnValue(baseAuthState);
  });

  describe("Header", () => {
    it("renders the Settings heading", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "Settings" }),
      ).toBeInTheDocument();
    });

    it("renders the subtitle copy", () => {
      renderPage();
      expect(
        screen.getByText("Manage your account and preferences"),
      ).toBeInTheDocument();
    });
  });

  describe("Account info", () => {
    it("hides the email row when email is null", () => {
      renderPage();
      expect(screen.queryByText("Email")).not.toBeInTheDocument();
    });

    it("shows the email row when email is provided", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...baseAuthState,
        email: "user@example.com",
      });
      renderPage();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    it("hides the display name row when no displayName is set", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...baseAuthState,
        user: {
          id: "u1",
          email: null,
          role: "donor",
          walletAddress: null,
          authMethod: "wallet",
          displayName: null,
        },
      });
      renderPage();
      expect(screen.queryByText("Display name")).not.toBeInTheDocument();
    });

    it("shows the display name row when user.displayName is set", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...baseAuthState,
        user: {
          id: "u1",
          email: "user@example.com",
          role: "donor",
          walletAddress: null,
          authMethod: "email",
          displayName: "Ada Lovelace",
        },
      });
      renderPage();
      expect(screen.getByText("Display name")).toBeInTheDocument();
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    it("falls back to 'email' when authMethod is null", () => {
      renderPage();
      expect(screen.getByText("Auth method")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
    });

    it("renders the provided authMethod", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...baseAuthState,
        authMethod: "wallet",
      });
      renderPage();
      expect(screen.getByText("wallet")).toBeInTheDocument();
    });

    it("falls back to 'donor' role when no user is set", () => {
      renderPage();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("donor")).toBeInTheDocument();
    });

    it("renders the user role when a user is set", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...baseAuthState,
        user: {
          id: "u1",
          email: null,
          role: "charity",
          walletAddress: null,
          authMethod: "email",
          displayName: null,
        },
      });
      renderPage();
      expect(screen.getByText("charity")).toBeInTheDocument();
    });
  });

  describe("Sub-sections", () => {
    it("renders the Linked Accounts section", () => {
      renderPage();
      expect(screen.getByTestId("linked-accounts")).toBeInTheDocument();
    });

    it("renders the Phone settings section", () => {
      renderPage();
      expect(screen.getByTestId("phone-settings")).toBeInTheDocument();
    });

    it("renders the Set Password section", () => {
      renderPage();
      expect(screen.getByTestId("set-password-settings")).toBeInTheDocument();
    });

    it("renders the Wallet Alias settings section", () => {
      renderPage();
      expect(screen.getByTestId("wallet-settings")).toBeInTheDocument();
    });

    it("renders the Privacy settings section", () => {
      renderPage();
      expect(screen.getByTestId("privacy-settings")).toBeInTheDocument();
    });
  });

  describe("Display Preferences — language selector", () => {
    const mockSetLanguage = jest.fn();

    beforeEach(() => {
      mockUseSettings.mockReturnValue({
        language: "en",
        setLanguage: mockSetLanguage,
        currency: "USD",
        setCurrency: jest.fn(),
        theme: "light",
        setTheme: jest.fn(),
        languageOptions: defaultLanguageOptions,
        currencyOptions: [],
      });
    });

    it("renders the Display Preferences section heading", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: /display preferences/i }),
      ).toBeInTheDocument();
    });

    it("renders all language option buttons", () => {
      renderPage();
      expect(
        screen.getByRole("button", { name: "English" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Español" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Français" }),
      ).toBeInTheDocument();
    });

    it("marks the current language as pressed (aria-pressed=true)", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("calls setLanguage with the selected language code when clicked", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Español" }));
      expect(mockSetLanguage).toHaveBeenCalledWith("es");
    });

    it("renders no language buttons when languageOptions is empty", () => {
      mockUseSettings.mockReturnValue({
        language: "en",
        setLanguage: mockSetLanguage,
        currency: "USD",
        setCurrency: jest.fn(),
        theme: "light",
        setTheme: jest.fn(),
        languageOptions: [],
        currencyOptions: [],
      });
      renderPage();
      expect(
        screen.queryByRole("button", { name: "English" }),
      ).not.toBeInTheDocument();
    });
  });
});
