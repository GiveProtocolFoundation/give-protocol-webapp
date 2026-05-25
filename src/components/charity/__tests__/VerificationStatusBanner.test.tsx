import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getCharityVerificationStatus } from "@/services/charityVerificationService";
import {
  VerificationStatusBanner,
  VerificationSuccessBanner,
} from "../VerificationStatusBanner";

// charityVerificationService is mocked via moduleNameMapper

const mockGetStatus = jest.mocked(getCharityVerificationStatus);

const renderBanner = (userId = "user-1") =>
  render(
    <MemoryRouter>
      <VerificationStatusBanner userId={userId} />
    </MemoryRouter>,
  );

describe("VerificationStatusBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Pending status", () => {
    beforeEach(() => {
      mockGetStatus.mockResolvedValue({
        status: "pending",
        reviewNotes: null,
      });
    });

    it("renders the pending title", async () => {
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Application Under Review"),
        ).toBeInTheDocument();
      });
    });

    it("renders the pending body text", async () => {
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText(/typically takes 3–5 business days/u),
        ).toBeInTheDocument();
      });
    });

    it("does not render an action link for pending status", async () => {
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Application Under Review"),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText("Contact Support")).not.toBeInTheDocument();
      expect(screen.queryByText("Appeal Suspension")).not.toBeInTheDocument();
    });
  });

  describe("Rejected status", () => {
    it("renders the rejected title", async () => {
      mockGetStatus.mockResolvedValue({
        status: "rejected",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Application Not Approved"),
        ).toBeInTheDocument();
      });
    });

    it("renders default body when no review notes", async () => {
      mockGetStatus.mockResolvedValue({
        status: "rejected",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Your application was not approved at this time."),
        ).toBeInTheDocument();
      });
    });

    it("renders review notes in body when provided", async () => {
      mockGetStatus.mockResolvedValue({
        status: "rejected",
        reviewNotes: "Missing documentation",
      });
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Reason: Missing documentation"),
        ).toBeInTheDocument();
      });
    });

    it("renders Contact Support action link", async () => {
      mockGetStatus.mockResolvedValue({
        status: "rejected",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        const link = screen.getByText("Contact Support");
        expect(link).toBeInTheDocument();
        expect(link.closest("a")).toHaveAttribute(
          "href",
          "mailto:support@giveprotocol.org",
        );
      });
    });
  });

  describe("Suspended status", () => {
    it("renders the suspended title", async () => {
      mockGetStatus.mockResolvedValue({
        status: "suspended",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(screen.getByText("Account Suspended")).toBeInTheDocument();
      });
    });

    it("renders default body when no review notes", async () => {
      mockGetStatus.mockResolvedValue({
        status: "suspended",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Your charity account has been suspended."),
        ).toBeInTheDocument();
      });
    });

    it("renders review notes in body when provided", async () => {
      mockGetStatus.mockResolvedValue({
        status: "suspended",
        reviewNotes: "Policy violation",
      });
      renderBanner();
      await waitFor(() => {
        expect(
          screen.getByText("Reason: Policy violation"),
        ).toBeInTheDocument();
      });
    });

    it("renders Appeal Suspension action link", async () => {
      mockGetStatus.mockResolvedValue({
        status: "suspended",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        const link = screen.getByText("Appeal Suspension");
        expect(link).toBeInTheDocument();
        expect(link.closest("a")).toHaveAttribute(
          "href",
          "mailto:support@giveprotocol.org",
        );
      });
    });
  });

  describe("Approved status", () => {
    it("renders nothing for approved status", async () => {
      mockGetStatus.mockResolvedValue({
        status: "approved",
        reviewNotes: null,
      });
      const { container } = renderBanner();
      await waitFor(() => {
        expect(mockGetStatus).toHaveBeenCalled();
      });
      expect(container.querySelector("[role='status']")).toBeNull();
    });
  });

  describe("Verified status", () => {
    it("renders nothing for verified status", async () => {
      mockGetStatus.mockResolvedValue({
        status: "verified",
        reviewNotes: null,
      });
      const { container } = renderBanner();
      await waitFor(() => {
        expect(mockGetStatus).toHaveBeenCalled();
      });
      expect(container.querySelector("[role='status']")).toBeNull();
    });
  });

  describe("No data returned", () => {
    it("renders nothing when service returns null", async () => {
      mockGetStatus.mockResolvedValue(null);
      const { container } = renderBanner();
      await waitFor(() => {
        expect(mockGetStatus).toHaveBeenCalled();
      });
      expect(container.querySelector("[role='status']")).toBeNull();
    });
  });

  describe("Service call", () => {
    it("calls getCharityVerificationStatus with userId", () => {
      mockGetStatus.mockResolvedValue(null);
      renderBanner("user-42");
      expect(mockGetStatus).toHaveBeenCalledWith("user-42");
    });
  });

  describe("Accessibility", () => {
    it("has role status on the banner container", async () => {
      mockGetStatus.mockResolvedValue({
        status: "pending",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(screen.getByRole("status")).toBeInTheDocument();
      });
    });

    it("has aria-live polite on the banner container", async () => {
      mockGetStatus.mockResolvedValue({
        status: "pending",
        reviewNotes: null,
      });
      renderBanner();
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveAttribute(
          "aria-live",
          "polite",
        );
      });
    });
  });
});

describe("VerificationSuccessBanner", () => {
  it("renders the verified title", () => {
    render(
      <MemoryRouter>
        <VerificationSuccessBanner />
      </MemoryRouter>,
    );
    expect(screen.getByText("Charity Verified")).toBeInTheDocument();
  });

  it("renders the verified body text", () => {
    render(
      <MemoryRouter>
        <VerificationSuccessBanner />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        "Your organization is verified and donors can now support your causes.",
      ),
    ).toBeInTheDocument();
  });

  it("has role status on the banner container", () => {
    render(
      <MemoryRouter>
        <VerificationSuccessBanner />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
