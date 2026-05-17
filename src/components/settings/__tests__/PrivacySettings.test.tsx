import React from "react";
import { jest } from "@jest/globals";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivacySettings } from "../PrivacySettings";
import {
  requestDataExport,
  requestAccountErasure,
  cancelErasureRequest,
  getActiveErasureRequest,
  getMostRecentExportRequest,
} from "@/services/privacyRequestService";
import { useToast } from "@/hooks/useToast";

// Card, Button, and privacyRequestService are mocked via moduleNameMapper

const mockRequestDataExport = jest.mocked(requestDataExport);
const mockRequestAccountErasure = jest.mocked(requestAccountErasure);
const mockCancelErasureRequest = jest.mocked(cancelErasureRequest);
const mockGetActiveErasureRequest = jest.mocked(getActiveErasureRequest);
const mockGetMostRecentExportRequest = jest.mocked(getMostRecentExportRequest);
const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const renderPrivacySettings = () =>
  render(
    <MemoryRouter>
      <PrivacySettings />
    </MemoryRouter>,
  );

describe("PrivacySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: [],
      dismissToast: jest.fn(),
    });
    mockGetActiveErasureRequest.mockResolvedValue(null);
    mockGetMostRecentExportRequest.mockResolvedValue(null);
  });

  describe("Rendering", () => {
    it("renders Privacy heading", async () => {
      renderPrivacySettings();
      await waitFor(() => {
        expect(screen.getByText("Privacy")).toBeInTheDocument();
      });
    });

    it("renders Download My Data section", async () => {
      renderPrivacySettings();
      await waitFor(() => {
        expect(screen.getByText("Download My Data")).toBeInTheDocument();
      });
    });

    it("renders Delete My Account section", async () => {
      renderPrivacySettings();
      await waitFor(() => {
        const headings = screen.getAllByText("Delete My Account");
        expect(headings.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows Request Data Export button", async () => {
      renderPrivacySettings();
      await waitFor(() => {
        expect(screen.getByText("Request Data Export")).toBeInTheDocument();
      });
    });

    it("shows Delete My Account button when no active erasure request", async () => {
      renderPrivacySettings();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Data export", () => {
    it("calls requestDataExport when export button is clicked", async () => {
      mockRequestDataExport.mockResolvedValue({
        request_id: "req-1",
        status: "pending",
      });

      renderPrivacySettings();

      await waitFor(() => {
        expect(screen.getByText("Request Data Export")).toBeInTheDocument();
      });

      await act(() => {
        fireEvent.click(screen.getByText("Request Data Export"));
      });

      await waitFor(() => {
        expect(mockRequestDataExport).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Account deletion flow", () => {
    it("shows warning step when delete button is clicked", async () => {
      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /Delete My Account/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("What will be permanently deleted"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Active erasure request", () => {
    it("shows pending status and cancel button when active erasure request exists", async () => {
      mockGetActiveErasureRequest.mockResolvedValue({
        id: "era-1",
        scheduled_deletion_date: "2026-06-01T00:00:00Z",
      });

      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByText("Account deletion pending"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Cancel Deletion")).toBeInTheDocument();
    });

    it("calls cancelErasureRequest when cancel button is clicked", async () => {
      mockGetActiveErasureRequest.mockResolvedValue({
        id: "era-1",
        scheduled_deletion_date: "2026-06-01T00:00:00Z",
      });
      mockCancelErasureRequest.mockResolvedValue({
        request_id: "era-1",
        status: "cancelled",
      });

      renderPrivacySettings();

      await waitFor(() => {
        expect(screen.getByText("Cancel Deletion")).toBeInTheDocument();
      });

      await act(() => {
        fireEvent.click(screen.getByText("Cancel Deletion"));
      });

      await waitFor(() => {
        expect(mockCancelErasureRequest).toHaveBeenCalledWith("era-1");
      });
    });
  });

  describe("Multi-step deletion flow", () => {
    it("advances from warning to blockchain warning step", async () => {
      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /Delete My Account/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("I understand, continue")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("I understand, continue"));

      await waitFor(() => {
        expect(
          screen.getByText("Important: Blockchain records are permanent"),
        ).toBeInTheDocument();
      });
    });

    it("advances from blockchain warning to confirm step", async () => {
      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });

      // Step 1: Click delete
      fireEvent.click(
        screen.getByRole("button", { name: /Delete My Account/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("I understand, continue")).toBeInTheDocument();
      });

      // Step 2: Click continue past warning
      fireEvent.click(screen.getByText("I understand, continue"));

      await waitFor(() => {
        expect(
          screen.getByText("Important: Blockchain records are permanent"),
        ).toBeInTheDocument();
      });

      // Step 3: Click continue past blockchain warning
      fireEvent.click(screen.getByText("I understand, continue"));

      await waitFor(() => {
        expect(
          screen.getByText("Confirm account deletion"),
        ).toBeInTheDocument();
      });
    });

    it("submits erasure request after typing DELETE", async () => {
      mockRequestAccountErasure.mockResolvedValue({
        request_id: "era-new",
        scheduled_deletion_date: "2026-06-01T00:00:00Z",
      });

      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });

      // Navigate through all steps
      fireEvent.click(
        screen.getByRole("button", { name: /Delete My Account/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("I understand, continue")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("I understand, continue"));

      await waitFor(() => {
        expect(
          screen.getByText("Important: Blockchain records are permanent"),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("I understand, continue"));

      await waitFor(() => {
        expect(
          screen.getByText("Confirm account deletion"),
        ).toBeInTheDocument();
      });

      // Type DELETE and submit
      fireEvent.change(screen.getByPlaceholderText("Type DELETE"), {
        target: { value: "DELETE" },
      });

      await act(() => {
        fireEvent.click(screen.getByText("Submit Deletion Request"));
      });

      await waitFor(() => {
        expect(mockRequestAccountErasure).toHaveBeenCalledTimes(1);
      });
    });

    it("cancels deletion flow and returns to idle", async () => {
      renderPrivacySettings();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /Delete My Account/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete My Account/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
