import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DonorRegistration } from "../DonorRegistration";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

// useUnifiedAuth and PasswordStrengthBar are both mocked via moduleNameMapper

const mockSignUpWithEmail = jest.fn();
const mockRegisterPasskey = jest.fn();
const mockSignInWithGoogle = jest.fn();

const mockSignInWithWallet = jest.fn();
const mockUseUnifiedAuth = jest.mocked(useUnifiedAuth);

describe("DonorRegistration", () => {
  beforeEach(() => {
    mockSignUpWithEmail.mockClear();
    mockRegisterPasskey.mockClear();
    mockSignInWithGoogle.mockClear();
    mockSignInWithWallet.mockClear();
    mockUseUnifiedAuth.mockReturnValue({
      signUpWithEmail: mockSignUpWithEmail,
      registerPasskey: mockRegisterPasskey,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithWallet: mockSignInWithWallet,
      isPasskeySupported: true,
      loading: false,
      user: null,
      isAuthenticated: false,
      authMethod: null,
      email: null,
      walletAddress: null,
      isWalletConnected: false,
      isWalletLinked: false,
      chainId: null,
      role: "donor",
      walletAuthStep: null,
      error: null,
      signInWithEmail: jest.fn(),
      signInWithPasskey: jest.fn(),
      linkWallet: jest.fn(),
      unlinkWallet: jest.fn(),
      signOut: jest.fn(),
    });
  });

  it("renders the email field and primary auth buttons", () => {
    render(<DonorRegistration />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText("Sign up with Passkey")).toBeInTheDocument();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("renders privacy policy and terms of service links", () => {
    render(<DonorRegistration />);
    // Age-affirmation label + GDPR notice both link to /privacy, so multiple links exist
    const privacyLinks = screen.getAllByRole("link", { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    privacyLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/privacy"),
    );
    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("does not render password fields by default", () => {
    render(<DonorRegistration />);
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/confirm password/i),
    ).not.toBeInTheDocument();
  });

  it("renders the 'Or set a password' collapsible toggle", () => {
    render(<DonorRegistration />);
    expect(screen.getByText("Or set a password")).toBeInTheDocument();
  });

  it("expands password fields when toggle is clicked", () => {
    render(<DonorRegistration />);
    fireEvent.click(screen.getByText("Or set a password"));
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create donor account/i }),
    ).toBeInTheDocument();
  });

  // --- Social / passkey paths: gated via PostAuthAgeConfirmModal ---

  it("calls signInWithGoogle when Google button is clicked and modal confirmed", async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined); // skipcq: JS-W1042 — mockResolvedValueOnce requires an argument
    render(<DonorRegistration />);
    fireEvent.click(screen.getByText("Continue with Google"));
    // PostAuthAgeConfirmModal is now visible
    expect(
      screen.getByRole("dialog", { name: /age confirmation/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/I confirm.*16 or older/i));
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it("calls signInWithWallet when wallet button is clicked and modal confirmed", async () => {
    mockSignInWithWallet.mockResolvedValueOnce(undefined); // skipcq: JS-W1042 — mockResolvedValueOnce requires an argument
    render(<DonorRegistration />);
    fireEvent.click(screen.getByText("Connect Wallet"));
    expect(
      screen.getByRole("dialog", { name: /age confirmation/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/I confirm.*16 or older/i));
    await waitFor(() => {
      expect(mockSignInWithWallet).toHaveBeenCalled();
    });
  });

  it("calls signUpWithEmail and registerPasskey when passkey button clicked with valid email and modal confirmed", async () => {
    mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042 — mockResolvedValueOnce requires an argument
    mockRegisterPasskey.mockResolvedValueOnce(undefined); // skipcq: JS-W1042 — mockResolvedValueOnce requires an argument
    render(<DonorRegistration />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.click(screen.getByText("Sign up with Passkey"));
    expect(
      screen.getByRole("dialog", { name: /age confirmation/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/I confirm.*16 or older/i));
    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        "donor@example.com",
        expect.any(String),
      );
    });
    expect(mockRegisterPasskey).toHaveBeenCalled();
  });

  it("shows error when passkey button clicked without email (modal confirmed)", async () => {
    render(<DonorRegistration />);
    fireEvent.click(screen.getByText("Sign up with Passkey"));
    expect(
      screen.getByRole("dialog", { name: /age confirmation/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/I confirm.*16 or older/i));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/email/i);
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    expect(mockRegisterPasskey).not.toHaveBeenCalled();
  });

  // --- Negative path: decline in PostAuthAgeConfirmModal ---

  it("does not call signInWithGoogle when modal is declined", async () => {
    render(<DonorRegistration />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.click(screen.getByText("Continue with Google"));
    fireEvent.click(screen.getByText(/I am under 16/i));
    // Modal closes; auth fn not called
    expect(
      screen.queryByRole("dialog", { name: /age confirmation/i }),
    ).not.toBeInTheDocument();
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    // PII cleared
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  it("clears PII when age-affirmation checkbox is unchecked (email/password path)", () => {
    render(<DonorRegistration />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    // Check age affirmation
    fireEvent.click(screen.getByRole("checkbox"));
    // Uncheck — PII should be cleared
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  // --- Email / password path: gated by inline age-affirmation checkbox ---

  it("shows validation error for invalid email in password form", async () => {
    render(<DonorRegistration />);
    // Age-affirmation must be checked to enable the submit button
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Or set a password"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "bad@domain" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /create donor account/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("shows validation error for short password", async () => {
    render(<DonorRegistration />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Or set a password"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "short" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /create donor account/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/8 characters/i);
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    render(<DonorRegistration />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Or set a password"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "different456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /create donor account/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/do not match/i);
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("calls signUpWithEmail with correct args on valid password form submission", async () => {
    mockSignUpWithEmail.mockResolvedValueOnce(undefined); // skipcq: JS-W1042 — mockResolvedValueOnce requires an argument
    render(<DonorRegistration />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Or set a password"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /create donor account/i }),
    );
    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        "donor@example.com",
        "password123",
        { type: "donor" },
      );
    });
  });

  it("email/password submit button is disabled until age-affirmation is checked", () => {
    render(<DonorRegistration />);
    fireEvent.click(screen.getByText("Or set a password"));
    const submitBtn = screen.getByRole("button", {
      name: /create donor account/i,
    });
    // Not yet checked
    expect(submitBtn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(submitBtn).not.toBeDisabled();
  });
});
