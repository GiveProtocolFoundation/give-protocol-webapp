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
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { __walletModalRef } from "@/components/web3/WalletModal/WalletModal";
import Auth from "../Auth";

// useUnifiedWallets and useMultiChainContext use defaults from their moduleNameMapper mocks
const mockUseUnifiedAuth = jest.mocked(useUnifiedAuth);

const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  authMethod: null as "email" | "wallet" | null,
  email: null,
  walletAddress: null,
  isWalletConnected: false,
  isWalletLinked: false,
  chainId: null,
  role: "donor" as const,
  loading: false,
  walletAuthStep: null,
  error: null,
  signInWithEmail: jest.fn<() => Promise<void>>(),
  signUpWithEmail: jest.fn<() => Promise<void>>(),
  signInWithWallet: jest.fn<() => Promise<void>>(),
  linkWallet: jest.fn<() => Promise<void>>(),
  unlinkWallet: jest.fn<() => Promise<void>>(),
  signOut: jest.fn<() => Promise<void>>(),
};

const renderAuth = (initialEntries: string[] = ["/auth"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Auth />
    </MemoryRouter>,
  );

describe("Auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnifiedAuth.mockReturnValue({ ...defaultAuthState });
  });

  describe("Page layout", () => {
    it("renders the auth page with left and right panels", () => {
      renderAuth();
      expect(screen.getByText(/Smart giving/)).toBeInTheDocument();
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });

    it("renders protocol status banner with Genesis Phase text", () => {
      renderAuth();
      expect(screen.getByText(/Protocol Status/)).toBeInTheDocument();
    });

    it("renders Runs On trust tags", () => {
      renderAuth();
      expect(screen.getByText("Moonbeam")).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Optimism")).toBeInTheDocument();
      expect(screen.getByText("Open Source")).toBeInTheDocument();
      expect(screen.getByText("501(c)(3)")).toBeInTheDocument();
    });

    it("renders the transparent impact tagline", () => {
      renderAuth();
      expect(screen.getByText(/transparent impact/)).toBeInTheDocument();
      expect(screen.getByText(/impact/)).toBeInTheDocument();
    });
  });

  describe("Sign-in form", () => {
    it("renders email and password inputs", () => {
      renderAuth();
      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });

    it("renders the Sign In button", () => {
      renderAuth();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("renders the sign-in subtitle", () => {
      renderAuth();
      expect(
        screen.getByText("Sign in to your Give Protocol account"),
      ).toBeInTheDocument();
    });

    it("updates email input value on change", () => {
      renderAuth();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "user@test.com" } });
      expect(emailInput).toHaveValue("user@test.com");
    });

    it("updates password input value on change", () => {
      renderAuth();
      const passwordInput = screen.getByPlaceholderText("Password");
      fireEvent.change(passwordInput, { target: { value: "secret123" } });
      expect(passwordInput).toHaveValue("secret123");
    });

    it("calls signInWithEmail on form submit", async () => {
      const mockSignIn = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        signInWithEmail: mockSignIn,
      });
      renderAuth();

      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
      });
    });

    it("shows error message when sign-in fails", async () => {
      const mockSignIn = jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error("Invalid credentials"));
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        signInWithEmail: mockSignIn,
      });
      renderAuth();

      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });
    });

    it("shows generic error when sign-in throws non-Error", async () => {
      const mockSignIn = jest
        .fn<() => Promise<void>>()
        .mockRejectedValue("unknown");
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        signInWithEmail: mockSignIn,
      });
      renderAuth();

      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(screen.getByText("Sign in failed")).toBeInTheDocument();
      });
    });

    it("shows Signing in text when loading", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        loading: true,
      });
      renderAuth();
      expect(screen.getByText(/Signing in/)).toBeInTheDocument();
    });

    it("disables Sign In button when loading", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        loading: true,
      });
      renderAuth();
      const button = screen.getByText(/Signing in/);
      expect(button).toBeDisabled();
    });
  });

  describe("Wallet authentication", () => {
    it("renders Connect Wallet button", () => {
      renderAuth();
      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });

    it("shows wallet step label when connecting", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        walletAuthStep: "connecting",
      });
      renderAuth();
      expect(screen.getByText(/Connecting wallet/)).toBeInTheDocument();
    });

    it("shows wallet step label when signing", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        walletAuthStep: "signing",
      });
      renderAuth();
      expect(screen.getByText(/Signing message/)).toBeInTheDocument();
    });

    it("shows wallet step label when verifying", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        walletAuthStep: "verifying",
      });
      renderAuth();
      expect(screen.getByText(/Verifying/)).toBeInTheDocument();
    });

    it("shows wallet step label when opening session", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        walletAuthStep: "session",
      });
      renderAuth();
      expect(screen.getByText(/Opening session/)).toBeInTheDocument();
    });

    it("opens wallet modal when Connect Wallet button is clicked", () => {
      renderAuth();
      fireEvent.click(screen.getByText("Connect Wallet"));
      expect(screen.getByTestId("wallet-modal")).toBeInTheDocument();
    });

    it("closes wallet modal when modal close is triggered", () => {
      renderAuth();
      fireEvent.click(screen.getByText("Connect Wallet"));
      expect(screen.getByTestId("wallet-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close modal"));
      expect(screen.queryByTestId("wallet-modal")).not.toBeInTheDocument();
    });

    it("calls signInWithWallet on successful wallet modal connect", async () => {
      const mockGetAccounts = jest
        .fn<() => Promise<Array<{ address: string }>>>()
        .mockResolvedValue([{ address: "0xABC123" }]);
      const mockWallet = {
        name: "TestWallet",
        icon: "test",
        category: "browser",
        supportedChainTypes: ["evm"],
        isInstalled: () => true,
        getAccounts: mockGetAccounts,
      };
      const mockSignInWithWallet = jest
        .fn<() => Promise<void>>()
        .mockImplementation(() => Promise.resolve());
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        signInWithWallet: mockSignInWithWallet,
      });

      renderAuth();
      fireEvent.click(screen.getByText("Connect Wallet"));

      // Invoke the onConnect callback captured by the WalletModal mock
      const onConnect = __walletModalRef.onConnect as (
        w: typeof mockWallet,
        c: string,
      ) => Promise<void>;
      expect(onConnect).toBeTruthy();
      await act(async () => {
        await onConnect(mockWallet, "evm");
      });

      expect(mockSignInWithWallet).toHaveBeenCalledWith("donor", {
        wallet: mockWallet,
        chainType: "evm",
        address: "0xABC123",
      });
    });

    it("shows error when wallet returns no address after connect", async () => {
      const mockGetAccounts = jest
        .fn<() => Promise<Array<{ address: string }>>>()
        .mockResolvedValue([]);
      const mockWallet = {
        name: "EmptyWallet",
        icon: "test",
        category: "browser",
        supportedChainTypes: ["evm"],
        isInstalled: () => true,
        getAccounts: mockGetAccounts,
      };
      mockUseUnifiedAuth.mockReturnValue({ ...defaultAuthState });

      renderAuth();
      fireEvent.click(screen.getByText("Connect Wallet"));

      const onConnect = __walletModalRef.onConnect as (
        w: typeof mockWallet,
        c: string,
      ) => Promise<void>;
      expect(onConnect).toBeTruthy();
      await act(async () => {
        await expect(onConnect(mockWallet, "evm")).rejects.toThrow(
          "No account found after wallet connection",
        );
      });

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("No account found after wallet connection"),
      ).toBeInTheDocument();
    });

    it("shows error when wallet connect throws a generic error", async () => {
      const mockGetAccounts = jest
        .fn<() => Promise<Array<{ address: string }>>>()
        .mockRejectedValue(new Error("Connection rejected"));
      const mockWallet = {
        name: "FailWallet",
        icon: "test",
        category: "browser",
        supportedChainTypes: ["evm"],
        isInstalled: () => true,
        getAccounts: mockGetAccounts,
      };
      mockUseUnifiedAuth.mockReturnValue({ ...defaultAuthState });

      renderAuth();
      fireEvent.click(screen.getByText("Connect Wallet"));

      const onConnect = __walletModalRef.onConnect as (
        w: typeof mockWallet,
        c: string,
      ) => Promise<void>;
      expect(onConnect).toBeTruthy();
      await act(async () => {
        await expect(onConnect(mockWallet, "evm")).rejects.toThrow(
          "Connection rejected",
        );
      });

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Connection rejected")).toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("renders Create an account link to signup", () => {
      renderAuth();
      const signUpLink = screen.getByText(/Create an account/);
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink.closest("a")).toHaveAttribute("href", "/auth/signup");
    });

    it("renders nonprofit profile link", () => {
      renderAuth();
      const nonprofitLink = screen.getByText("I manage a Nonprofit Profile");
      expect(nonprofitLink.closest("a")).toHaveAttribute(
        "href",
        "/auth/charity",
      );
    });

    it("renders Terms link", () => {
      renderAuth();
      const termsLink = screen.getByText("Terms");
      expect(termsLink.closest("a")).toHaveAttribute("href", "/legal");
    });

    it("renders Privacy link", () => {
      renderAuth();
      const privacyLink = screen.getByText("Privacy");
      expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
    });

    it("renders or divider between email and wallet sign-in", () => {
      renderAuth();
      expect(screen.getByText("or")).toBeInTheDocument();
    });
  });

  describe("Forgot password", () => {
    it("renders Forgot password button", () => {
      renderAuth();
      expect(screen.getByText(/Forgot password/)).toBeInTheDocument();
    });

    it("shows forgot password view when Forgot password is clicked", () => {
      renderAuth();
      fireEvent.click(screen.getByText(/Forgot password/));
      expect(screen.getByTestId("forgot-password")).toBeInTheDocument();
    });

    it("returns to sign-in view when Back is clicked from forgot password", () => {
      renderAuth();
      fireEvent.click(screen.getByText(/Forgot password/));
      expect(screen.getByTestId("forgot-password")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Back to sign in"));
      expect(screen.queryByTestId("forgot-password")).not.toBeInTheDocument();
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });
  });

  describe("Authentication redirect", () => {
    it("does not render sign-in form when authenticated as donor", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        role: "donor",
      });
      renderAuth();
      expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    it("does not render sign-in form when authenticated as charity", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        role: "charity",
      });
      renderAuth();
      expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
    });

    it("does not render sign-in form when authenticated as admin", () => {
      mockUseUnifiedAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        role: "admin",
      });
      renderAuth();
      expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
    });
  });

  describe("Trust signal", () => {
    it("renders SSL encryption note", () => {
      renderAuth();
      expect(screen.getByText(/256-bit SSL encrypted/)).toBeInTheDocument();
    });
  });
});
