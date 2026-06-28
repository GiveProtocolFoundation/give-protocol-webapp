import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { setMockResult, resetMockState, supabase } from "@/lib/supabase";
import AdminPortfolioFunds from "./AdminPortfolioFunds";

// Card, Button, Input, LoadingSpinner are mocked via moduleNameMapper.

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const mockAdminUser = {
  id: "admin-user-1",
  email: "admin@example.com",
};

const mockFunds = [
  {
    id: "fund-1",
    name: "Environment Fund",
    description: "Focus on environmental causes",
    category: "Environment",
    image_url: "https://example.com/env.jpg",
    charity_ids: ["charity-1", "charity-2"],
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "fund-2",
    name: "Education Fund",
    description: "Support education initiatives",
    category: "Education",
    image_url: null,
    charity_ids: [],
    status: "archived",
    created_at: "2026-01-02T00:00:00Z",
  },
];

const mockCharities = [
  { id: "charity-1", name: "Green Earth", ein: "12-3456789" },
  { id: "charity-2", name: "Edu For All", ein: "98-7654321" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPortfolioFunds />
    </MemoryRouter>,
  );
}

describe("AdminPortfolioFunds", () => {
  beforeEach(() => {
    resetMockState();
    mockUseAuth.mockReturnValue({
      user: mockAdminUser,
      userType: "admin",
      loading: false,
      error: null,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    } as never);
    mockUseToast.mockReturnValue({ showToast: mockShowToast } as never);
    mockShowToast.mockReset();
  });

  it("shows loading spinner initially", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });
    renderPage();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    // Let the effect resolve so the post-test setState doesn't trigger an act warning.
    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument(),
    );
  });

  it("renders fund list after data loads", async () => {
    setMockResult("portfolio_funds", { data: mockFunds, error: null });
    setMockResult("charity_profiles", { data: mockCharities, error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Environment Fund")).toBeInTheDocument(),
    );
    expect(screen.getByText("Education Fund")).toBeInTheDocument();
  });

  it("shows empty state when no funds exist", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: mockCharities, error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("No portfolio funds yet")).toBeInTheDocument(),
    );
  });

  it("renders page heading", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Portfolio Funds")).toBeInTheDocument(),
    );
  });

  it("shows New Fund button when not in form mode", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("New Fund")).toBeInTheDocument(),
    );
  });

  it("opens create form when New Fund is clicked", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: mockCharities, error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("New Fund")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("New Fund"));

    expect(screen.getByText("Create New Fund")).toBeInTheDocument();
    expect(screen.getByText("Green Earth")).toBeInTheDocument();
    expect(screen.getByText("Edu For All")).toBeInTheDocument();
  });

  it("hides New Fund button when form is open", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() => screen.getByText("New Fund"));
    fireEvent.click(screen.getByText("New Fund"));

    expect(screen.queryByText("New Fund")).not.toBeInTheDocument();
  });

  it("closes form when Cancel is clicked", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() => screen.getByText("New Fund"));
    fireEvent.click(screen.getByText("New Fund"));
    expect(screen.getByText("Create New Fund")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Create New Fund")).not.toBeInTheDocument();
    expect(screen.getByText("New Fund")).toBeInTheDocument();
  });

  it("shows fund status badges", async () => {
    setMockResult("portfolio_funds", { data: mockFunds, error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() => screen.getByText("Environment Fund"));
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
  });

  it("shows archive button only for non-archived funds", async () => {
    setMockResult("portfolio_funds", { data: mockFunds, error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() => screen.getByText("Environment Fund"));

    // Archive button should be present for active fund
    const archiveBtn = screen.getByLabelText("Archive Environment Fund");
    expect(archiveBtn).toBeInTheDocument();

    // Archive button should NOT be present for archived fund
    expect(
      screen.queryByLabelText("Archive Education Fund"),
    ).not.toBeInTheDocument();
  });

  it("opens edit form with fund data when Edit is clicked", async () => {
    setMockResult("portfolio_funds", { data: mockFunds, error: null });
    setMockResult("charity_profiles", { data: mockCharities, error: null });

    renderPage();

    await waitFor(() => screen.getByText("Environment Fund"));
    fireEvent.click(screen.getByLabelText("Edit Environment Fund"));

    expect(screen.getByText("Edit Fund")).toBeInTheDocument();
  });

  it("shows charity count in fund list items", async () => {
    setMockResult("portfolio_funds", { data: mockFunds, error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() => screen.getByText("Environment Fund"));
    expect(screen.getByText("2 charities")).toBeInTheDocument();
    expect(screen.getByText("0 charities")).toBeInTheDocument();
  });

  it("shows charity selector count in form", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: mockCharities, error: null });

    renderPage();

    await waitFor(() => screen.getByText("New Fund"));
    fireEvent.click(screen.getByText("New Fund"));

    expect(
      screen.getByText("Select Charities (0 selected)"),
    ).toBeInTheDocument();
  });

  it("calls supabase to load data on mount", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });
    setMockResult("charity_profiles", { data: [], error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument(),
    );

    expect(supabase.from).toHaveBeenCalledWith("portfolio_funds");
    expect(supabase.from).toHaveBeenCalledWith("charity_profiles");
  });
});
