import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// The discovery view/skeleton components are mocked via moduleNameMapper in
// jest.config.mjs (discoveryComponentsMock.js), which provides data-testid
// stubs so the test focuses purely on the routing logic inside AppDashboard.

import AppDashboard from "./AppDashboard";

const mockUseAuth = jest.mocked(useAuth);

interface AuthOverrides {
  user?: unknown;
  userType?: "donor" | "charity" | "admin" | null;
  loading?: boolean;
}

function setAuth({
  user = null,
  userType = null,
  loading = false,
}: AuthOverrides = {}) {
  mockUseAuth.mockReturnValue({
    user: user as never,
    userType,
    loading,
    error: null,
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    resetPassword: jest.fn(),
    refreshSession: jest.fn(),
    register: jest.fn(),
    sendUsernameReminder: jest.fn(),
  } as never);
}

function renderWithRoutes(initialRoute = "/browse") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/browse" element={<AppDashboard />} />
        <Route path="/admin" element={<div data-testid="admin-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppDashboard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders the skeleton while auth is loading", () => {
    setAuth({ loading: true });
    renderWithRoutes();
    expect(screen.getByTestId("shell-skeleton")).toBeInTheDocument();
  });

  it("renders the public view for unauthenticated visitors", () => {
    setAuth({ user: null });
    renderWithRoutes();
    expect(screen.getByTestId("public-view")).toBeInTheDocument();
  });

  it("renders the public view for signed-in donors", () => {
    setAuth({ user: { id: "u1" }, userType: "donor" });
    renderWithRoutes();
    expect(screen.getByTestId("public-view")).toBeInTheDocument();
  });

  it("renders the public view for signed-in charities", () => {
    setAuth({ user: { id: "u2" }, userType: "charity" });
    renderWithRoutes();
    expect(screen.getByTestId("public-view")).toBeInTheDocument();
  });

  it("redirects admin users to /admin", () => {
    setAuth({ user: { id: "u3" }, userType: "admin" });
    renderWithRoutes();
    expect(screen.getByTestId("admin-page")).toBeInTheDocument();
    expect(screen.queryByTestId("public-view")).not.toBeInTheDocument();
  });
});
