import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createMockAuth } from "@/test-utils/mockSetup";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "../admin/AdminDashboard";

// Card, LoadingSpinner, and adminDashboardService are mocked via moduleNameMapper

import {
  getAdminDashboardStats,
  getAdminRecentActivity,
  getAdminAlerts,
} from "@/services/adminDashboardService";
import type { AdminAlert } from "@/types/adminDashboard";

const mockGetStats = jest.mocked(getAdminDashboardStats);
const mockGetActivity = jest.mocked(getAdminRecentActivity);
const mockGetAlerts = jest.mocked(getAdminAlerts);
const mockUseAuth = jest.mocked(useAuth);

const mockStats = {
  totalDonors: 1500,
  totalCharities: 120,
  verifiedCharities: 95,
  pendingCharities: 25,
  totalVolunteers: 300,
  cryptoVolumeUsd: 150000,
  fiatVolumeUsd: 100000,
  totalVolumeUsd: 250000,
  trends: {
    registrations7d: 12,
    registrations30d: 45,
    donations7d: 8500,
    donations30d: 32000,
  },
};

const mockActivity = {
  events: [
    {
      id: "evt-1",
      eventType: "donation" as const,
      description: "Donation to Test Charity",
      eventTime: new Date().toISOString(),
      amountUsd: 100,
      actorId: null,
      actorName: null,
      entityId: null,
      entityType: null,
    },
    {
      id: "evt-2",
      eventType: "registration" as const,
      description: "New user registered",
      eventTime: new Date().toISOString(),
      amountUsd: null,
      actorId: null,
      actorName: null,
      entityId: null,
      entityType: null,
    },
  ],
  totalCount: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(
      createMockAuth({ user: { id: "admin-1", email: "admin@test.com" } }),
    );
    mockGetStats.mockResolvedValue(mockStats);
    mockGetActivity.mockResolvedValue(mockActivity);
  });

  describe("Loading state", () => {
    it("shows loading spinner before data loads", () => {
      // Keep promises pending so component stays in loading state
      mockGetStats.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );
      renderDashboard();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Data display", () => {
    it("renders the dashboard content after loading", async () => {
      // The page title now lives in the shell top bar; the page itself renders
      // the KPI + activity sections.
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      });
    });

    it("renders Total Donors stat card", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Total Donors")).toBeInTheDocument();
      });
    });

    it("renders Charities stat card", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Charities")).toBeInTheDocument();
      });
    });

    it("renders Verified Charities stat card", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Verified Charities")).toBeInTheDocument();
      });
    });

    it("renders Active Volunteers stat card", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Active Volunteers")).toBeInTheDocument();
      });
    });

    it("renders stat values from mocked data", async () => {
      renderDashboard();
      const formatted = (1500).toLocaleString();
      await waitFor(() => {
        expect(screen.getByText(formatted)).toBeInTheDocument();
      });
    });
  });

  describe("Activity feed", () => {
    it("renders activity items after loading", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(
          screen.getByText("Donation to Test Charity"),
        ).toBeInTheDocument();
      });
    });

    it("renders multiple activity descriptions", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("New user registered")).toBeInTheDocument();
      });
    });

    it("renders the activity feed subtitle", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(
          screen.getByText("Platform events as they happen"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error state", () => {
    it("shows error message when stats fetch fails", async () => {
      mockGetStats.mockRejectedValue(new Error("Network error"));
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Error Loading Dashboard")).toBeInTheDocument();
      });
    });

    it("shows error message text", async () => {
      mockGetStats.mockRejectedValue(new Error("Failed to load"));
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
      });
    });

    it("shows Retry button on error", async () => {
      mockGetStats.mockRejectedValue(new Error("Network error"));
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
    });

    it("retries fetch when Retry is clicked", async () => {
      mockGetStats
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue(mockStats);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Retry"));
      await waitFor(() => {
        expect(mockGetStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Quick actions", () => {
    it("renders quick action section heading", async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      });
    });
  });

  describe("Priority alerts", () => {
    const baseAlert: AdminAlert = {
      alertType: "donation_flag",
      severity: "high",
      title: "Open Donation Flag",
      description: "Flagged donation awaiting review: chargeback risk",
      entityId: "flag-1",
      entityType: "donation_flag",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      count: 1,
    };

    it("shows the High Priority chip for matters sitting more than 3 days", async () => {
      mockGetAlerts.mockResolvedValue([baseAlert]);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("High Priority")).toBeInTheDocument();
      });
      expect(screen.getByText("Open Donation Flag")).toBeInTheDocument();
    });

    it("shows Needs Attention for matters younger than 3 days", async () => {
      mockGetAlerts.mockResolvedValue([
        {
          ...baseAlert,
          severity: "medium",
          createdAt: new Date().toISOString(),
        },
      ]);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Needs Attention")).toBeInTheDocument();
      });
      expect(screen.queryByText("High Priority")).not.toBeInTheDocument();
    });

    it("escalates a mixed-age group to High Priority", async () => {
      mockGetAlerts.mockResolvedValue([
        { ...baseAlert, severity: "medium", entityId: "flag-2" },
        { ...baseAlert, severity: "high", entityId: "flag-3" },
      ]);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("High Priority")).toBeInTheDocument();
      });
      expect(screen.queryByText("Needs Attention")).not.toBeInTheDocument();
    });

    it("links each alert type to its review queue", async () => {
      mockGetAlerts.mockResolvedValue([
        baseAlert,
        {
          ...baseAlert,
          alertType: "removal_request",
          title: "Pending Removal Request",
          entityId: "user-1",
          entityType: "user",
        },
      ]);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getAllByText("Review queue")).toHaveLength(2);
      });
      const links = screen
        .getAllByText("Review queue")
        .map((el) => el.closest("a")?.getAttribute("href"));
      expect(links).toContain("/admin/donations");
      expect(links).toContain("/admin/donors");
    });
  });
});
