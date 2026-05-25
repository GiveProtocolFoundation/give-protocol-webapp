import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createMockAuth, createMockWeb3 } from "@/test-utils/mockSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import Login from "../Login";

// Button, Logo, Card are mocked via moduleNameMapper

// Login.tsx uses relative imports; mock paths must resolve to the same absolute paths.
// From src/pages/__tests__/, "../../components/auth/..." resolves to src/components/auth/...
/* eslint-disable react/prop-types */
jest.mock("../../components/auth/DonorLogin", () => ({
  DonorLogin: () => <div data-testid="donor-login">Donor Login Form</div>,
}));

jest.mock("../../components/auth/CharityLogin", () => ({
  CharityLogin: () => <div data-testid="charity-login">Charity Login Form</div>,
}));

jest.mock("../../components/auth/ForgotPassword", () => ({
  ForgotPassword: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="forgot-password">
      <button onClick={onBack}>Back</button>
      Reset Password
    </div>
  ),
}));

jest.mock("../../components/auth/ForgotUsername", () => ({
  ForgotUsername: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="forgot-username">
      <button onClick={onBack}>Back</button>
      Forgot Username
    </div>
  ),
}));
/* eslint-enable react/prop-types */

const mockUseAuth = jest.mocked(useAuth);
const mockUseWeb3 = jest.mocked(useWeb3);

const renderLogin = (initialPath = "/login") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Login />
    </MemoryRouter>,
  );

describe("Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuth({ user: null }));
    mockUseWeb3.mockReturnValue(
      createMockWeb3({ isConnected: false, connect: jest.fn() }),
    );
  });

  describe("Select view (default)", () => {
    it("renders the welcome heading", () => {
      renderLogin();
      expect(screen.getByText("Welcome to Give Protocol")).toBeInTheDocument();
    });

    it("renders Sign In or Connect card header", () => {
      renderLogin();
      expect(screen.getByText("Sign In or Connect")).toBeInTheDocument();
    });

    it("renders Continue as Donor button", () => {
      renderLogin();
      expect(screen.getByText("Continue as Donor")).toBeInTheDocument();
    });

    it("renders Connect Wallet button", () => {
      renderLogin();
      expect(screen.getByText("Connect Wallet & Sign In")).toBeInTheDocument();
    });

    it("renders New Donor Sign Up link", () => {
      renderLogin();
      expect(screen.getByText("New Donor Sign Up")).toBeInTheDocument();
    });

    it("renders nonprofit profile button", () => {
      renderLogin();
      expect(
        screen.getByText("I manage a Nonprofit Profile"),
      ).toBeInTheDocument();
    });
  });

  describe("View switching", () => {
    it("shows donor login form when Continue as Donor is clicked", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      // Login.tsx renders this subtitle directly in the donor case
      expect(
        screen.getByText("Sign in to access your giving dashboard"),
      ).toBeInTheDocument();
    });

    it("shows Donor Sign In heading when in donor view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      expect(screen.getByText("Donor Sign In")).toBeInTheDocument();
    });

    it("shows charity login form when nonprofit button is clicked", () => {
      renderLogin();
      fireEvent.click(screen.getByText("I manage a Nonprofit Profile"));
      // Login.tsx renders this subtitle directly in the charity case
      expect(
        screen.getByText("Manage your organization profile and donations"),
      ).toBeInTheDocument();
    });

    it("shows Nonprofit Portal heading in charity view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("I manage a Nonprofit Profile"));
      expect(screen.getByText("Nonprofit Portal")).toBeInTheDocument();
    });

    it("returns to select view when Back is clicked in donor view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      fireEvent.click(
        screen.getByRole("button", { name: /Go back to sign in options/ }),
      );
      expect(screen.getByText("Continue as Donor")).toBeInTheDocument();
    });

    it("returns to select view when Back is clicked in charity view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("I manage a Nonprofit Profile"));
      fireEvent.click(
        screen.getByRole("button", { name: /Go back to sign in options/ }),
      );
      expect(screen.getByText("Continue as Donor")).toBeInTheDocument();
    });

    it("shows forgot password form when Forgot password? is clicked", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      fireEvent.click(
        screen.getByRole("button", { name: /Recover forgotten password/ }),
      );
      // ForgotCredentials renders "Reset Password" as its title when type="password"
      expect(screen.getByText("Reset Password")).toBeInTheDocument();
    });

    it("shows forgot username form when Forgot username? is clicked", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      fireEvent.click(
        screen.getByRole("button", { name: /Recover forgotten username/ }),
      );
      // ForgotCredentials renders "Forgot Username" as its title when type="username"
      expect(screen.getByText("Forgot Username")).toBeInTheDocument();
    });
  });

  describe("Authentication redirect", () => {
    it("redirects when user is already logged in", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({ user: { id: "1", email: "user@test.com" } }),
      );
      renderLogin();
      // Login component renders Navigate when user is set, so the login form is not shown
      expect(
        screen.queryByText("Welcome to Give Protocol"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Wallet connect", () => {
    it("calls connect when Connect Wallet button is clicked", () => {
      const mockConnect = jest.fn();
      mockUseWeb3.mockReturnValue(
        createMockWeb3({ isConnected: false, connect: mockConnect }),
      );
      renderLogin();
      fireEvent.click(screen.getByText("Connect Wallet & Sign In"));
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("shows Connecting… text when isConnecting is true", () => {
      mockUseWeb3.mockReturnValue(
        createMockWeb3({ isConnecting: true, connect: jest.fn() }),
      );
      renderLogin();
      expect(screen.getByText(/Connecting/)).toBeInTheDocument();
    });
  });

  describe("URL param ?type=charity", () => {
    it("shows charity view when ?type=charity is in URL", () => {
      renderLogin("/login?type=charity");
      // Login.tsx initialises view to "charity" when typeParam === "charity"
      expect(screen.getByText("Nonprofit Portal")).toBeInTheDocument();
    });
  });

  describe("Help links in donor view", () => {
    it("shows Need help? text in donor view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("Continue as Donor"));
      expect(screen.getByText("Need help?")).toBeInTheDocument();
    });
  });

  describe("Nonprofit onboarding tray", () => {
    it("renders Create a Nonprofit Account link in charity view", () => {
      renderLogin();
      fireEvent.click(screen.getByText("I manage a Nonprofit Profile"));
      expect(
        screen.getByText("Create a Nonprofit Account"),
      ).toBeInTheDocument();
    });
  });
});
