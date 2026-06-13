import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { VolunteerApplicationForm } from "../VolunteerApplicationForm";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

const mockUseAuth = jest.mocked(useAuth);
const mockUseProfile = jest.mocked(useProfile);
const mockUseToast = jest.mocked(useToast);

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

const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();
const mockShowToast = jest.fn();

const defaultProps = {
  opportunityId: "opp-123",
  opportunityTitle: "Tutor Children",
  charityId: "charity-1",
  onClose: mockOnClose,
  onSuccess: mockOnSuccess,
};

/** Fills the form with valid data; returns no value. */
const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText(/First Name/), {
    target: { value: "Jane" },
  });
  fireEvent.change(screen.getByLabelText(/Last Name/), {
    target: { value: "Doe" },
  });
  fireEvent.change(screen.getByLabelText(/Email Address/), {
    target: { value: "jane@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/Age Range/), {
    target: { value: "25-34" },
  });
  fireEvent.change(
    screen.getByLabelText(/Tell us about your relevant experience/),
    {
      target: { value: "Lots of experience here" },
    },
  );

  // Add a skill via Enter
  const skillInput = screen.getByPlaceholderText(/Start typing your skills/);
  fireEvent.change(skillInput, { target: { value: "React" } });
  fireEvent.keyDown(skillInput, { key: "Enter" });

  // Check required consents — labels are duplicated (label htmlFor + strong text),
  // so click the checkbox inputs directly via their ids.
  const essential = document.getElementById(
    "essential-processing",
  ) as HTMLInputElement;
  const age = document.getElementById("age-confirmation") as HTMLInputElement;
  const privacy = document.getElementById("privacy-notice") as HTMLInputElement;
  fireEvent.click(essential);
  fireEvent.click(age);
  fireEvent.click(privacy);
};

/** Submits the form by dispatching submit on the inner form element. */
const submitForm = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (form) {
    act(() => {
      fireEvent.submit(form);
    });
  }
};

describe("VolunteerApplicationForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEncryptionSuccess();
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
      profile: {
        id: "profile-123",
        email: "saved@example.com",
        phone_number: "555-555-5555",
      },
      loading: false,
      error: null,
      updateProfile: jest.fn(),
    } as unknown as ReturnType<typeof useProfile>);
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  describe("rendering", () => {
    it("renders dialog with title and subtitle", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      expect(
        screen.getByText("Volunteer Opportunity Application"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Help create sustainable impact/),
      ).toBeInTheDocument();
    });

    it("renders all personal information fields", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Time Zone/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Age Range/)).toBeInTheDocument();
    });

    it("renders the three section headers", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(screen.getByText("Skills & Interests")).toBeInTheDocument();
      expect(screen.getByText("Consent & Agreement")).toBeInTheDocument();
    });

    it("renders the three commitment options", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      expect(
        screen.getByLabelText(/One-time commitment level/),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Short-Term commitment level/),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Long-Term commitment level/),
      ).toBeInTheDocument();
    });

    it("pre-fills email and phone from profile", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const email = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      const phone = screen.getByLabelText(/Phone Number/) as HTMLInputElement;
      expect(email.value).toBe("saved@example.com");
      expect(phone.value).toBe("555-555-5555");
    });

    it("renders the consent panel with checkboxes", async () => {
      await act(async () => {
        render(<VolunteerApplicationForm {...defaultProps} />);
      });
      expect(document.getElementById("essential-processing")).not.toBeNull();
      expect(document.getElementById("age-confirmation")).not.toBeNull();
      expect(document.getElementById("privacy-notice")).not.toBeNull();
    });

    it("renders the submit button", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      expect(
        screen.getByText("Submit Volunteer Application"),
      ).toBeInTheDocument();
    });
  });

  describe("backdrop interactions", () => {
    it("calls onClose when backdrop is clicked", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const backdrop = screen.getByLabelText("Close modal");
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape is pressed on backdrop", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const backdrop = screen.getByLabelText("Close modal");
      fireEvent.keyDown(backdrop, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close on non-Escape keys", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const backdrop = screen.getByLabelText("Close modal");
      fireEvent.keyDown(backdrop, { key: "Enter" });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("skill tag handling", () => {
    it("adds a skill on Enter key", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Cooking" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("Cooking")).toBeInTheDocument();
    });

    it("adds a skill on comma key", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Painting" } });
      fireEvent.keyDown(input, { key: "," });
      expect(screen.getByText("Painting")).toBeInTheDocument();
    });

    it("removes the last skill on Backspace when input is empty", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Music" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("Music")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Backspace" });
      expect(screen.queryByText("Music")).not.toBeInTheDocument();
    });

    it("does not add duplicate skills", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Type a skill and press Enter|Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Music" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.change(input, { target: { value: "Music" } });
      fireEvent.keyDown(input, { key: "Enter" });
      // Only one tag rendered
      expect(screen.getAllByText("Music")).toHaveLength(1);
    });

    it("removes a skill when its remove button is clicked", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Yoga" } });
      fireEvent.keyDown(input, { key: "Enter" });
      const removeBtn = screen.getByLabelText(/Remove Yoga/);
      fireEvent.click(removeBtn);
      expect(screen.queryByText("Yoga")).not.toBeInTheDocument();
    });

    it("ignores Backspace when input has text", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        /Start typing your skills/,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Skill1" } });
      fireEvent.keyDown(input, { key: "Enter" });
      // Type something before backspace — should not remove existing skill
      fireEvent.change(input, { target: { value: "abc" } });
      fireEvent.keyDown(input, { key: "Backspace" });
      expect(screen.getByText("Skill1")).toBeInTheDocument();
    });
  });

  describe("commitment level selection", () => {
    it("changes the commitment when a different option is clicked", () => {
      render(<VolunteerApplicationForm {...defaultProps} />);
      const longTerm = document.getElementById(
        "commitment-long-term",
      ) as HTMLInputElement;
      fireEvent.click(longTerm);
      expect(longTerm.checked).toBe(true);
    });
  });

  describe("validation", () => {
    it("shows validation errors when submitting empty form", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      // Clear pre-filled fields to trigger validation errors
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: "" },
      });
      submitForm(container);

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid first name"),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("Please enter a valid last name"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please describe your relevant experience"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please add at least one skill"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please select your age range"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("You must agree to all required consent items"),
      ).toBeInTheDocument();
    });

    it("validates phone number when provided", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: "12" },
      });
      submitForm(container);
      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid phone number"),
        ).toBeInTheDocument();
      });
    });

    it("clears a field error when the field is edited", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      submitForm(container);
      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid first name"),
        ).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText(/First Name/), {
        target: { value: "Jane" },
      });
      await waitFor(() => {
        expect(
          screen.queryByText("Please enter a valid first name"),
        ).not.toBeInTheDocument();
      });
    });

    it("clears the consent error when a consent checkbox is changed", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      submitForm(container);
      await waitFor(() => {
        expect(
          screen.getByText("You must agree to all required consent items"),
        ).toBeInTheDocument();
      });
      const essential = document.getElementById(
        "essential-processing",
      ) as HTMLInputElement;
      fireEvent.click(essential);
      await waitFor(() => {
        expect(
          screen.queryByText("You must agree to all required consent items"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("submission", () => {
    it("submits the form successfully with valid data", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("volunteer_applications");
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Application submitted successfully!",
        );
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("shows error toast when supabase insert fails", async () => {
      const fromSpy = supabase.from as jest.Mock;
      fromSpy.mockImplementationOnce(() => ({
        insert: jest
          .fn()
          .mockResolvedValue({ error: { message: "DB write failed" } }),
      }));

      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Failed to submit application. Please try again.",
        );
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("shows toast and aborts when user is not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
      } as unknown as ReturnType<typeof useAuth>);
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Please log in to submit an application",
        );
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("does not submit if validation fails", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      // Don't fill anything and clear pre-filled email
      fireEvent.change(screen.getByLabelText(/Email Address/), {
        target: { value: "" },
      });
      submitForm(container);
      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid first name"),
        ).toBeInTheDocument();
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("encrypted PII columns (GIV-409)", () => {
    let insertMock: jest.Mock;

    beforeEach(() => {
      mockEncryptionSuccess();
      insertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockImplementation(() => ({
        insert: insertMock,
      }));
    });

    it("calls supabase.functions.invoke for encrypt + hmac before insert", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalled();
      });

      const calls = (supabase.functions.invoke as jest.Mock).mock.calls;
      const operations = calls.map(
        (c: [string, { body: { operation: string } }]) => c[1].body.operation,
      );
      expect(operations).toContain("encrypt");
      expect(operations).toContain("hmac");
      // Encryption must have been called before insert
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("insert payload contains full_name_encrypted, email_encrypted, email_hmac", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledTimes(1);
      });

      const payload = insertMock.mock.calls[0][0];
      expect(payload.full_name_encrypted).toBe("v1:iv:ciphertext");
      expect(payload.email_encrypted).toBe("v1:iv:ciphertext");
      expect(payload.email_hmac).toBe("hmac-digest");
    });

    it("insert payload does NOT contain phone_number (plaintext dropped)", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledTimes(1);
      });

      const payload = insertMock.mock.calls[0][0];
      // phone_number plaintext dropped — nullable column with no audited reader
      expect(
        Object.prototype.hasOwnProperty.call(payload, "phone_number"),
      ).toBe(false);
    });

    it("insert payload retains full_name and email plaintext (NOT NULL + active readers — GIV-59 step 2 follow-up)", async () => {
      // Plaintext retained because:
      // - full_name: NOT NULL constraint + CharityPortal.tsx:847 reads it
      // - email: NOT NULL constraint, retire in lockstep with full_name
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      submitForm(container);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledTimes(1);
      });

      const payload = insertMock.mock.calls[0][0];
      expect(payload.full_name).toBe("Jane Doe");
      expect(payload.email).toBe("jane@example.com");
    });

    it("includes phone_encrypted when phone is provided", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      // Add phone number
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: "+1234567890" },
      });
      submitForm(container);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledTimes(1);
      });

      const payload = insertMock.mock.calls[0][0];
      expect(payload.phone_encrypted).toBe("v1:iv:ciphertext");
    });

    it("omits phone_encrypted when phone is empty", async () => {
      const { container } = render(
        <VolunteerApplicationForm {...defaultProps} />,
      );
      fillValidForm();
      // Clear the pre-filled phone
      fireEvent.change(screen.getByLabelText(/Phone Number/), {
        target: { value: "" },
      });
      submitForm(container);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledTimes(1);
      });

      const payload = insertMock.mock.calls[0][0];
      expect(
        Object.prototype.hasOwnProperty.call(payload, "phone_encrypted"),
      ).toBe(false);
    });
  });
});
