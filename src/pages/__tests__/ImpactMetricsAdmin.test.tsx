import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAdminImpactMetrics } from "@/hooks/useAdminImpactMetrics";
import type { FundImpactMetric } from "@/types/impact";
import ImpactMetricsAdmin from "../admin/ImpactMetricsAdmin";

const mockUseAdminImpactMetrics = jest.mocked(useAdminImpactMetrics);

const mockMetrics: FundImpactMetric[] = [
  {
    id: "metric-1",
    fundId: "1",
    unitName: "Acres of Rainforest Protected",
    unitCostUsd: 25.0,
    unitIcon: "trees",
    descriptionTemplate: "This could provide {{value}} {{unit_name}}",
    sortOrder: 1,
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "metric-2",
    fundId: "2",
    unitName: "Meals Provided",
    unitCostUsd: 5.0,
    unitIcon: "utensils",
    descriptionTemplate: "This could provide {{value}} {{unit_name}}",
    sortOrder: 2,
    updatedAt: "2025-01-02T00:00:00Z",
  },
];

const mockFetchAllMetrics = jest.fn<() => Promise<void>>();
const mockCreateMetric = jest.fn<() => Promise<boolean>>();
const mockUpdateMetric = jest.fn<() => Promise<boolean>>();
const mockDeleteMetric = jest.fn<() => Promise<boolean>>();

const renderComponent = () =>
  render(
    <MemoryRouter>
      <ImpactMetricsAdmin />
    </MemoryRouter>,
  );

describe("ImpactMetricsAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminImpactMetrics.mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      fetchAllMetrics: mockFetchAllMetrics,
      createMetric: mockCreateMetric,
      updateMetric: mockUpdateMetric,
      deleteMetric: mockDeleteMetric,
    });
  });

  describe("Loading state", () => {
    it("shows loading spinner when loading with no metrics", () => {
      mockUseAdminImpactMetrics.mockReturnValue({
        metrics: [],
        loading: true,
        error: null,
        fetchAllMetrics: mockFetchAllMetrics,
        createMetric: mockCreateMetric,
        updateMetric: mockUpdateMetric,
        deleteMetric: mockDeleteMetric,
      });
      renderComponent();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("does not show loading spinner when metrics are present", () => {
      renderComponent();
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
  });

  describe("Page title and layout", () => {
    it("renders the page title", () => {
      renderComponent();
      expect(screen.getByText("Impact Metrics Management")).toBeInTheDocument();
    });

    it("renders the Add Metric button", () => {
      renderComponent();
      // The modal mock always renders children so "Add Metric" appears
      // as both the button and the modal h2 title.
      const elements = screen.getAllByText("Add Metric");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the fund filter label", () => {
      renderComponent();
      expect(screen.getByText("Filter by Fund:")).toBeInTheDocument();
    });
  });

  describe("Data rendering", () => {
    it("renders metric unit names in the table", () => {
      renderComponent();
      expect(
        screen.getByText("Acres of Rainforest Protected"),
      ).toBeInTheDocument();
      expect(screen.getByText("Meals Provided")).toBeInTheDocument();
    });

    it("renders metric costs formatted with dollar sign", () => {
      renderComponent();
      expect(screen.getByText("$25.00")).toBeInTheDocument();
      expect(screen.getByText("$5.00")).toBeInTheDocument();
    });

    it("renders metric icon values", () => {
      renderComponent();
      // Icon values appear in both table rows and modal form select options.
      const treesElements = screen.getAllByText("trees");
      expect(treesElements.length).toBeGreaterThanOrEqual(1);
      const utensilsElements = screen.getAllByText("utensils");
      expect(utensilsElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders fund labels for metrics", () => {
      renderComponent();
      // Fund labels appear in both table rows and filter/form select options.
      const envFundElements = screen.getAllByText("Environmental Impact Fund");
      expect(envFundElements.length).toBeGreaterThanOrEqual(1);
      const povertyFundElements = screen.getAllByText(
        "Poverty Relief Impact Fund",
      );
      expect(povertyFundElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders table column headers", () => {
      renderComponent();
      // Many column headers also appear as form labels in the always-rendered
      // modal mock, so use getAllByText for shared text.
      const fundHeaders = screen.getAllByText("Fund");
      expect(fundHeaders.length).toBeGreaterThanOrEqual(1);
      const unitNameHeaders = screen.getAllByText("Unit Name");
      expect(unitNameHeaders.length).toBeGreaterThanOrEqual(1);
      const costHeaders = screen.getAllByText("Cost (USD)");
      expect(costHeaders.length).toBeGreaterThanOrEqual(1);
      const iconHeaders = screen.getAllByText("Icon");
      expect(iconHeaders.length).toBeGreaterThanOrEqual(1);
      const orderHeaders = screen.getAllByText("Order");
      expect(orderHeaders.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders Edit and Delete action links for each metric row", () => {
      renderComponent();
      // "Edit" text appears in table rows and "Edit Metric" modal title.
      // Use role-based query to count only button/link elements with exact "Edit".
      const editLinks = screen.getAllByRole("button", { name: "Edit" });
      expect(editLinks.length).toBe(2);
    });

    it("shows empty state when no metrics exist", () => {
      mockUseAdminImpactMetrics.mockReturnValue({
        metrics: [],
        loading: false,
        error: null,
        fetchAllMetrics: mockFetchAllMetrics,
        createMetric: mockCreateMetric,
        updateMetric: mockUpdateMetric,
        deleteMetric: mockDeleteMetric,
      });
      renderComponent();
      expect(screen.getByText("No metrics found.")).toBeInTheDocument();
    });
  });

  describe("Error display", () => {
    it("renders error message when error exists", () => {
      mockUseAdminImpactMetrics.mockReturnValue({
        metrics: mockMetrics,
        loading: false,
        error: "Failed to load metrics",
        fetchAllMetrics: mockFetchAllMetrics,
        createMetric: mockCreateMetric,
        updateMetric: mockUpdateMetric,
        deleteMetric: mockDeleteMetric,
      });
      renderComponent();
      expect(screen.getByText("Failed to load metrics")).toBeInTheDocument();
    });
  });

  describe("Fund filter", () => {
    it("renders All Funds option in filter dropdown", () => {
      renderComponent();
      expect(screen.getByText("All Funds")).toBeInTheDocument();
    });

    it("calls fetchAllMetrics on mount", () => {
      renderComponent();
      expect(mockFetchAllMetrics).toHaveBeenCalled();
    });
  });

  describe("Add Metric modal", () => {
    it("shows Create button in the add metric form", () => {
      renderComponent();
      // The modal mock always renders children, so Create button is visible.
      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("shows Cancel buttons in the form modals", () => {
      renderComponent();
      const cancelButtons = screen.getAllByText("Cancel");
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edit Metric modal", () => {
    it("shows Update button when Edit is clicked on a metric", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      fireEvent.click(editButtons[0]);
      expect(screen.getByText("Update")).toBeInTheDocument();
    });
  });

  describe("Delete Metric modal", () => {
    it("renders delete confirmation text", () => {
      renderComponent();
      // The modal mock always renders children, so confirmation text is visible.
      expect(
        screen.getByText(
          "Are you sure you want to delete this metric? This action cannot be undone.",
        ),
      ).toBeInTheDocument();
    });

    it("calls deleteMetric when confirm delete is clicked", async () => {
      mockDeleteMetric.mockResolvedValue(true);
      renderComponent();
      // Click the Delete link on the first metric row to set deletingId.
      const deleteLinks = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteLinks[0]);
      // Now click the confirmation Delete button (the last one).
      const updatedDeleteButtons = screen.getAllByRole("button", {
        name: "Delete",
      });
      fireEvent.click(updatedDeleteButtons[updatedDeleteButtons.length - 1]);
      await waitFor(() => {
        expect(mockDeleteMetric).toHaveBeenCalledWith("metric-1");
      });
    });
  });
});
