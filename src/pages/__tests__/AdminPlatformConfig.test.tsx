import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPlatformConfig from "../admin/AdminPlatformConfig";

// Hooks and services are mocked via moduleNameMapper

import { useAdminPlatformConfig } from "@/hooks/useAdminPlatformConfig";
import { useAdminAuditLog } from "@/hooks/useAdminAuditLog";
import {
  configKeyLabel,
  configValueInputType,
} from "@/services/adminPlatformConfigService";
import { getAdminDashboardStats } from "@/services/adminDashboardService";
import { listAdminUsers } from "@/services/adminSettingsService";

const mockUseAdminPlatformConfig = jest.mocked(useAdminPlatformConfig);
const mockUseAdminAuditLog = jest.mocked(useAdminAuditLog);
const _mockConfigKeyLabel = jest.mocked(configKeyLabel);
const _mockConfigValueInputType = jest.mocked(configValueInputType);
const mockGetAdminDashboardStats = jest.mocked(getAdminDashboardStats);
const mockListAdminUsers = jest.mocked(listAdminUsers);

const mockFetchConfig = jest.fn<() => Promise<unknown>>().mockResolvedValue([]);
const mockSaveConfig = jest
  .fn<() => Promise<boolean>>()
  .mockResolvedValue(true);
const mockFetchAuditLog = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  entries: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
});

const mockConfigs = [
  {
    key: "min_donation_usd" as const,
    value: 5,
    description: null,
    updatedAt: "2025-01-01T00:00:00Z",
    updatedBy: "admin-1",
  },
  {
    key: "validation_window_days" as const,
    value: 30,
    description: null,
    updatedAt: "2025-01-01T00:00:00Z",
    updatedBy: "admin-1",
  },
];

const mockStats = {
  totalDonors: 100,
  totalCharities: 50,
  verifiedCharities: 30,
  pendingCharities: 20,
  totalVolunteers: 75,
  cryptoVolumeUsd: 10000,
  fiatVolumeUsd: 5000,
  totalVolumeUsd: 15000,
  trends: {
    registrations7d: 5,
    registrations30d: 20,
    donations7d: 1000,
    donations30d: 5000,
  },
};

const mockAdminUsers = [
  {
    userId: "admin-1",
    email: "admin@test.com",
    displayName: null,
    joinedAt: "2025-01-01T00:00:00Z",
  },
];

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminPlatformConfig />
    </MemoryRouter>,
  );

describe("AdminPlatformConfig", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAdminPlatformConfig.mockReturnValue({
      configs: mockConfigs,
      loading: false,
      saving: false,
      auditLog: [],
      auditLoading: false,
      fetchConfig: mockFetchConfig,
      saveConfig: mockSaveConfig,
      fetchAuditLog: jest.fn(),
    });

    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      totalCount: 0,
      totalPages: 0,
      page: 1,
      limit: 50,
      loading: false,
      fetchAuditLog: mockFetchAuditLog,
    });

    mockGetAdminDashboardStats.mockResolvedValue(mockStats);
    mockListAdminUsers.mockResolvedValue(mockAdminUsers);
  });

  describe("Loading state", () => {
    it("shows loading spinner when config is loading", () => {
      mockUseAdminPlatformConfig.mockReturnValue({
        configs: [],
        loading: true,
        saving: false,
        auditLog: [],
        auditLoading: false,
        fetchConfig: mockFetchConfig,
        saveConfig: mockSaveConfig,
        fetchAuditLog: jest.fn(),
      });
      renderComponent();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Title", () => {
    it("renders System Settings title", () => {
      renderComponent();
      expect(screen.getByText("System Settings")).toBeInTheDocument();
    });
  });

  describe("Platform Config tab", () => {
    it("shows Platform Config tab by default with config cards", () => {
      renderComponent();
      expect(screen.getByText("min_donation_usd")).toBeInTheDocument();
      expect(screen.getByText("validation_window_days")).toBeInTheDocument();
    });

    it("shows Edit button on config entries", () => {
      renderComponent();
      const editButtons = screen.getAllByText("Edit");
      expect(editButtons.length).toBeGreaterThanOrEqual(2);
    });

    it("shows empty state when no configs exist", () => {
      mockUseAdminPlatformConfig.mockReturnValue({
        configs: [],
        loading: false,
        saving: false,
        auditLog: [],
        auditLoading: false,
        fetchConfig: mockFetchConfig,
        saveConfig: mockSaveConfig,
        fetchAuditLog: jest.fn(),
      });
      renderComponent();
      expect(
        screen.getByText(
          "No platform configuration found. Ensure the platform_config table has been seeded.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Tab switching", () => {
    it("switches to Audit Log tab", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Audit Log"));
      expect(screen.getByText("Apply Filters")).toBeInTheDocument();
    });

    it("switches to Admin Users tab", async () => {
      renderComponent();
      fireEvent.click(screen.getByText("Admin Users"));
      await waitFor(() => {
        expect(
          screen.getByText(
            "Read-only directory of platform administrator accounts.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("switches to System Health tab and shows stats", async () => {
      renderComponent();
      fireEvent.click(screen.getByText("System Health"));
      await waitFor(() => {
        expect(screen.getByText("Service Status")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("Total Donors")).toBeInTheDocument();
      });
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  describe("Edit modal", () => {
    it("opens edit modal when Edit button is clicked", () => {
      renderComponent();
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);
      expect(screen.getByTestId("modal")).toBeInTheDocument();
      expect(screen.getByText("Edit: min_donation_usd")).toBeInTheDocument();
    });

    it("saves numeric config value when Save is clicked", async () => {
      renderComponent();
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);
      expect(screen.getByTestId("modal")).toBeInTheDocument();

      const input = screen.getByLabelText("Value") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "10" } });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledWith({
          key: "min_donation_usd",
          value: 10,
        });
      });
    });

    it("saves JSON config value when Save is clicked", async () => {
      const jsonConfigs = [
        {
          key: "supported_tokens" as const,
          value: ["USDC", "DAI"],
          description: "Supported tokens",
          updatedAt: "2025-01-01T00:00:00Z",
          updatedBy: "admin-1",
        },
      ];
      _mockConfigValueInputType.mockReturnValue("json");
      mockUseAdminPlatformConfig.mockReturnValue({
        configs: jsonConfigs,
        loading: false,
        saving: false,
        auditLog: [],
        auditLoading: false,
        fetchConfig: mockFetchConfig,
        saveConfig: mockSaveConfig,
        fetchAuditLog: jest.fn(),
      });

      renderComponent();
      fireEvent.click(screen.getByText("Token & Network Config"));
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);
      expect(screen.getByTestId("modal")).toBeInTheDocument();

      const textarea = screen.getByLabelText(
        "Value (JSON)",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: '["USDC","DAI","USDT"]' },
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledWith({
          key: "supported_tokens",
          value: ["USDC", "DAI", "USDT"],
        });
      });
    });
  });

  describe("Audit Log tab with entries", () => {
    const mockAuditEntries = [
      {
        id: "audit-1",
        actionType: "config_change" as const,
        entityType: "platform_config" as const,
        entityId: "min_donation_usd",
        adminUserId: "admin-user-123",
        createdAt: "2025-03-15T10:30:00Z",
        oldValues: { value: 5 },
        newValues: { value: 10 },
      },
    ];

    it("renders audit log table rows with entry data", () => {
      mockUseAdminAuditLog.mockReturnValue({
        entries: mockAuditEntries,
        totalCount: 1,
        totalPages: 1,
        page: 1,
        limit: 50,
        loading: false,
        fetchAuditLog: mockFetchAuditLog,
      });

      renderComponent();
      fireEvent.click(screen.getByText("Audit Log"));

      expect(screen.getByText("admin-user-123")).toBeInTheDocument();
      expect(
        screen.getAllByText("config change").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("platform config").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("min_donation_usd")).toBeInTheDocument();
      expect(screen.getByText('{"value":5}')).toBeInTheDocument();
      expect(screen.getByText('{"value":10}')).toBeInTheDocument();
    });

    it("shows Apply Filters button and triggers fetchAuditLog on click", () => {
      mockUseAdminAuditLog.mockReturnValue({
        entries: mockAuditEntries,
        totalCount: 1,
        totalPages: 1,
        page: 1,
        limit: 50,
        loading: false,
        fetchAuditLog: mockFetchAuditLog,
      });

      renderComponent();
      fireEvent.click(screen.getByText("Audit Log"));

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockFetchAuditLog).toHaveBeenCalledWith({
        actionType: undefined,
        entityType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
      });
    });
  });

  describe("Audit Log filter interactions", () => {
    it("passes selected action type and entity type filters to fetchAuditLog", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Audit Log"));

      const actionSelect = screen.getByDisplayValue("All action types");
      fireEvent.change(actionSelect, {
        target: { value: "config_change" },
      });

      const entitySelect = screen.getByDisplayValue("All entity types");
      fireEvent.change(entitySelect, {
        target: { value: "platform_config" },
      });

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockFetchAuditLog).toHaveBeenCalledWith({
        actionType: "config_change",
        entityType: "platform_config",
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
      });
    });

    it("passes date range filters to fetchAuditLog", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Audit Log"));

      const dateInputs = screen.getAllByDisplayValue("");
      // The date inputs are the ones with type="date"; filter bar has two date inputs
      const dateFields = dateInputs.filter(
        (el) => (el as HTMLInputElement).type === "date",
      );
      expect(dateFields.length).toBe(2);

      fireEvent.change(dateFields[0], { target: { value: "2025-01-01" } });
      fireEvent.change(dateFields[1], { target: { value: "2025-12-31" } });

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockFetchAuditLog).toHaveBeenCalledWith({
        actionType: undefined,
        entityType: undefined,
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        page: 1,
      });
    });
  });

  describe("Token & Network tab", () => {
    it("renders token/network config cards", () => {
      const configsWithTokenNetwork = [
        ...mockConfigs,
        {
          key: "supported_tokens" as const,
          value: ["USDC", "DAI"],
          description: "Supported tokens list",
          updatedAt: "2025-02-01T00:00:00Z",
          updatedBy: "admin-2",
        },
        {
          key: "supported_networks" as const,
          value: ["moonbase", "ethereum"],
          description: "Supported networks list",
          updatedAt: "2025-02-01T00:00:00Z",
          updatedBy: "admin-2",
        },
      ];

      mockUseAdminPlatformConfig.mockReturnValue({
        configs: configsWithTokenNetwork,
        loading: false,
        saving: false,
        auditLog: [],
        auditLoading: false,
        fetchConfig: mockFetchConfig,
        saveConfig: mockSaveConfig,
        fetchAuditLog: jest.fn(),
      });

      renderComponent();
      fireEvent.click(screen.getByText("Token & Network Config"));

      expect(screen.getByText("supported_tokens")).toBeInTheDocument();
      expect(screen.getByText("supported_networks")).toBeInTheDocument();
      expect(screen.getByText("Supported tokens list")).toBeInTheDocument();
      expect(screen.getByText("Supported networks list")).toBeInTheDocument();
    });

    it("shows empty state when no token/network configs exist", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Token & Network Config"));

      expect(
        screen.getByText("No token or network configuration found."),
      ).toBeInTheDocument();
    });
  });

  describe("Admin Users tab with data", () => {
    it("renders admin users table with user data", async () => {
      const adminUsers = [
        {
          userId: "admin-1",
          email: "admin@test.com",
          displayName: "Admin One",
          joinedAt: "2025-01-15T00:00:00Z",
        },
        {
          userId: "admin-2",
          email: "admin2@test.com",
          displayName: null,
          joinedAt: "2025-03-10T00:00:00Z",
        },
      ];
      mockListAdminUsers.mockResolvedValue(adminUsers);

      renderComponent();
      fireEvent.click(screen.getByText("Admin Users"));

      await waitFor(() => {
        expect(screen.getByText("Admin One")).toBeInTheDocument();
      });
      expect(screen.getByText("admin@test.com")).toBeInTheDocument();
      expect(screen.getByText("admin-1")).toBeInTheDocument();
      expect(screen.getByText("admin2@test.com")).toBeInTheDocument();
      expect(screen.getByText("admin-2")).toBeInTheDocument();
    });

    it("shows empty state when no admin users are found", async () => {
      mockListAdminUsers.mockResolvedValue([]);

      renderComponent();
      fireEvent.click(screen.getByText("Admin Users"));

      await waitFor(() => {
        expect(screen.getByText("No admin users found.")).toBeInTheDocument();
      });
    });
  });
});
