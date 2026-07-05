import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { listCharityRequests } from "@/services/adminCharityRequestsService";
import AdminCharityRequests from "../admin/AdminCharityRequests";
import type { AdminCharityRequestItem } from "@/types/adminCharityRequests";

// Service mocked via moduleNameMapper
const mockListCharityRequests = jest.mocked(listCharityRequests);

const sampleRequest: AdminCharityRequestItem = {
  ein: "123456789",
  requestCount: 4,
  firstRequestedAt: "2026-01-15T00:00:00Z",
  latestRequestedAt: "2026-04-20T00:00:00Z",
  latestRequesterEmail: "donor@example.com",
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminCharityRequests />
    </MemoryRouter>,
  );

describe("AdminCharityRequests", () => {
  beforeEach(() => {
    mockListCharityRequests.mockReset();
  });

  it("renders the empty state when no requests exist", async () => {
    mockListCharityRequests.mockResolvedValue({
      requests: [],
      totalCount: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no charity requests have been submitted yet/i),
      ).toBeInTheDocument();
    });
  });

  it("renders aggregated requests with formatted EIN and count", async () => {
    mockListCharityRequests.mockResolvedValue({
      requests: [sampleRequest],
      totalCount: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("12-3456789")).toBeInTheDocument();
    });
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("donor@example.com")).toBeInTheDocument();
  });

  it("shows an em dash when there is no latest requester email", async () => {
    mockListCharityRequests.mockResolvedValue({
      requests: [{ ...sampleRequest, latestRequesterEmail: null }],
      totalCount: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("12-3456789")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("notes when total exceeds the number shown", async () => {
    mockListCharityRequests.mockResolvedValue({
      requests: [sampleRequest],
      totalCount: 5,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("12-3456789")).toBeInTheDocument();
    });
    expect(screen.getByText(/showing 1 of 5 unique organizations/i)).toBeInTheDocument();
  });
});
