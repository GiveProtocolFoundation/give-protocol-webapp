import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CharityClaimForm } from "../../auth/CharityClaimForm";
import { supabase } from "@/lib/supabase";
import type { CharityOrganization } from "@/types/charityOrganization";

// All mocks handled via moduleNameMapper:
// supabase, validation, ui/Button, ui/Input, PasswordStrengthBar, logger

const mockSupabase = jest.mocked(supabase);

const mockOrganization: CharityOrganization = {
  id: "org-1",
  ein: "12-3456789",
  name: "Test Charity Foundation",
  city: "San Francisco",
  state: "CA",
  zip: "94102",
  ntee_cd: "B20",
  deductibility: "1",
  is_on_platform: false,
  platform_charity_id: null,
  rank: 1,
  country: "US",
  registry_source: "irs",
  data_source: "bmf",
  data_vintage: "2024-01",
  last_synced_at: null,
};

const mockOnBack = jest.fn();

const renderForm = (
  organization: CharityOrganization = mockOrganization,
  onBack: () => void = mockOnBack,
) =>
  render(
    <MemoryRouter initialEntries={["/claim"]}>
      <Routes>
        <Route
          path="/claim"
          element={
            <CharityClaimForm organization={organization} onBack={onBack} />
          }
        />
        <Route
          path="/auth/registration-success"
          element={<div>Registration success page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

const fillFormFields = () => {
  fireEvent.change(screen.getByLabelText(/contact name/i), {
    target: { name: "contactName", value: "Jane Doe" },
  });
  fireEvent.change(screen.getByLabelText(/contact email/i), {
    target: { name: "contactEmail", value: "jane@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { name: "password", value: "SecurePass1!" },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { name: "confirmPassword", value: "SecurePass1!" },
  });
};

describe("CharityClaimForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Add signUp to auth mock since supabaseMock.js doesn't include it
    (mockSupabase.auth as Record<string, unknown>).signUp = jest
      .fn()
      .mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

    mockSupabase.from("profiles").insert = jest
      .fn()
      .mockResolvedValue({ error: null });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  describe("Rendering", () => {
    it("renders the back to search button", () => {
      renderForm();
      expect(screen.getByText("Back to search")).toBeInTheDocument();
    });

    it("renders organization details from registry", () => {
      renderForm();
      expect(
        screen.getByText("Organization Details (from Registry)"),
      ).toBeInTheDocument();
      expect(screen.getByText("Test Charity Foundation")).toBeInTheDocument();
      expect(screen.getByText("12-3456789")).toBeInTheDocument();
    });

    it("renders location when city, state, and zip are present", () => {
      renderForm();
      expect(screen.getByText("San Francisco, CA, 94102")).toBeInTheDocument();
    });

    it("does not render location when city, state, and zip are all null", () => {
      const orgWithoutLocation: CharityOrganization = {
        ...mockOrganization,
        city: null,
        state: null,
        zip: null,
      };
      renderForm(orgWithoutLocation);
      expect(screen.queryByText("Location:")).not.toBeInTheDocument();
    });

    it("renders contact information fields", () => {
      renderForm();
      expect(screen.getByText("Contact Information")).toBeInTheDocument();
      expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/contact phone/i)).not.toBeInTheDocument();
    });

    it("renders account security fields", () => {
      renderForm();
      expect(screen.getByText("Account Security")).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("renders the submit button with default text", () => {
      renderForm();
      expect(
        screen.getByRole("button", { name: /claim organization/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Back button", () => {
    it("calls onBack when back button is clicked", () => {
      renderForm();
      fireEvent.click(screen.getByText("Back to search"));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("Form input handling", () => {
    it("updates form fields when user types", () => {
      renderForm();
      const nameInput = screen.getByLabelText(
        /contact name/i,
      ) as HTMLInputElement;
      fireEvent.change(nameInput, {
        target: { name: "contactName", value: "John Smith" },
      });
      expect(nameInput.value).toBe("John Smith");
    });

    it("clears error when a field is changed", async () => {
      renderForm();
      // Submit empty form to trigger validation errors
      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/please correct the validation errors/i),
        ).toBeInTheDocument();
      });

      // Change a field to clear errors
      fireEvent.change(screen.getByLabelText(/contact name/i), {
        target: { name: "contactName", value: "Jane" },
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/please correct the validation errors/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Validation", () => {
    it("shows validation errors when submitting empty form", async () => {
      renderForm();
      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/name must be between 2 and 100 characters/i),
        ).toBeInTheDocument();
      });
    });

    it("shows email validation error for invalid email", async () => {
      renderForm();

      fireEvent.change(screen.getByLabelText(/contact name/i), {
        target: { name: "contactName", value: "Jane Doe" },
      });
      fireEvent.change(screen.getByLabelText(/contact email/i), {
        target: { name: "contactEmail", value: "not-an-email" },
      });

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("shows password mismatch error", async () => {
      renderForm();

      fireEvent.change(screen.getByLabelText(/contact name/i), {
        target: { name: "contactName", value: "Jane Doe" },
      });
      fireEvent.change(screen.getByLabelText(/contact email/i), {
        target: { name: "contactEmail", value: "jane@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { name: "password", value: "SecurePass1!" },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { name: "confirmPassword", value: "DifferentPass1!" },
      });

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("shows password length error for short password", async () => {
      renderForm();

      fireEvent.change(screen.getByLabelText(/contact name/i), {
        target: { name: "contactName", value: "Jane Doe" },
      });
      fireEvent.change(screen.getByLabelText(/contact email/i), {
        target: { name: "contactEmail", value: "jane@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { name: "password", value: "short" },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { name: "confirmPassword", value: "short" },
      });

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters long/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Successful submission", () => {
    it("calls supabase signUp with correct data", async () => {
      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        const signUpFn = mockSupabase.auth.signUp as jest.Mock;
        expect(signUpFn).toHaveBeenCalledWith({
          email: "jane@example.com",
          password: "SecurePass1!",
          options: {
            data: {
              type: "charity",
              organizationName: "Test Charity Foundation",
              ein: "12-3456789",
            },
          },
        });
      });
    });

    it("calls supabase rpc to claim the charity profile", async () => {
      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith("claim_charity_profile", {
          p_ein: "12-3456789",
          p_signer_name: "Jane Doe",
          p_signer_email: "jane@example.com",
          p_signer_phone: null,
        });
      });
    });

    it("navigates to registration success page on successful submission", async () => {
      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Registration success page"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    it("shows sign-up error message when auth fails", async () => {
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockResolvedValue({
          data: { user: null },
          error: { message: "Email already registered" },
        });

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Email already registered"),
        ).toBeInTheDocument();
      });
    });

    it("shows error when user ID is missing from sign-up response", async () => {
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockResolvedValue({
          data: { user: null },
          error: null,
        });

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Account creation failed")).toBeInTheDocument();
      });
    });

    it("shows error message when submission throws", async () => {
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows generic error for non-Error thrown values", async () => {
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockRejectedValue("unknown failure");

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to create account"),
        ).toBeInTheDocument();
      });
    });

    it("shows submitting text while form is processing", async () => {
      // Make signUp hang so we can observe the submitting state
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            }),
        );

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /creating account/i }),
        ).toBeInTheDocument();
      });
    });

    it("disables submit button while submitting", async () => {
      (mockSupabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            }),
        );

      renderForm();
      fillFormFields();

      const form = screen
        .getByRole("button", { name: /claim organization/i })
        .closest("form");
      if (!form) throw new Error("Could not find form element");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /creating account/i }),
        ).toBeDisabled();
      });
    });
  });
});
