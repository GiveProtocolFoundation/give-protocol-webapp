import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { createMockAuth, createMockWeb3 } from "@/test-utils/mockSetup";
import ScheduledDonationsPage from "../donor/ScheduledDonationsPage";

const mockUseAuth = jest.mocked(useAuth);
const mockUseWeb3 = jest.mocked(useWeb3);

const renderComponent = () =>
  render(
    <MemoryRouter>
      <ScheduledDonationsPage />
    </MemoryRouter>,
  );

describe("ScheduledDonationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: "donor-1", email: "donor@test.com" },
        userType: "donor",
      }),
    );
    mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: true }));
  });

  describe("Rendering", () => {
    it("renders the page heading", () => {
      renderComponent();
      // "Scheduled Donations" appears as both the h1 title and the
      // mock component text, so use getByRole for the heading.
      expect(
        screen.getByRole("heading", { name: "Scheduled Donations" }),
      ).toBeInTheDocument();
    });

    it("renders the page subtitle", () => {
      renderComponent();
      expect(
        screen.getByText("Manage your monthly donation schedules"),
      ).toBeInTheDocument();
    });

    it("renders the ScheduledDonations component", () => {
      renderComponent();
      expect(screen.getByTestId("scheduled-donations")).toBeInTheDocument();
    });
  });

  describe("Wallet not connected", () => {
    it("shows connect wallet prompt when wallet is not connected", () => {
      mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: false }));
      renderComponent();
      expect(screen.getByText("Connect Your Wallet")).toBeInTheDocument();
    });

    it("shows connect wallet description", () => {
      mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: false }));
      renderComponent();
      expect(
        screen.getByText(
          "To view your scheduled donations, please connect your wallet.",
        ),
      ).toBeInTheDocument();
    });

    it("renders Connect Wallet button", () => {
      mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: false }));
      renderComponent();
      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated user", () => {
    it("redirects to login when no user is present", () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null }));
      renderComponent();
      // Navigate to /login?type=donor renders nothing visible.
      expect(
        screen.queryByRole("heading", { name: "Scheduled Donations" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Charity user redirect", () => {
    it("redirects charity users away from the page", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: { id: "charity-1", email: "charity@test.com" },
          userType: "charity",
        }),
      );
      renderComponent();
      expect(
        screen.queryByRole("heading", { name: "Scheduled Donations" }),
      ).not.toBeInTheDocument();
    });
  });
});
