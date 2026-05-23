import React from "react";
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthCallback from "./AuthCallback";

// useAuth is auto-mocked via jest.config.mjs moduleNameMapper →
// src/test-utils/authContextMock.js (exports useAuth as jest.fn())
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock LoadingSpinner to keep tests simple
jest.mock("@/components/ui/LoadingSpinner", () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

/** Default full auth shape for easy overrides */
function makeAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    userType: null,
    loading: false,
    error: null,
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithApple: jest.fn(),
    logout: jest.fn(),
    resetPassword: jest.fn(),
    refreshSession: jest.fn(),
    register: jest.fn(),
    sendUsernameReminder: jest.fn(),
    ...overrides,
  } as never;
}

/**
 * Renders AuthCallback inside a MemoryRouter with destination stubs.
 */
function renderCallback() {
  return render(
    <MemoryRouter initialEntries={["/auth/callback"]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/charity-portal" element={<div>Charity Portal</div>} />
        <Route path="/give-dashboard" element={<div>Give Dashboard</div>} />
        <Route path="/browse" element={<div>Browse</div>} />
        <Route path="/auth" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedUseAuth.mockReturnValue(makeAuth({ loading: true }));
  });

  afterEach(() => {
    jest.useRealTimers();
    mockedUseAuth.mockReset();
  });

  it("shows loading spinner while session is pending", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: true }));
    renderCallback();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByText(/verifying your account/i)).toBeInTheDocument();
  });

  it("shows loading spinner while auth loaded but user not yet present", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("redirects charity user to /charity-portal", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "u1" } as never, userType: "charity", loading: false }),
    );
    renderCallback();
    expect(screen.getByText("Charity Portal")).toBeInTheDocument();
  });

  it("redirects donor user to /give-dashboard", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "u2" } as never, userType: "donor", loading: false }),
    );
    renderCallback();
    expect(screen.getByText("Give Dashboard")).toBeInTheDocument();
  });

  it("redirects unknown user type to /browse", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "u3" } as never, userType: null, loading: false }),
    );
    renderCallback();
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });

  it("redirects admin user type to /browse as fallback", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "u4" } as never, userType: "admin" as never, loading: false }),
    );
    renderCallback();
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });

  it("shows error state after timeout with no session", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    expect(screen.getByText(/could not verify your account/i)).toBeInTheDocument();
  });

  it("shows return to login link in error state", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    const link = screen.getByRole("link", { name: /return to login/i });
    expect(link).toHaveAttribute("href", "/auth");
  });

  it("does not show error state before timeout elapses", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/verification failed/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });
});
