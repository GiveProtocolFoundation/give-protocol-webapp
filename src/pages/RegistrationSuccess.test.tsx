import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RegistrationSuccess from "./RegistrationSuccess";
import { supabase } from "@/lib/supabase";

// supabase is auto-mocked via moduleNameMapper → src/test-utils/supabaseMock.js
const mockResend = jest.mocked(supabase.auth.resend);

/**
 * Helper to render RegistrationSuccess with given query params.
 *
 * @param {string} search - Query string (e.g. "?type=donor&email=a@b.com")
 * @returns Rendered result
 */
function renderWithParams(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/registration-success${search}`]}>
      <Routes>
        <Route
          path="/auth/registration-success"
          element={<RegistrationSuccess />}
        />
        <Route path="/auth" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegistrationSuccess", () => {
  beforeEach(() => {
    mockResend.mockReset();
    mockResend.mockResolvedValue({ data: null, error: null });
  });

  it("shows account created heading", () => {
    renderWithParams("?type=donor&email=test@example.com");
    expect(
      screen.getByText("Account created successfully"),
    ).toBeInTheDocument();
  });

  it("shows donor-specific guidance", () => {
    renderWithParams("?type=donor&email=donor@example.com");
    expect(screen.getByText("Welcome to Give Protocol")).toBeInTheDocument();
    expect(screen.getByText(/After verifying your email/)).toBeInTheDocument();
  });

  it("shows charity-vetting guidance", () => {
    renderWithParams("?type=charity-vetting&email=charity@example.com");
    expect(screen.getByText("Application Submitted")).toBeInTheDocument();
    expect(
      screen.getByText(/Your application has been submitted/),
    ).toBeInTheDocument();
  });

  it("shows charity-claim guidance", () => {
    renderWithParams("?type=charity-claim&email=claim@example.com");
    expect(screen.getByText("Claim Submitted")).toBeInTheDocument();
    expect(
      screen.getByText(/Your claim has been submitted/),
    ).toBeInTheDocument();
  });

  it("defaults to donor when type param is missing", () => {
    renderWithParams("?email=test@example.com");
    expect(screen.getByText("Welcome to Give Protocol")).toBeInTheDocument();
  });

  it("displays the email address", () => {
    renderWithParams("?type=donor&email=user@test.com");
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  it("does not show email section when email param is absent", () => {
    renderWithParams("?type=donor");
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("shows resend button", () => {
    renderWithParams("?type=donor&email=a@b.com");
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("shows return to login link pointing to /auth", () => {
    renderWithParams("?type=donor&email=a@b.com");
    const link = screen.getByRole("link", { name: /return to login/i });
    expect(link).toHaveAttribute("href", "/auth");
  });

  it("calls supabase.auth.resend on button click", async () => {
    renderWithParams("?type=donor&email=resend@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: "signup",
        email: "resend@example.com",
      });
    });
  });

  it("shows success confirmation after successful resend", async () => {
    renderWithParams("?type=donor&email=resend@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
    });

    // Button is replaced by success message
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).not.toBeInTheDocument();
  });

  it("shows error message when resend fails", async () => {
    mockResend.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "Rate limit exceeded" },
    });
    renderWithParams("?type=donor&email=fail@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    });
  });

  it("shows error when resend clicked with no email", async () => {
    renderWithParams("?type=donor");

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/No email address found/i)).toBeInTheDocument();
    });

    expect(mockResend).not.toHaveBeenCalled();
  });

  it("shows email verification instruction", () => {
    renderWithParams("?type=donor&email=a@b.com");
    expect(
      screen.getByText(/Please check your email to verify your account/),
    ).toBeInTheDocument();
  });
});
