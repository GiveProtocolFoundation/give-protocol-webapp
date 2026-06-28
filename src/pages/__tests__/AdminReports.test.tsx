import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminReports from "../admin/AdminReports";

// Services are mocked via moduleNameMapper

import { getDonationSummary } from "@/services/adminDonationService";
import { getAdminAuditLog } from "@/services/adminAuditService";
import {
  getCharityGrowthReport,
  getDonorActivityReport,
  getVolunteerReport,
  getPlatformHealthSummary,
  donationSummaryToCsv,
  volunteerReportToCsv,
  donorActivityToCsv,
  auditLogToCsv,
  platformHealthToCsv,
  downloadReport,
} from "@/services/adminReportsService";

const mockGetDonationSummary = jest.mocked(getDonationSummary);
const mockGetAdminAuditLog = jest.mocked(getAdminAuditLog);
const mockGetCharityGrowthReport = jest.mocked(getCharityGrowthReport);
const mockGetDonorActivityReport = jest.mocked(getDonorActivityReport);
const mockGetVolunteerReport = jest.mocked(getVolunteerReport);
const mockGetPlatformHealthSummary = jest.mocked(getPlatformHealthSummary);
const mockDonationSummaryToCsv = jest.mocked(donationSummaryToCsv);
const mockVolunteerReportToCsv = jest.mocked(volunteerReportToCsv);
const mockDonorActivityToCsv = jest.mocked(donorActivityToCsv);
const mockAuditLogToCsv = jest.mocked(auditLogToCsv);
const mockPlatformHealthToCsv = jest.mocked(platformHealthToCsv);
const mockDownloadReport = jest.mocked(downloadReport);

const mockDonationSummary = [
  {
    groupKey: "2025-03",
    paymentMethod: "crypto" as const,
    totalAmountUsd: 5000.0,
    donationCount: 25,
    charityName: "Test Charity",
    charityId: "ch-1",
  },
];

const mockCharityGrowth = [
  {
    period: "2025-03",
    newRegistrations: 10,
    approved: 8,
    rejected: 1,
    active: 50,
    suspended: 2,
  },
];

const mockVolunteerData = [
  {
    period: "2025-03",
    hoursSubmitted: 120,
    hoursValidated: 100,
    hoursRejected: 15,
    rejectionRate: 0.125,
    avgValidationDays: 2.5,
  },
];

const mockDonorActivityData = [
  {
    period: "2025-03",
    newDonors: 42,
    activeDonors: 180,
    dormantDonors: 30,
    avgDonationUsd: 75.5,
    repeatDonorRate: 0.45,
  },
];

const mockAuditEntries = [
  {
    id: "audit-00000001-0000-0000-0000-000000000001",
    actionType: "charity_status_change" as const,
    entityType: "charity" as const,
    entityId: "entity-0000001-0000-0000-0000-000000000001",
    adminUserId: "admin-00000001-0000-0000-0000-000000000001",
    oldValues: null,
    newValues: null,
    ipAddress: null,
    createdAt: "2025-03-15T10:30:00Z",
  },
  {
    id: "audit-00000002-0000-0000-0000-000000000002",
    actionType: "user_status_change" as const,
    entityType: "user" as const,
    entityId: "entity-0000002-0000-0000-0000-000000000002",
    adminUserId: "admin-00000002-0000-0000-0000-000000000002",
    oldValues: null,
    newValues: null,
    ipAddress: null,
    createdAt: "2025-03-16T14:00:00Z",
  },
];

const mockPlatformHealthData = [
  {
    metric: "total_donations",
    value: 15000,
    unit: "USD",
    trend7d: 500,
    trend30d: 2000,
  },
  {
    metric: "active_charities",
    value: 85,
    unit: "count",
    trend7d: 3,
    trend30d: 10,
  },
];

const renderReports = () =>
  render(
    <MemoryRouter>
      <AdminReports />
    </MemoryRouter>,
  );

describe("AdminReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDonationSummary.mockResolvedValue(mockDonationSummary);
    mockGetAdminAuditLog.mockResolvedValue({
      entries: [],
      totalCount: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
    mockGetCharityGrowthReport.mockResolvedValue(mockCharityGrowth);
    mockGetDonorActivityReport.mockResolvedValue([]);
    mockGetVolunteerReport.mockResolvedValue([]);
    mockGetPlatformHealthSummary.mockResolvedValue([]);
    mockDonationSummaryToCsv.mockReturnValue("csv-content");
    mockVolunteerReportToCsv.mockReturnValue("volunteer-csv");
    mockDonorActivityToCsv.mockReturnValue("donor-csv");
    mockAuditLogToCsv.mockReturnValue("audit-csv");
    mockPlatformHealthToCsv.mockReturnValue("health-csv");
  });

  it("renders title Reports", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Reports")).toBeInTheDocument();
    });
  });

  it("shows date preset buttons", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    });
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("default tab is Donations", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Group by:")).toBeInTheDocument();
    });
  });

  it("donations tab renders table with data", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Method")).toBeInTheDocument();
    expect(screen.getByText("Total (USD)")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    const charityHeader = screen.getAllByText("Charity");
    expect(charityHeader.length).toBeGreaterThanOrEqual(1);
    const groupCells = screen.getAllByText("2025-03");
    expect(groupCells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("crypto")).toBeInTheDocument();
    expect(screen.getByText("$5000.00")).toBeInTheDocument();
    const countCells = screen.getAllByText("25");
    expect(countCells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Test Charity")).toBeInTheDocument();
  });

  it("donations tab shows Export CSV with data", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
  });

  it("clicking Export CSV calls downloadReport", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockDonationSummaryToCsv).toHaveBeenCalledWith(mockDonationSummary);
    expect(mockDownloadReport).toHaveBeenCalledWith(
      "csv-content",
      expect.stringContaining("donation-summary-"),
    );
  });

  it("tab switching to Charity Growth calls getCharityGrowthReport", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Charity Growth")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Charity Growth"));
    await waitFor(() => {
      expect(mockGetCharityGrowthReport).toHaveBeenCalled();
    });
  });

  it("tab switching to Donor Activity calls getDonorActivityReport", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Donor Activity")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Donor Activity"));
    await waitFor(() => {
      expect(mockGetDonorActivityReport).toHaveBeenCalled();
    });
  });

  it("tab switching to Audit Trail calls getAdminAuditLog", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(mockGetAdminAuditLog).toHaveBeenCalled();
    });
  });

  it("custom date preset shows date inputs", async () => {
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Custom"));
    await waitFor(() => {
      expect(screen.getByLabelText("From date")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("To date")).toBeInTheDocument();
  });

  it("empty state for donations tab", async () => {
    mockGetDonationSummary.mockResolvedValue([]);
    renderReports();
    await waitFor(() => {
      expect(
        screen.getByText("No donation data for the selected period."),
      ).toBeInTheDocument();
    });
  });

  // ─── Volunteer Hours Tab ──────────────────────────────────────────────────

  it("volunteer hours tab renders table with data", async () => {
    mockGetVolunteerReport.mockResolvedValue(mockVolunteerData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Volunteer Hours")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Volunteer Hours"));
    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Validated")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Rejection Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg. Days")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });

  it("volunteer hours tab Export CSV calls downloadReport", async () => {
    mockGetVolunteerReport.mockResolvedValue(mockVolunteerData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Volunteer Hours")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Volunteer Hours"));
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockVolunteerReportToCsv).toHaveBeenCalledWith(mockVolunteerData);
    expect(mockDownloadReport).toHaveBeenCalledWith(
      "volunteer-csv",
      expect.stringContaining("volunteer-hours-"),
    );
  });

  // ─── Donor Activity Tab ───────────────────────────────────────────────────

  it("donor activity tab renders table with data", async () => {
    mockGetDonorActivityReport.mockResolvedValue(mockDonorActivityData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Donor Activity")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Donor Activity"));
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
    expect(screen.getByText("New Donors")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Dormant")).toBeInTheDocument();
    expect(screen.getByText("Avg Donation")).toBeInTheDocument();
    expect(screen.getByText("Repeat Rate")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("$75.50")).toBeInTheDocument();
    expect(screen.getByText("45.0%")).toBeInTheDocument();
  });

  it("donor activity tab Export CSV calls downloadReport", async () => {
    mockGetDonorActivityReport.mockResolvedValue(mockDonorActivityData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Donor Activity")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Donor Activity"));
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockDonorActivityToCsv).toHaveBeenCalledWith(mockDonorActivityData);
    expect(mockDownloadReport).toHaveBeenCalledWith(
      "donor-csv",
      expect.stringContaining("donor-activity-"),
    );
  });

  // ─── Audit Trail Tab ─────────────────────────────────────────────────────

  it("audit trail tab renders table with entries", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Entity ID")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    // Action text appears both in filter dropdown options and table rows
    expect(
      screen.getAllByText("charity status change").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("user status change").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("audit trail tab shows pagination when multiple pages", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("audit trail tab Next button fetches next page", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 100,
      page: 2,
      limit: 50,
      totalPages: 2,
    });
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(mockGetAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  it("audit trail tab Previous button fetches previous page", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 100,
      page: 2,
      limit: 50,
      totalPages: 2,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });
    // Click Next first to get to page 2, then Previous
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(mockGetAdminAuditLog).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByText("Previous"));
    await waitFor(() => {
      expect(mockGetAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      );
    });
  });

  it("audit trail tab Export CSV calls downloadReport", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: mockAuditEntries,
      totalCount: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockAuditLogToCsv).toHaveBeenCalledWith(mockAuditEntries);
    expect(mockDownloadReport).toHaveBeenCalledWith(
      "audit-csv",
      expect.stringContaining("audit-trail-"),
    );
  });

  it("audit trail tab filtering by view_pii passes actionType to getAdminAuditLog", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: [
        {
          id: "audit-pii-00000001-0000-0000-0000-000000000001",
          actionType: "view_pii" as const,
          entityType: "user" as const,
          entityId: "user-0000001-0000-0000-0000-000000000001",
          adminUserId: "admin-00000001-0000-0000-0000-000000000001",
          oldValues: null,
          newValues: null,
          ipAddress: null,
          createdAt: "2025-03-17T09:00:00Z",
        },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(screen.getByLabelText("Filter by action")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Filter by action"), {
      target: { value: "view_pii" },
    });
    await waitFor(() => {
      expect(mockGetAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "view_pii" }),
      );
    });
  });

  it("audit trail tab renders view_pii_list row with filter-keys metadata", async () => {
    mockGetAdminAuditLog.mockResolvedValue({
      entries: [
        {
          id: "audit-pii-list-0000001-0000-0000-0000-000000000001",
          actionType: "view_pii_list" as const,
          entityType: "user" as const,
          entityId: "",
          adminUserId: "admin-00000001-0000-0000-0000-000000000001",
          oldValues: null,
          newValues: { page: 2, filter_keys: ["status", "role"] },
          ipAddress: null,
          createdAt: "2025-03-17T10:00:00Z",
        },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Audit Trail"));
    await waitFor(() => {
      expect(
        screen.getByText(/viewed user list.*page 2.*filters: status, role/),
      ).toBeInTheDocument();
    });
  });

  // ─── Platform Health Tab ──────────────────────────────────────────────────

  it("platform health tab renders metric cards with data", async () => {
    mockGetPlatformHealthSummary.mockResolvedValue(mockPlatformHealthData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Platform Health")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Platform Health"));
    await waitFor(() => {
      expect(screen.getByText("total donations")).toBeInTheDocument();
    });
    expect(screen.getByText("active charities")).toBeInTheDocument();
    // toLocaleString() formatting varies by environment
    const formattedValue = (15000).toLocaleString();
    expect(screen.getByText(formattedValue)).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
  });

  it("platform health tab Export CSV calls downloadReport", async () => {
    mockGetPlatformHealthSummary.mockResolvedValue(mockPlatformHealthData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Platform Health")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Platform Health"));
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockPlatformHealthToCsv).toHaveBeenCalledWith(
      mockPlatformHealthData,
    );
    expect(mockDownloadReport).toHaveBeenCalledWith(
      "health-csv",
      expect.stringContaining("platform-health-"),
    );
  });

  it("platform health tab shows trend data", async () => {
    mockGetPlatformHealthSummary.mockResolvedValue(mockPlatformHealthData);
    renderReports();
    await waitFor(() => {
      expect(screen.getByText("Platform Health")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Platform Health"));
    await waitFor(() => {
      expect(screen.getByText("total donations")).toBeInTheDocument();
    });
    expect(screen.getByText(/7d: \+500/)).toBeInTheDocument();
    expect(screen.getByText(/30d: \+2000/)).toBeInTheDocument();
  });
});
