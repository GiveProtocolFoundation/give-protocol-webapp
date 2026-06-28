import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApplicationAcceptance } from "../ApplicationAcceptance";
import {
  createMockVolunteerVerification,
  createMockTranslation,
  testPropsDefaults,
} from "@/test-utils/mockSetup";
import { cssClasses } from "@/test-utils/types";
import { useVolunteerVerification } from "@/hooks/useVolunteerVerification";
import { useTranslation } from "@/hooks/useTranslation";

// Use jest.mocked() to get typed references to the mapper-provided mocks
const mockUseVolunteerVerification = jest.mocked(useVolunteerVerification);
const mockUseTranslation = jest.mocked(useTranslation);

describe("ApplicationAcceptance", () => {
  const mockAcceptApplication = jest.fn();
  const mockOnAccepted = jest.fn();
  const mockT = jest.fn((key: string, fallback?: string) => fallback || key);

  const defaultProps = {
    ...testPropsDefaults.applicationAcceptance,
    onAccepted: mockOnAccepted,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseVolunteerVerification.mockReturnValue(
      createMockVolunteerVerification({
        acceptApplication: mockAcceptApplication,
      }),
    );

    mockUseTranslation.mockReturnValue(
      createMockTranslation({
        t: mockT,
      }),
    );

    mockAcceptApplication.mockResolvedValue("0x1234567890abcdef");
  });

  describe("initial state", () => {
    it("renders the application card with applicant information", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      expect(
        screen.getByText(testPropsDefaults.applicationAcceptance.applicantName),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(testPropsDefaults.applicationAcceptance.opportunityTitle),
        ),
      ).toBeInTheDocument();
    });

    it("shows accept and reject buttons", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      expect(screen.getByText("volunteer.accept")).toBeInTheDocument();
      expect(screen.getByText("volunteer.reject")).toBeInTheDocument();
    });

    it("does not show acceptance hash initially", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      expect(screen.queryByText("Acceptance Hash")).not.toBeInTheDocument();
    });
  });

  describe("acceptance flow", () => {
    it("calls acceptApplication when accept button is clicked", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(mockAcceptApplication).toHaveBeenCalledWith("app-123");
      });
    });

    it("shows loading state during acceptance", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          acceptApplication: mockAcceptApplication,
          loading: true,
        }),
      );

      render(<ApplicationAcceptance {...defaultProps} />);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("disables button during loading", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          acceptApplication: mockAcceptApplication,
          loading: true,
        }),
      );

      render(<ApplicationAcceptance {...defaultProps} />);

      const acceptButton = screen.getByText("Processing...");
      expect(acceptButton).toBeDisabled();
    });

    it("calls onAccepted callback when acceptance succeeds", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(mockOnAccepted).toHaveBeenCalledWith("0x1234567890abcdef");
      });
    });

    it("shows success state after acceptance", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(screen.getByText("Application Accepted")).toBeInTheDocument();
        expect(
          screen.getByText(
            "The volunteer application has been accepted and recorded on the blockchain.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("displays acceptance hash in success state", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(screen.getByText("Acceptance Hash")).toBeInTheDocument();
        expect(screen.getByText("0x1234567890abcdef")).toBeInTheDocument();
      });
    });

    it("includes blockchain explorer link for hash", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute(
          "href",
          "https://moonbase.moonscan.io/tx/0x1234567890abcdef",
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
          acceptApplication: mockAcceptApplication,
          error: "Connection failed",
        }),
      );

      render(<ApplicationAcceptance {...defaultProps} />);

      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });

    it("handles acceptance failure gracefully", async () => {
      mockAcceptApplication.mockRejectedValue(new Error("Transaction failed"));

      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(mockAcceptApplication).toHaveBeenCalled();
      });

      // Should not show success state after failure
      expect(
        screen.queryByText("Application Accepted"),
      ).not.toBeInTheDocument();
    });

    it("handles null hash response", async () => {
      mockAcceptApplication.mockResolvedValue(null);

      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(mockAcceptApplication).toHaveBeenCalled();
      });

      // Should not show success state
      expect(
        screen.queryByText("Application Accepted"),
      ).not.toBeInTheDocument();
    });
  });

  describe("optional props", () => {
    it("works without onAccepted callback", async () => {
      const propsWithoutCallback = testPropsDefaults.applicationAcceptance;

      render(<ApplicationAcceptance {...propsWithoutCallback} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        expect(mockAcceptApplication).toHaveBeenCalled();
      });

      // Should not throw error
      expect(screen.getByText("Application Accepted")).toBeInTheDocument();
    });
  });

  describe("UI styling and classes", () => {
    it("applies correct styling to initial state", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      const container = screen
        .getByText(testPropsDefaults.applicationAcceptance.applicantName)
        .closest("div");
      expect(container?.parentElement?.parentElement).toHaveClass(
        ...cssClasses.card.default,
      );
    });

    it("applies success styling after acceptance", async () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      fireEvent.click(screen.getByText("volunteer.accept"));

      await waitFor(() => {
        const successHeading = screen.getByText("Application Accepted");
        const successContainer = successHeading.closest("div")?.parentElement;
        expect(successContainer).toHaveClass(...cssClasses.card.success);
      });
    });

    it("applies error styling when error present", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          acceptApplication: mockAcceptApplication,
          error: "Error message",
        }),
      );

      render(<ApplicationAcceptance {...defaultProps} />);

      const errorElement = screen.getByText("Error message");
      expect(errorElement.closest("div")).toHaveClass(...cssClasses.card.error);
    });
  });

  describe("translation integration", () => {
    it("uses translation hook for all text", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      expect(mockT).toHaveBeenCalledWith("volunteer.appliedFor");
      expect(mockT).toHaveBeenCalledWith("volunteer.accept");
      expect(mockT).toHaveBeenCalledWith("volunteer.reject");
    });

    it("uses translation for dynamic loading text", () => {
      mockUseVolunteerVerification.mockReturnValue(
        createMockVolunteerVerification({
          acceptApplication: mockAcceptApplication,
          loading: true,
        }),
      );

      render(<ApplicationAcceptance {...defaultProps} />);

      expect(mockT).toHaveBeenCalledWith(
        "volunteer.processing",
        "Processing...",
      );
    });
  });

  describe("button interactions", () => {
    it("reject button is clickable but has no handler", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      const rejectButton = screen.getByText("volunteer.reject");
      expect(rejectButton).toBeInTheDocument();

      // Should not throw error when clicked
      fireEvent.click(rejectButton);
    });

    it("accept button has proper styling classes", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      const acceptButton = screen.getByText("volunteer.accept");
      expect(acceptButton).toHaveClass(...cssClasses.button.primary);
    });

    it("reject button exists with correct text", () => {
      render(<ApplicationAcceptance {...defaultProps} />);

      const rejectButton = screen.getByText("volunteer.reject");
      expect(rejectButton).toBeInTheDocument();
    });
  });
});
