import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthSignup from "../AuthSignup";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

// useUnifiedAuth calls useAuth (mocked via authContextMock) and useWeb3
// (mocked via web3ContextMock). With user: null, isAuthenticated is false
// so the sign-up form renders without redirecting.
// Button, Logo, and validation utils are mocked via moduleNameMapper.
// FormInput is a simple wrapper that renders a real <input>.

const mockRegisterPasskey = jest.fn();
const mockSignInWithGoogle = jest.fn();

const mockSignInWithWallet = jest.fn();
const mockSignUpWithEmail = jest.fn();
const mockUseUnifiedAuth = jest.mocked(useUnifiedAuth);

const renderAuthSignup = () =>
  render(
    <MemoryRouter>
      <AuthSignup />
    </MemoryRouter>,
  );

describe("AuthSignup", () => {
  beforeEach(() => {
    mockRegisterPasskey.mockClear();
    mockSignInWithGoogle.mockClear();
    mockSignInWithWallet.mockClear();
    mockSignUpWithEmail.mockClear();
    mockUseUnifiedAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      authMethod: null,
      email: null,
      walletAddress: null,
      isWalletConnected: false,
      isWalletLinked: false,
      isPasskeySupported: true,
      chainId: null,
      role: "donor",
      loading: false,
      walletAuthStep: null,
      error: null,
      signInWithEmail: jest.fn(),
      signUpWithEmail: mockSignUpWithEmail,
      signInWithWallet: mockSignInWithWallet,
      signInWithPasskey: jest.fn(),
      registerPasskey: mockRegisterPasskey,
      signInWithGoogle: mockSignInWithGoogle,
      linkWallet: jest.fn(),
      unlinkWallet: jest.fn(),
      signOut: jest.fn(),
    });
  });
  describe("Heading", () => {
    it("renders the sign-up heading", () => {
      renderAuthSignup();
      expect(screen.getByText("Create your account")).toBeInTheDocument();
    });

    it("renders the subtitle text", () => {
      renderAuthSignup();
      expect(
        screen.getByText("Join the transparent giving movement"),
      ).toBeInTheDocument();
    });
  });

  describe("Identity fields", () => {
    it("renders the email input", () => {
      renderAuthSignup();
      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    });

    it("renders the display name input", () => {
      renderAuthSignup();
      expect(
        screen.getByPlaceholderText("Display name"),
      ).toBeInTheDocument();
    });

    it("does not render password inputs by default", () => {
      renderAuthSignup();
      expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("Confirm password"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Auth method buttons", () => {
    it("renders the Sign up with Passkey button", () => {
      renderAuthSignup();
      expect(screen.getByText("Sign up with Passkey")).toBeInTheDocument();
    });

    it("renders the Continue with Google button", () => {
      renderAuthSignup();
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });

    it("renders the Connect Wallet button", () => {
      renderAuthSignup();
      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });
  });

  describe("Collapsible password section", () => {
    it("renders the 'Or set a password' toggle", () => {
      renderAuthSignup();
      expect(screen.getByText("Or set a password")).toBeInTheDocument();
    });

    it("expands password fields when toggle is clicked", () => {
      renderAuthSignup();
      fireEvent.click(screen.getByText("Or set a password"));
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Confirm password"),
      ).toBeInTheDocument();
      expect(screen.getByText("Create Account")).toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("renders the sign-in link", () => {
      renderAuthSignup();
      expect(screen.getByText(/Sign in/)).toBeInTheDocument();
    });

    it("renders the nonprofit profile link", () => {
      renderAuthSignup();
      expect(
        screen.getByText("Manage a nonprofit?"),
      ).toBeInTheDocument();
    });
  });

  describe("Auth method interactions", () => {
    it("calls registerPasskey when passkey button is clicked with valid email", async () => {
      mockRegisterPasskey.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      renderAuthSignup();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.click(screen.getByText("Sign up with Passkey"));
      await waitFor(() => {
        expect(mockRegisterPasskey).toHaveBeenCalled();
      });
    });

    it("shows error when passkey button is clicked without email", async () => {
      renderAuthSignup();
      fireEvent.click(screen.getByText("Sign up with Passkey"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/email/i);
      });
      expect(mockRegisterPasskey).not.toHaveBeenCalled();
    });

    it("calls signInWithGoogle when Google button is clicked", async () => {
      mockSignInWithGoogle.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      renderAuthSignup();
      fireEvent.click(screen.getByText("Continue with Google"));
      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it("calls signInWithWallet when wallet button is clicked", async () => {
      mockSignInWithWallet.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      renderAuthSignup();
      fireEvent.click(screen.getByText("Connect Wallet"));
      await waitFor(() => {
        expect(mockSignInWithWallet).toHaveBeenCalled();
      });
    });
  });

  describe("Email/password signup (optional path)", () => {
    const openPasswordSection = () => {
      fireEvent.click(screen.getByText("Or set a password"));
    };

    it("shows error when email is invalid", async () => {
      renderAuthSignup();
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
      });
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it("shows error when password is too short", async () => {
      renderAuthSignup();
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "short" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "short" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/8 characters/i);
      });
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it("shows error when passwords do not match", async () => {
      renderAuthSignup();
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "different456" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/do not match/i);
      });
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it("calls signUpWithEmail with email and password on valid submission", async () => {
      mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      renderAuthSignup();
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          {},
        );
      });
    });

    it("navigates to registration success page after successful email signup", async () => {
      mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      render(
        <MemoryRouter initialEntries={["/auth/signup"]}>
          <Routes>
            <Route path="/auth/signup" element={<AuthSignup />} />
            <Route
              path="/auth/registration-success"
              element={<div>Registration success page</div>}
            />
          </Routes>
        </MemoryRouter>,
      );
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(
          screen.getByText("Registration success page"),
        ).toBeInTheDocument();
      });
    });

    it("shows error when signUpWithEmail fails", async () => {
      mockSignUpWithEmail.mockRejectedValueOnce(
        new Error("Email already in use"),
      );
      renderAuthSignup();
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Email already in use",
        );
      });
    });

    it("includes display name in metadata when provided", async () => {
      mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042
      renderAuthSignup();
      fireEvent.change(screen.getByPlaceholderText("Display name"), {
        target: { value: "Jane Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Email"), {
        target: { value: "test@example.com" },
      });
      openPasswordSection();
      fireEvent.change(screen.getByPlaceholderText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Create Account"));
      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          { name: "Jane Doe" },
        );
      });
    });
  });
});
