import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMockAuth } from "@/test-utils/mockSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
  submitCharityRequest,
  hasUserRequestedCharity,
} from "@/services/charityDataService";
import { RequestCharityWidget } from "../RequestCharityWidget";

// Card, Button, useAuth, useToast, and charityDataService are mocked via moduleNameMapper

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);
const mockSubmitCharityRequest = jest.mocked(submitCharityRequest);
const mockHasUserRequestedCharity = jest.mocked(hasUserRequestedCharity);

const defaultProps = {
  ein: "12-3456789",
  charityName: "Test Charity Foundation",
};

const renderWidget = (props = defaultProps) =>
  render(<RequestCharityWidget {...props} />);

describe("RequestCharityWidget", () => {
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(
      createMockAuth({ user: { id: "user-1", email: "user@test.com" } }),
    );
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockHasUserRequestedCharity.mockResolvedValue(false);
    mockSubmitCharityRequest.mockResolvedValue(true);
  });

  describe("Widget rendering", () => {
    it("renders the widget card", () => {
      renderWidget();
      expect(screen.getByText("Information Only")).toBeInTheDocument();
    });

    it("renders information text about unclaimed profile", () => {
      renderWidget();
      expect(
        screen.getByText(/has not yet claimed their profile/),
      ).toBeInTheDocument();
    });

    it("renders outreach text", () => {
      renderWidget();
      expect(screen.getByText(/Let us know you/)).toBeInTheDocument();
    });
  });

  describe("Authenticated user", () => {
    it("shows request button for authenticated user", () => {
      renderWidget();
      expect(screen.getByText("Request this Charity")).toBeInTheDocument();
    });

    it("shows Requested state when user has already requested", async () => {
      mockHasUserRequestedCharity.mockResolvedValue(true);
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText("Requested")).toBeInTheDocument();
      });
    });

    it("disables button in Requested state", async () => {
      mockHasUserRequestedCharity.mockResolvedValue(true);
      renderWidget();
      await waitFor(() => {
        const button = screen.getByText("Requested");
        expect(button).toBeDisabled();
      });
    });

    it("calls hasUserRequestedCharity on mount", () => {
      renderWidget();
      expect(mockHasUserRequestedCharity).toHaveBeenCalledWith(
        "12-3456789",
        "user-1",
      );
    });

    it("calls submitCharityRequest on request button click", async () => {
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(mockSubmitCharityRequest).toHaveBeenCalledWith(
          "12-3456789",
          "user-1",
        );
      });
    });

    it("shows success toast after successful request", async () => {
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Request submitted",
          expect.stringContaining("Test Charity Foundation"),
        );
      });
    });

    it("shows Requested button after successful submission", async () => {
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(screen.getByText("Requested")).toBeInTheDocument();
      });
    });

    it("shows error toast when request fails", async () => {
      mockSubmitCharityRequest.mockResolvedValue(false);
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Request failed",
          "Please try again later.",
        );
      });
    });
  });

  describe("Unauthenticated user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null }));
    });

    it("shows request button for unauthenticated user", () => {
      renderWidget();
      expect(screen.getByText("Request this Charity")).toBeInTheDocument();
    });

    it("shows sign-in toast when unauthenticated user clicks request", async () => {
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "info",
          "Sign in required",
          "Please sign in to request this charity.",
        );
      });
    });

    it("does not call submitCharityRequest for unauthenticated user", async () => {
      renderWidget();
      fireEvent.click(screen.getByText("Request this Charity"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
      expect(mockSubmitCharityRequest).not.toHaveBeenCalled();
    });

    it("does not check hasUserRequestedCharity without user", () => {
      renderWidget();
      expect(mockHasUserRequestedCharity).not.toHaveBeenCalled();
    });
  });
});
