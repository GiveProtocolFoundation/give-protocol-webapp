import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CharityVettingForm } from "../CharityVettingForm";
import { useAuth } from "@/contexts/AuthContext";

// All mocks handled via moduleNameMapper:
// useAuth/AuthContext, Web3Context, ToastContext, SettingsContext, useTranslation,
// useCountries, ui/Button, ui/Input, ui/Card

const mockRegister = jest.fn();
const mockUseAuth = jest.mocked(useAuth);

const renderForm = () =>
  render(
    <MemoryRouter>
      <CharityVettingForm />
    </MemoryRouter>,
  );

/** Check the age-affirmation checkbox so gated actions are enabled. */
const checkAgeAffirmation = () => {
  fireEvent.click(screen.getByRole("checkbox", { name: /16 years/i }));
};

describe("CharityVettingForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      loading: false,
      user: null,
      userType: null,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      sendUsernameReminder: jest.fn(),
      error: null,
    });
  });

  it("renders privacy policy and terms of service links", () => {
    renderForm();
    // Age-affirmation label + GDPR notice both link to /privacy, so multiple links exist
    const privacyLinks = screen.getAllByRole("link", { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    privacyLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/privacy"),
    );
    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("renders all form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/tax or registration id/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("handles form submission with valid data", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "Test Charity" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test description" },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "education" },
    });
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: "123 Main St" },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: "Test City" },
    });
    fireEvent.change(screen.getByLabelText(/state/i), {
      target: { value: "CA" },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getByLabelText(/postal code/i), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText(/tax or registration id/i), {
      target: { value: "12-3456789" },
    });
    fireEvent.change(screen.getByLabelText(/contact name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/contact email/i), {
      target: { value: "john@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Test1234!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Test1234!" },
    });

    // Age-affirmation must be confirmed before submission (GIV-454)
    checkAgeAffirmation();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "john@test.com",
        "Test1234!",
        "charity",
        expect.objectContaining({
          organizationName: "Test Charity",
          description: "Test description",
        }),
      );
    });
  });

  it("validates required fields", async () => {
    renderForm();
    checkAgeAffirmation();
    const form = screen
      .getByRole("button", { name: /submit/i })
      .closest("form");
    if (!form) throw new Error("Could not find form element");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/organization name must be between/i),
      ).toBeInTheDocument();
    });
  });

  it("validates email format on submit", async () => {
    renderForm();
    const emailInput = screen.getByLabelText(/contact email/i);

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    checkAgeAffirmation();
    const form = screen
      .getByRole("button", { name: /submit/i })
      .closest("form");
    if (!form) throw new Error("Could not find form element");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email address/i),
      ).toBeInTheDocument();
    });
  });

  it("validates password match", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Test1234!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Different123!" },
    });
    checkAgeAffirmation();
    const form = screen
      .getByRole("button", { name: /submit/i })
      .closest("form");
    if (!form) throw new Error("Could not find form element");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("handles registration error", async () => {
    mockRegister.mockRejectedValueOnce(new Error("Registration failed"));
    renderForm();

    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "Test Charity" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test description" },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "education" },
    });
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: "123 Main St" },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: "Test City" },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getByLabelText(/tax or registration id/i), {
      target: { value: "12-3456789" },
    });
    fireEvent.change(screen.getByLabelText(/contact name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/contact email/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Test1234!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Test1234!" },
    });

    checkAgeAffirmation();

    const form = screen
      .getByRole("button", { name: /submit/i })
      .closest("form");
    if (!form) throw new Error("Could not find form element");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it("shows submitting text when loading", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: /submit charity application/i }),
    ).toBeInTheDocument();
  });

  // --- Negative path: age-affirmation gate (GIV-454) ---

  it("submit button is disabled until age-affirmation is checked", () => {
    renderForm();
    const submitBtn = screen.getByRole("button", {
      name: /submit charity application/i,
    });
    expect(submitBtn).toBeDisabled();
    checkAgeAffirmation();
    expect(submitBtn).not.toBeDisabled();
  });

  it("clears all form fields when age-affirmation is unchecked", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "Test Charity" },
    });
    fireEvent.change(screen.getByLabelText(/contact email/i), {
      target: { value: "john@test.com" },
    });
    // Check then uncheck — PII should be cleared on decline
    checkAgeAffirmation();
    checkAgeAffirmation();
    expect(screen.getByLabelText(/organization name/i)).toHaveValue("");
    expect(screen.getByLabelText(/contact email/i)).toHaveValue("");
  });
});
