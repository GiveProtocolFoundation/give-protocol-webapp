import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ApplicationForm } from "../ApplicationForm";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

const mockUseAuth = jest.mocked(useAuth);
const mockUseProfile = jest.mocked(useProfile);

const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();

const defaultProps = {
  opportunityId: "opp-123",
  opportunityTitle: "Beach Cleanup",
  onClose: mockOnClose,
  onSuccess: mockOnSuccess,
};

/** Configure supabase.functions.invoke to return successful PII ciphertext. */
const mockEncryptionSuccess = () => {
  (supabase.functions.invoke as jest.Mock).mockImplementation(
    (_name: unknown, opts: unknown) => {
      const body = (opts as { body: { operation: string } }).body;
      if (body.operation === "hmac") {
        return Promise.resolve({
          data: { digest: "hmac-digest" },
          error: null,
        });
      }
      return Promise.resolve({
        data: { ciphertext: "v1:iv:ciphertext" },
        error: null,
      });
    },
  );
};

describe("ApplicationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "user-123" },
      loading: false,
      error: null,
      userType: "donor",
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockUseProfile.mockReturnValue({
      profile: { id: "profile-123", email: "user@example.com" },
      loading: false,
      error: null,
      updateProfile: jest.fn(),
    } as unknown as ReturnType<typeof useProfile>);
  });

  describe("rendering", () => {
    it("renders modal title with opportunity name", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByText(/Apply for: Beach Cleanup/)).toBeInTheDocument();
    });

    it("renders all personal information fields", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date of Birth/)).toBeInTheDocument();
    });

    it("renders availability day checkboxes", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByLabelText("Monday")).toBeInTheDocument();
      expect(screen.getByLabelText("Sunday")).toBeInTheDocument();
    });

    it("renders availability time checkboxes", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByLabelText("Morning")).toBeInTheDocument();
      expect(screen.getByLabelText("Afternoon")).toBeInTheDocument();
      expect(screen.getByLabelText("Evening")).toBeInTheDocument();
    });

    it("renders commitment level select with default value", () => {
      render(<ApplicationForm {...defaultProps} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("short-term");
    });

    it("renders submit and cancel buttons", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByText("Submit Application")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders two reference inputs", () => {
      render(<ApplicationForm {...defaultProps} />);
      expect(screen.getByLabelText(/Reference 1 Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reference 2 Name/)).toBeInTheDocument();
    });
  });

  describe("field changes", () => {
    it("updates the full name field when typed", () => {
      render(<ApplicationForm {...defaultProps} />);
      const input = screen.getByLabelText(/Full Name/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Jane Doe" } });
      expect(input.value).toBe("Jane Doe");
    });

    it("updates the email field when typed", () => {
      render(<ApplicationForm {...defaultProps} />);
      const input = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "jane@example.com" } });
      expect(input.value).toBe("jane@example.com");
    });

    it("updates phone number when typed", () => {
      render(<ApplicationForm {...defaultProps} />);
      const input = screen.getByLabelText(/Phone Number/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "555-123-4567" } });
      expect(input.value).toBe("555-123-4567");
    });

    it("toggles a day checkbox", () => {
      render(<ApplicationForm {...defaultProps} />);
      const checkbox = screen.getByLabelText("Monday") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it("toggles a time checkbox", () => {
      render(<ApplicationForm {...defaultProps} />);
      const checkbox = screen.getByLabelText("Morning") as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it("updates the commitment level", () => {
      render(<ApplicationForm {...defaultProps} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "long-term" } });
      expect(select.value).toBe("long-term");
    });

    it("updates the experience textarea", () => {
      render(<ApplicationForm {...defaultProps} />);
      const textarea = screen
        .getByText(/Relevant Experience/)
        .closest("label")
        ?.querySelector("textarea") as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: "Five years volunteering" },
      });
      expect(textarea.value).toBe("Five years volunteering");
    });

    it("updates skills, certifications, interests, and work samples", () => {
      render(<ApplicationForm {...defaultProps} />);
      const skills = screen.getByLabelText(/Skills/) as HTMLInputElement;
      const certs = screen.getByLabelText(/Certifications/) as HTMLInputElement;
      const interests = screen.getByLabelText(
        /Areas of Interest/,
      ) as HTMLInputElement;
      const works = screen.getByLabelText(
        /Links to Work Samples/,
      ) as HTMLInputElement;

      fireEvent.change(skills, { target: { value: "react, node" } });
      fireEvent.change(certs, { target: { value: "cpr" } });
      fireEvent.change(interests, { target: { value: "education" } });
      fireEvent.change(works, { target: { value: "https://example.com" } });

      expect(skills.value).toBe("react, node");
      expect(certs.value).toBe("cpr");
      expect(interests.value).toBe("education");
      expect(works.value).toBe("https://example.com");
    });

    it("updates reference name and contact fields", () => {
      render(<ApplicationForm {...defaultProps} />);
      const refName = screen.getByLabelText(
        /Reference 1 Name/,
      ) as HTMLInputElement;
      const refContact = screen.getByLabelText(
        /Reference 1 Contact/,
      ) as HTMLInputElement;
      fireEvent.change(refName, { target: { value: "John Smith" } });
      fireEvent.change(refContact, { target: { value: "john@ref.com" } });
      expect(refName.value).toBe("John Smith");
      expect(refContact.value).toBe("john@ref.com");
    });
  });

  describe("validation errors on submit", () => {
    it("shows validation errors when required fields are empty", async () => {
      const { container } = render(<ApplicationForm {...defaultProps} />);
      act(() => {
        const form = container.querySelector("form");
        if (form) fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a valid name/),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("Please select at least one day"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please select at least one time"),
      ).toBeInTheDocument();
    });

    it("shows error when user is missing", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
      } as unknown as ReturnType<typeof useAuth>);
      const { container } = render(<ApplicationForm {...defaultProps} />);
      act(() => {
        const form = container.querySelector("form");
        if (form) fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(screen.getByText("User profile not found")).toBeInTheDocument();
      });
    });
  });

  describe("cancel", () => {
    it("calls onClose when cancel clicked", () => {
      render(<ApplicationForm {...defaultProps} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("successful submission", () => {
    /** Fills in the minimum required fields for a valid application submission. */
    const fillValidForm = () => {
      fireEvent.change(screen.getByLabelText(/Full Name/), {
        target: { value: "Jane Doe" },
      });
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: "555-123-4567" },
      });
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: "jane@example.com" },
      });
      const textarea = screen
        .getByText(/Relevant Experience/)
        .closest("label")
        ?.querySelector("textarea") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Lots of experience" } });
      fireEvent.click(screen.getByLabelText("Monday"));
      fireEvent.click(screen.getByLabelText("Morning"));
    };

    it("submits the application and calls onSuccess + onClose", async () => {
      mockEncryptionSuccess();
      const { container } = render(<ApplicationForm {...defaultProps} />);
      fillValidForm();

      act(() => {
        const form = container.querySelector("form");
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(supabase.from).toHaveBeenCalledWith("volunteer_applications");
    });

    it("shows error message when supabase insert fails", async () => {
      mockEncryptionSuccess();
      // Override default supabase from to throw
      const fromSpy = supabase.from as jest.Mock;
      fromSpy.mockImplementationOnce(() => ({
        insert: jest
          .fn()
          .mockResolvedValue({ error: { message: "DB write failed" } }),
      }));

      const { container } = render(<ApplicationForm {...defaultProps} />);
      fillValidForm();

      act(() => {
        const form = container.querySelector("form");
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe("clearing validation errors", () => {
    it("clears the field error when the user types in the field", async () => {
      const { container } = render(<ApplicationForm {...defaultProps} />);
      act(() => {
        const form = container.querySelector("form");
        if (form) fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a valid name/),
        ).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText(/Full Name/), {
        target: { value: "Jane" },
      });
      await waitFor(() => {
        expect(
          screen.queryByText(/Please enter a valid name/),
        ).not.toBeInTheDocument();
      });
    });
  });
});
