import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ClaimCharity from "../ClaimCharity";

// Card, Button, LoadingSpinner, and charityProfileService are mocked via moduleNameMapper

import { getCharityProfileByEin } from "@/services/charityProfileService";
import { submitCharityRequest } from "@/services/charityDataService";
import { useAuth } from "@/contexts/AuthContext";

const mockGetProfile = jest.mocked(getCharityProfileByEin);
const mockSubmitRequest = jest.mocked(submitCharityRequest);
const mockUseAuth = jest.mocked(useAuth);

const mockProfile = {
  id: "profile-1",
  ein: "12-3456789",
  name: "Test Charity Foundation",
  mission: "Help communities",
  description: "A test charity",
  category: "Human Services",
  city: "New York",
  state: "NY",
  website: "https://testcharity.org",
  logo_url: null,
  banner_url: null,
  is_claimed: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  verified: false,
  wallet_address: null,
  photos: [],
  total_revenue: 0,
  total_expenses: 0,
  net_assets: 0,
};

const renderClaimCharity = (ein = "12-3456789") =>
  render(
    <MemoryRouter initialEntries={[`/claim/${ein}`]}>
      <Routes>
        <Route path="/claim/:ein" element={<ClaimCharity />} />
        <Route
          path="/auth/registration-success"
          element={<div data-testid="registration-success-page">Success</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ClaimCharity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProfile.mockResolvedValue(mockProfile);
    mockSubmitRequest.mockResolvedValue(true);
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      },
      loading: false,
      error: null,
      userType: "charity",
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    } as ReturnType<typeof useAuth>);
  });

  describe("Loading state", () => {
    it("shows loading spinner before data loads", () => {
      mockGetProfile.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          }),
      );
      renderClaimCharity();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Page header", () => {
    it("renders the Claim Organization heading", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Claim Organization")).toBeInTheDocument();
      });
    });

    it("renders the charity name when profile loads", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText(/Test Charity Foundation/)).toBeInTheDocument();
      });
    });

    it("renders the EIN when profile loads", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText(/EIN 12-3456789/)).toBeInTheDocument();
      });
    });
  });

  describe("Step indicator", () => {
    it("renders the Verify Identity step label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Verify Identity")).toBeInTheDocument();
      });
    });

    it("renders the Confirm Organization step label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Confirm Organization")).toBeInTheDocument();
      });
    });

    it("renders the Wallet Setup step label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Wallet Setup")).toBeInTheDocument();
      });
    });

    it("renders the Complete step label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });
  });

  describe("Verify Identity form", () => {
    it("renders the Step 1 heading", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByText("Step 1: Verify Your Identity"),
        ).toBeInTheDocument();
      });
    });

    it("renders the role selection label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByText("Your role at this organization"),
        ).toBeInTheDocument();
      });
    });

    it("renders the role select dropdown", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
    });

    it("renders role options in the dropdown", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Select a role...")).toBeInTheDocument();
      });
      expect(screen.getByText("Executive Director")).toBeInTheDocument();
      expect(screen.getByText("Staff")).toBeInTheDocument();
      expect(screen.getByText("Board Member")).toBeInTheDocument();
      expect(screen.getByText("Volunteer")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("renders the email input label", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Work email address")).toBeInTheDocument();
      });
    });

    it("renders the email input with placeholder", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("you@organization.org"),
        ).toBeInTheDocument();
      });
    });

    it("renders the email domain note", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByText(/Your email domain will be cross-referenced/),
        ).toBeInTheDocument();
      });
    });

    it("renders the Continue button", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Continue")).toBeInTheDocument();
      });
    });

    it("renders the Continue button as disabled when role and email are empty", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Continue")).toBeDisabled();
      });
    });

    it("enables the Continue button when role and email are filled", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      fireEvent.change(
        screen.getByLabelText("Your role at this organization"),
        {
          target: { value: "Staff" },
        },
      );
      fireEvent.change(screen.getByLabelText("Work email address"), {
        target: { value: "user@charity.org" },
      });
      expect(screen.getByText("Continue")).not.toBeDisabled();
    });

    it("calls submitCharityRequest when Continue is clicked with valid inputs", async () => {
      renderClaimCharity("12-3456789");
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      fireEvent.change(
        screen.getByLabelText("Your role at this organization"),
        {
          target: { value: "Staff" },
        },
      );
      fireEvent.change(screen.getByLabelText("Work email address"), {
        target: { value: "user@charity.org" },
      });
      fireEvent.click(screen.getByText("Continue"));
      await waitFor(() => {
        expect(mockSubmitRequest).toHaveBeenCalledWith(
          "12-3456789",
          "user-123",
          "user@charity.org",
        );
      });
    });

    it("navigates to registration-success after successful submission", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      fireEvent.change(
        screen.getByLabelText("Your role at this organization"),
        {
          target: { value: "Executive Director" },
        },
      );
      fireEvent.change(screen.getByLabelText("Work email address"), {
        target: { value: "director@charity.org" },
      });
      fireEvent.click(screen.getByText("Continue"));
      await waitFor(() => {
        expect(
          screen.getByTestId("registration-success-page"),
        ).toBeInTheDocument();
      });
    });

    it("shows error message when submitCharityRequest fails", async () => {
      mockSubmitRequest.mockResolvedValue(false);
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      fireEvent.change(
        screen.getByLabelText("Your role at this organization"),
        {
          target: { value: "Staff" },
        },
      );
      fireEvent.change(screen.getByLabelText("Work email address"), {
        target: { value: "user@charity.org" },
      });
      fireEvent.click(screen.getByText("Continue"));
      await waitFor(() => {
        expect(
          screen.getByText(/Could not submit your request/),
        ).toBeInTheDocument();
      });
    });

    it("shows auth error when user is not signed in", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        userType: null,
        login: jest.fn(),
        loginWithGoogle: jest.fn(),
        logout: jest.fn(),
        resetPassword: jest.fn(),
        refreshSession: jest.fn(),
        register: jest.fn(),
        sendUsernameReminder: jest.fn(),
      } as ReturnType<typeof useAuth>);
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      fireEvent.change(
        screen.getByLabelText("Your role at this organization"),
        {
          target: { value: "Staff" },
        },
      );
      fireEvent.change(screen.getByLabelText("Work email address"), {
        target: { value: "user@charity.org" },
      });
      fireEvent.click(screen.getByText("Continue"));
      await waitFor(() => {
        expect(screen.getByText(/You must be signed in/)).toBeInTheDocument();
      });
    });

    it("allows selecting a role", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(
          screen.getByLabelText("Your role at this organization"),
        ).toBeInTheDocument();
      });
      const select = screen.getByLabelText("Your role at this organization");
      fireEvent.change(select, { target: { value: "Staff" } });
      expect(select).toHaveValue("Staff");
    });

    it("allows entering an email", async () => {
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByLabelText("Work email address")).toBeInTheDocument();
      });
      const input = screen.getByLabelText("Work email address");
      fireEvent.change(input, { target: { value: "user@charity.org" } });
      expect(input).toHaveValue("user@charity.org");
    });
  });

  describe("Profile not found", () => {
    it("renders the page without profile info when profile is null", async () => {
      mockGetProfile.mockResolvedValue(null);
      renderClaimCharity();
      await waitFor(() => {
        expect(screen.getByText("Claim Organization")).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Test Charity Foundation/),
      ).not.toBeInTheDocument();
    });
  });

  describe("Service call", () => {
    it("calls getCharityProfileByEin with the EIN from the URL", async () => {
      renderClaimCharity("98-7654321");
      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith("98-7654321");
      });
    });
  });
});
