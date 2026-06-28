import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Logger } from "@/utils/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useWeb3 } from "@/contexts/Web3Context";
import { RouteTransition } from "../RouteTransition";
import { ProtectedRoute } from "../ProtectedRoute";

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockedUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

interface AuthState {
  user: { id: string; email: string } | null;
  userType: string | null;
}

function setAuth({ user, userType }: AuthState): void {
  mockedUseAuth.mockReturnValue({
    user,
    userType,
    loading: false,
    error: null,
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithApple: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    refreshSession: jest.fn(),
    sendUsernameReminder: jest.fn(),
  } as never);
}

function setProfile(loading: boolean): void {
  mockedUseProfile.mockReturnValue({
    profile: null,
    loading,
    error: null,
    refresh: jest.fn(),
  } as never);
}

function setWeb3({ isConnected }: { isConnected: boolean }): void {
  mockedUseWeb3.mockReturnValue({
    provider: null,
    signer: null,
    address: isConnected ? "0xabc" : null,
    chainId: null,
    isConnected,
    isConnecting: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    error: null,
    switchChain: jest.fn(),
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  setAuth({ user: null, userType: null });
  setProfile(false);
  setWeb3({ isConnected: false });
});

describe("RouteTransition", () => {
  it("renders children inside the suspense + fade wrapper", () => {
    const { container } = render(
      <MemoryRouter>
        <RouteTransition>
          <span>route body</span>
        </RouteTransition>
      </MemoryRouter>,
    );
    expect(screen.getByText("route body")).toBeInTheDocument();
    expect(container.querySelector(".animate-fadeIn")).not.toBeNull();
  });

  it("logs a page view and scrolls to the top on each route change", () => {
    const scrollSpy = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    try {
      render(
        <MemoryRouter initialEntries={["/foo"]}>
          <RouteTransition>
            <span>body</span>
          </RouteTransition>
        </MemoryRouter>,
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        "Page view",
        expect.objectContaining({ path: "/foo" }),
      );
      expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    } finally {
      scrollSpy.mockRestore();
    }
  });
});

describe("ProtectedRoute", () => {
  function renderProtected(
    props: Partial<React.ComponentProps<typeof ProtectedRoute>> = {},
    initialPath = "/protected",
  ): ReturnType<typeof render> {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute {...props}>
                <span>protected body</span>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<span>auth landing</span>} />
          <Route path="/give-dashboard" element={<span>donor home</span>} />
          <Route path="/charity-portal" element={<span>charity home</span>} />
          <Route path="/admin" element={<span>admin home</span>} />
          <Route path="/" element={<span>public home</span>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows the loading spinner while the profile is loading and user auth is required", () => {
    setProfile(true);
    renderProtected();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("skips the loading spinner when allowWalletOnly is set", () => {
    setProfile(true);
    setWeb3({ isConnected: true });
    renderProtected({ allowWalletOnly: true });
    expect(screen.getByText("protected body")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    renderProtected();
    expect(screen.getByText("auth landing")).toBeInTheDocument();
    expect(mockedLogger.info).toHaveBeenCalledWith(
      "Unauthorized access attempt",
      expect.objectContaining({ path: "/protected" }),
    );
  });

  it("allows wallet-only access without a user when the wallet is connected", () => {
    setWeb3({ isConnected: true });
    renderProtected({ allowWalletOnly: true });
    expect(screen.getByText("protected body")).toBeInTheDocument();
  });

  it("redirects donors to /give-dashboard when their role is rejected", () => {
    setAuth({ user: { id: "u", email: "d@x" }, userType: "donor" });
    renderProtected({ requiredRoles: ["charity"] });
    expect(screen.getByText("donor home")).toBeInTheDocument();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      "Invalid role access attempt",
      expect.objectContaining({ userRole: "donor" }),
    );
  });

  it("redirects charities to /charity-portal when their role is rejected", () => {
    setAuth({ user: { id: "u", email: "c@x" }, userType: "charity" });
    renderProtected({ requiredRoles: ["admin"] });
    expect(screen.getByText("charity home")).toBeInTheDocument();
  });

  it("redirects admins to /admin when their role is rejected", () => {
    setAuth({ user: { id: "u", email: "a@x" }, userType: "admin" });
    renderProtected({ requiredRoles: ["donor"] });
    expect(screen.getByText("admin home")).toBeInTheDocument();
  });

  it("redirects unknown user types to / when their role is rejected", () => {
    setAuth({ user: { id: "u", email: "x@x" }, userType: "stranger" });
    renderProtected({ requiredRoles: ["donor"] });
    expect(screen.getByText("public home")).toBeInTheDocument();
  });

  it("renders the wallet-required prompt when requireWallet is set and not connected", () => {
    setAuth({ user: { id: "u", email: "d@x" }, userType: "donor" });
    renderProtected({ requireWallet: true });
    expect(screen.getByText("Wallet Connection Required")).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("renders children when authentication, role, and wallet checks all pass", () => {
    setAuth({ user: { id: "u", email: "d@x" }, userType: "donor" });
    setWeb3({ isConnected: true });
    renderProtected({ requiredRoles: ["donor"], requireWallet: true });
    expect(screen.getByText("protected body")).toBeInTheDocument();
  });

  it("renders children with no extra checks when no roles or wallet are required", () => {
    setAuth({ user: { id: "u", email: "d@x" }, userType: "donor" });
    renderProtected();
    expect(screen.getByText("protected body")).toBeInTheDocument();
  });
});
