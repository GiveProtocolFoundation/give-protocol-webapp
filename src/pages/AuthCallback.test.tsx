import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import AuthCallback from "./AuthCallback";

// useAuth is auto-mocked via jest.config.mjs moduleNameMapper →
// src/test-utils/authContextMock.js (exports useAuth as jest.fn())
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// supabase is auto-mocked via moduleNameMapper → src/test-utils/supabaseMock.js
const mockInvoke = jest.mocked(supabase.functions.invoke);

// Mock LoadingSpinner to keep tests simple
jest.mock("@/components/ui/LoadingSpinner", () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

// Mock Button component
jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} type={type ?? "button"}>
      {children}
    </button>
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
 *
 * @param initialEntry - The initial URL path (may include query params).
 * @returns Rendered result
 */
function renderCallback(initialEntry = "/auth/callback") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: null, error: null });
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
      makeAuth({
        user: { id: "u1" } as never,
        userType: "charity",
        loading: false,
      }),
    );
    renderCallback();
    expect(screen.getByText("Charity Portal")).toBeInTheDocument();
  });

  it("redirects donor user to /give-dashboard", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        user: { id: "u2" } as never,
        userType: "donor",
        loading: false,
      }),
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
      makeAuth({
        user: { id: "u4" } as never,
        userType: "admin" as never,
        loading: false,
      }),
    );
    renderCallback();
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });

  it("shows expired-link headline after timeout with no session", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(
      screen.getByText(/your verification link has expired/i),
    ).toBeInTheDocument();
  });

  it("shows security-framing body text after timeout", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback();

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(
      screen.getByText(
        /for your security, our verification links expire after 24 hours/i,
      ),
    ).toBeInTheDocument();
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

    expect(
      screen.queryByText(/your verification link has expired/i),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows Send new link button when email is in URL params", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback?email=test%40example.com");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(
      screen.getByRole("button", { name: /send new link/i }),
    ).toBeInTheDocument();
  });

  it("shows spam folder microcopy when email is available", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback?email=test%40example.com");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
  });

  it("does not show Send new link button when email is absent from URL", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(
      screen.queryByRole("button", { name: /send new link/i }),
    ).not.toBeInTheDocument();
  });

  it("calls resend-verification edge function with email on button click", async () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback?email=donor%40example.com");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send new link/i }));
      await Promise.resolve(); // flush microtask queue so handleResend state updates apply
    });

    expect(mockInvoke).toHaveBeenCalledWith("resend-verification", {
      body: { email: "donor@example.com" },
    });
  });

  it("shows Link sent success state after successful resend", async () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback?email=donor%40example.com");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send new link/i }));
      await Promise.resolve(); // flush microtask queue so handleResend state updates apply
    });

    expect(screen.getByText(/link sent/i)).toBeInTheDocument();
  });

  it("shows error message when resend fails", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error("network error"),
    } as never);
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, loading: false }));
    renderCallback("/auth/callback?email=donor%40example.com");

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send new link/i }));
      await Promise.resolve(); // flush microtask queue so handleResend state updates apply
    });

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
