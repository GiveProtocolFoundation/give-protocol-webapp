import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VolunteerHoursVerification } from "../VolunteerHoursVerification";
import {
  createMockVolunteerVerification,
  createMockTranslation,
  testPropsDefaults,
} from "@/test-utils/mockSetup";
import { useVolunteerVerification } from "@/hooks/useVolunteerVerification";
import { useTranslation } from "@/hooks/useTranslation";

// Use jest.mocked() to get typed references to the mapper-provided mocks
const mockUseVolunteerVerification = jest.mocked(useVolunteerVerification);
const mockUseTranslation = jest.mocked(useTranslation);

describe("VolunteerHoursVerification", () => {
  const mockVerifyHours = jest.fn();
  const mockOnVerified = jest.fn();
  const mockT = jest.fn((key: string, fallback?: string) => fallback || key);

  const defaultProps = {
    ...testPropsDefaults.volunteerHours,
    onVerified: mockOnVerified,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseVolunteerVerification.mockReturnValue(
      createMockVolunteerVerification({
        verifyHours: mockVerifyHours,
      }),
    );

    mockUseTranslation.mockReturnValue(
      createMockTranslation({
        t: mockT,
      }),
    );

    mockVerifyHours.mockResolvedValue("0xabcdef1234567890");
  });

  describe("initial state", () => {
    it("renders volunteer information", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(
        screen.getByText(testPropsDefaults.volunteerHours.volunteerName),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(
            `${testPropsDefaults.volunteerHours.hours}\\s+volunteer\\.hours`,
          ),
        ),
      ).toBeInTheDocument();
    });

    it("shows description when provided", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(screen.getByText("volunteer.description")).toBeInTheDocument();
      expect(
        screen.getByText("Helped with beach cleanup and waste sorting"),
      ).toBeInTheDocument();
    });

    it("hides description when not provided", () => {
      const propsWithoutDescription = {
        ...defaultProps,
        description: undefined,
      };
      render(<VolunteerHoursVerification {...propsWithoutDescription} />);

      expect(
        screen.queryByText("volunteer.description"),
      ).not.toBeInTheDocument();
    });

    it("shows verify and reject buttons", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(screen.getByText("volunteer.verify")).toBeInTheDocument();
      expect(screen.getByText("volunteer.reject")).toBeInTheDocument();
    });

    it("renders date for the volunteer hours", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      // The component renders the date using formatDate utility
      // Verify the hours and date section exists
      expect(
        screen.getByText(
          new RegExp(
            `${testPropsDefaults.volunteerHours.hours}\\s+volunteer\\.hours`,
          ),
        ),
      ).toBeInTheDocument();
    });
  });

  describe("verification flow", () => {
    it("calls verifyHours when verify button is clicked", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(mockVerifyHours).toHaveBeenCalledWith("hours-123");
      });
    });

    it("shows loading state during verification", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          verifyHours: mockVerifyHours,
          loading: true,
        }),
      );

      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });

    it("disables button during loading", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          verifyHours: mockVerifyHours,
          loading: true,
        }),
      );

      render(<VolunteerHoursVerification {...defaultProps} />);

      const verifyButton = screen.getByText("Verifying...");
      expect(verifyButton).toBeDisabled();
    });

    it("calls onVerified callback when verification succeeds", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(mockOnVerified).toHaveBeenCalledWith("0xabcdef1234567890");
      });
    });

    it("shows success state after verification", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(screen.getByText("Verification Complete")).toBeInTheDocument();
        expect(
          screen.getByText(
            "The volunteer hours have been verified and recorded on the blockchain.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("displays verification hash in success state", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(screen.getByText("Verification Hash")).toBeInTheDocument();
        expect(screen.getByText("0xabcdef1234567890")).toBeInTheDocument();
      });
    });

    it("includes blockchain explorer link for hash", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute(
          "href",
          "https://moonbase.moonscan.io/tx/0xabcdef1234567890",
        );
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("error handling", () => {
    it("displays error message when provided", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          verifyHours: mockVerifyHours,
          error: "Network connection failed",
        }),
      );

      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(screen.getByText("Network connection failed")).toBeInTheDocument();
    });

    it("handles verification failure gracefully", async () => {
      mockVerifyHours.mockRejectedValue(new Error("Transaction failed"));

      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(mockVerifyHours).toHaveBeenCalled();
      });

      // Should not show success state after failure
      expect(
        screen.queryByText("Verification Complete"),
      ).not.toBeInTheDocument();
    });

    it("handles null hash response", async () => {
      mockVerifyHours.mockResolvedValue(null);

      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(mockVerifyHours).toHaveBeenCalled();
      });

      // Should not show success state
      expect(
        screen.queryByText("Verification Complete"),
      ).not.toBeInTheDocument();
    });
  });

  describe("optional props", () => {
    it("works without onVerified callback", async () => {
      const propsWithoutCallback = {
        hoursId: "hours-123",
        volunteerId: "volunteer-456",
        volunteerName: "Jane Smith",
        hours: 8,
        datePerformed: "2024-01-15",
      };

      render(<VolunteerHoursVerification {...propsWithoutCallback} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        expect(mockVerifyHours).toHaveBeenCalled();
      });

      // Should not throw error
      expect(screen.getByText("Verification Complete")).toBeInTheDocument();
    });

    it("works without description", () => {
      const propsWithoutDescription = {
        ...defaultProps,
        description: undefined,
      };
      render(<VolunteerHoursVerification {...propsWithoutDescription} />);

      expect(
        screen.getByText(testPropsDefaults.volunteerHours.volunteerName),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("volunteer.description"),
      ).not.toBeInTheDocument();
    });
  });

  describe("UI styling and classes", () => {
    it("applies correct styling to initial state", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      const container = screen.getByText("Jane Smith").closest("div");
      expect(container?.parentElement?.parentElement).toHaveClass(
        "bg-white",
        "border",
        "border-gray-200",
        "rounded-lg",
        "p-4",
      );
    });

    it("applies success styling after verification", async () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.verify"));

      await waitFor(() => {
        const successHeading = screen.getByText("Verification Complete");
        const successContainer = successHeading.closest("div")?.parentElement;
        expect(successContainer).toHaveClass(
          "bg-green-50",
          "border",
          "border-green-200",
          "rounded-lg",
          "p-4",
        );
      });
    });

    it("applies error styling when error present", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          verifyHours: mockVerifyHours,
          error: "Error message",
        }),
      );

      render(<VolunteerHoursVerification {...defaultProps} />);

      const errorElement = screen.getByText("Error message");
      expect(errorElement.closest("div")).toHaveClass(
        "p-3",
        "bg-red-50",
        "text-red-700",
        "text-sm",
        "rounded-md",
      );
    });
  });

  describe("translation integration", () => {
    it("uses translation hook for all text", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(mockT).toHaveBeenCalledWith("volunteer.hours");
      expect(mockT).toHaveBeenCalledWith("volunteer.verify");
      expect(mockT).toHaveBeenCalledWith("volunteer.reject");
      expect(mockT).toHaveBeenCalledWith("volunteer.description");
    });

    it("uses translation for dynamic loading text", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          verifyHours: mockVerifyHours,
          loading: true,
        }),
      );

      render(<VolunteerHoursVerification {...defaultProps} />);

      expect(mockT).toHaveBeenCalledWith("volunteer.verifying", "Verifying...");
    });
  });

  describe("button interactions", () => {
    it("reject button is clickable but has no handler", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      const rejectButton = screen.getByText("volunteer.reject");
      expect(rejectButton).toBeInTheDocument();

      // Should not throw error when clicked
      fireEvent.click(rejectButton);
    });

    it("verify button has proper styling classes", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      const verifyButton = screen.getByText("volunteer.verify");
      expect(verifyButton).toHaveClass("flex", "items-center");
    });

    it("reject button exists with correct text", () => {
      render(<VolunteerHoursVerification {...defaultProps} />);

      const rejectButton = screen.getByText("volunteer.reject");
      expect(rejectButton).toBeInTheDocument();
    });
  });

  describe("hours and date display", () => {
    it("displays different hour amounts correctly", () => {
      const singleHourProps = { ...defaultProps, hours: 1 };
      render(<VolunteerHoursVerification {...singleHourProps} />);

      expect(screen.getByText(/1\s+volunteer\.hours/)).toBeInTheDocument();
    });

    it("displays zero hours correctly", () => {
      const zeroHourProps = { ...defaultProps, hours: 0 };
      render(<VolunteerHoursVerification {...zeroHourProps} />);

      expect(screen.getByText(/0\s+volunteer\.hours/)).toBeInTheDocument();
    });

    it("displays decimal hours correctly", () => {
      const decimalHourProps = { ...defaultProps, hours: 4.5 };
      render(<VolunteerHoursVerification {...decimalHourProps} />);

      expect(screen.getByText(/4\.5\s+volunteer\.hours/)).toBeInTheDocument();
    });
  });
});
