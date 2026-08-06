import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { supabase } from "@/lib/supabase";
import { useUnifiedAuth } from "../useUnifiedAuth";

// AuthContext, Web3Context, supabase, logger, ethers, and env are all
// mocked via moduleNameMapper. The hook under test is imported via relative
// path so the real implementation is exercised.

const mockUseAuth = jest.mocked(useAuth);
const mockUseWeb3 = jest.mocked(useWeb3);

const mockConnect = jest.fn<() => Promise<void>>();
const mockDisconnect = jest.fn<() => Promise<void>>();
const mockSwitchChain = jest.fn();

const defaultAuthMock = {
  user: null,
  loading: false,
  error: null,
  userType: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  refreshSession: jest.fn(),
  register: jest.fn(),
  sendUsernameReminder: jest.fn(),
} as ReturnType<typeof useAuth>;

const defaultWeb3Mock = {
  provider: null,
  signer: null,
  address: null,
  chainId: 8453,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: mockConnect,
  disconnect: mockDisconnect,
  switchChain: mockSwitchChain,
} as ReturnType<typeof useWeb3>;

/** Helper to create a chainable supabase query builder mock */
function createQueryChain(resolvedValue: {
  data: unknown;
  error: unknown;
}) {
  const builder = Promise.resolve(resolvedValue);
  const chainable = builder as Promise<typeof resolvedValue> & {
    select: ReturnType<typeof jest.fn>;
    eq: ReturnType<typeof jest.fn>;
    single: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
  };
  chainable.select = jest.fn(() => chainable);
  chainable.eq = jest.fn(() => chainable);
  chainable.single = jest.fn(() => Promise.resolve(resolvedValue));
  chainable.update = jest.fn(() => chainable);
  return chainable;
}

/**
 * Calls an async hook action that is expected to throw, catches the error,
 * and returns the caught error. This allows act() to flush state updates
 * from the catch/finally blocks before we assert on result.current.
 */
async function actAndCatch(
  fn: () => Promise<void>,
): Promise<Error> {
  let caught: Error | undefined;
  await act(async () => {
    try {
      await fn();
    } catch (err) {
      caught = err as Error;
    }
  });
  if (!caught) {
    throw new Error("Expected function to throw, but it did not");
  }
  return caught;
}

describe("useUnifiedAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthMock);
    mockUseWeb3.mockReturnValue(defaultWeb3Mock);
    // Reset supabase mock for user_identities queries
    (supabase.from as ReturnType<typeof jest.fn>).mockImplementation(() =>
      createQueryChain({ data: null, error: { message: "not found" } }),
    );
  });

  describe("unauthenticated state", () => {
    it("returns default unauthenticated state when no user is logged in", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authMethod).toBeNull();
      expect(result.current.email).toBeNull();
      expect(result.current.walletAddress).toBeNull();
      expect(result.current.isWalletConnected).toBe(false);
      expect(result.current.isWalletLinked).toBe(false);
      expect(result.current.role).toBe("donor");
      expect(result.current.loading).toBe(false);
      expect(result.current.walletAuthStep).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("exposes action functions even when unauthenticated", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(typeof result.current.signInWithEmail).toBe("function");
      expect(typeof result.current.signUpWithEmail).toBe("function");
      expect(typeof result.current.signInWithWallet).toBe("function");
      expect(typeof result.current.linkWallet).toBe("function");
      expect(typeof result.current.unlinkWallet).toBe("function");
      expect(typeof result.current.signOut).toBe("function");
    });
  });

  describe("authenticated state (email)", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      user_metadata: { type: "donor", name: "Test User" },
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: mockUser as ReturnType<typeof useAuth>["user"],
        userType: "donor",
      });
    });

    it("returns authenticated state with user data", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.email).toBe("test@example.com");
      expect(result.current.role).toBe("donor");
    });

    it("constructs unified user object from auth context", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.id).toBe("user-123");
      expect(result.current.user?.email).toBe("test@example.com");
      expect(result.current.user?.role).toBe("donor");
      expect(result.current.user?.displayName).toBe("Test User");
    });

    it("defaults authMethod to email when identity record is absent", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.authMethod).toBe("email");
    });

    it("reflects loading from auth context", () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: mockUser as ReturnType<typeof useAuth>["user"],
        userType: "donor",
        loading: true,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.loading).toBe(true);
    });
  });

  describe("wallet connection state", () => {
    it("reflects wallet connected state from Web3Context", () => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        address: "0xabc123",
        isConnected: true,
        chainId: 8453,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.isWalletConnected).toBe(true);
      expect(result.current.walletAddress).toBe("0xabc123");
      expect(result.current.chainId).toBe(8453);
    });

    it("returns disconnected wallet state by default", () => {
      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.isWalletConnected).toBe(false);
      expect(result.current.chainId).toBe(8453);
    });
  });

  describe("identity fetching", () => {
    const mockUser = {
      id: "user-456",
      email: "identity@test.com",
      user_metadata: { type: "charity", name: "Charity Org" },
    };

    it("fetches user identity when auth user changes", async () => {
      const identityData = {
        id: "identity-1",
        user_id: "user-456",
        wallet_address: "0xlinked-wallet",
        primary_auth_method: "wallet",
        wallet_linked_at: "2024-01-01T00:00:00Z",
      };

      (supabase.from as ReturnType<typeof jest.fn>).mockImplementation(() =>
        createQueryChain({ data: identityData, error: null }),
      );

      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: mockUser as ReturnType<typeof useAuth>["user"],
        userType: "charity",
      });

      const { result } = renderHook(() => useUnifiedAuth());

      await waitFor(() => {
        expect(result.current.isWalletLinked).toBe(true);
      });

      expect(result.current.walletAddress).toBe("0xlinked-wallet");
      expect(result.current.authMethod).toBe("wallet");
    });

    it("clears identity when auth user becomes null", () => {
      mockUseAuth.mockReturnValue(defaultAuthMock);

      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.isWalletLinked).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("signInWithEmail", () => {
    it("calls supabase signInWithPassword", async () => {
      (
        supabase.auth.signInWithPassword as ReturnType<typeof jest.fn>
      ).mockResolvedValue({
        data: { user: { id: "u1" }, session: {} },
        error: null,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      await act(async () => {
        await result.current.signInWithEmail("user@test.com", "password123");
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "password123",
      });
    });

    it("sets error and throws on sign-in failure", async () => {
      const signInError = new Error("Invalid credentials");
      (
        supabase.auth.signInWithPassword as ReturnType<typeof jest.fn>
      ).mockResolvedValue({
        data: null,
        error: signInError,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() =>
        result.current.signInWithEmail("bad@test.com", "wrong"),
      );

      expect(caught.message).toBe("Invalid credentials");
      expect(result.current.error).toBe("Invalid credentials");
      expect(result.current.loading).toBe(false);
    });

    it("sets loading state during sign-in", async () => {
      let resolveSignIn: (_value: Record<string, unknown>) => void;
      const signInPromise = new Promise<Record<string, unknown>>(
        (resolve) => {
          resolveSignIn = resolve;
        },
      );

      (
        supabase.auth.signInWithPassword as ReturnType<typeof jest.fn>
      ).mockReturnValue(signInPromise);

      const { result } = renderHook(() => useUnifiedAuth());

      let signInCall: Promise<void>;
      act(() => {
        signInCall = result.current.signInWithEmail("user@test.com", "pass");
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveSignIn({ data: { user: {}, session: {} }, error: null });
        await signInCall;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("signUpWithEmail", () => {
    it("calls supabase signUp with metadata", async () => {
      const mockSignUp = jest.fn<
        () => Promise<{
          data: { user: { id: string } };
          error: null;
        }>
      >();
      mockSignUp.mockResolvedValue({
        data: { user: { id: "new-user" } },
        error: null,
      });
      (supabase.auth as Record<string, unknown>).signUp = mockSignUp;

      const { result } = renderHook(() => useUnifiedAuth());

      await act(async () => {
        await result.current.signUpWithEmail("new@test.com", "pass123", {
          name: "New User",
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@test.com",
          password: "pass123",
          options: expect.objectContaining({
            data: { type: "donor", name: "New User" },
          }),
        }),
      );
    });

    it("sets error and throws when sign-up fails", async () => {
      const signUpError = new Error("Email already registered");
      const mockSignUp = jest.fn<
        () => Promise<{
          data: null;
          error: Error;
        }>
      >();
      mockSignUp.mockResolvedValue({
        data: null,
        error: signUpError,
      });
      (supabase.auth as Record<string, unknown>).signUp = mockSignUp;

      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() =>
        result.current.signUpWithEmail("dup@test.com", "pass"),
      );

      expect(caught.message).toBe("Email already registered");
      expect(result.current.error).toBe("Email already registered");
      expect(result.current.loading).toBe(false);
    });

    it("throws when signUp returns no user", async () => {
      const mockSignUp = jest.fn<
        () => Promise<{
          data: { user: null };
          error: null;
        }>
      >();
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      (supabase.auth as Record<string, unknown>).signUp = mockSignUp;

      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() =>
        result.current.signUpWithEmail("new@test.com", "pass"),
      );

      expect(caught.message).toBe("Failed to create account");
      expect(result.current.error).toBe("Failed to create account");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("unlinkWallet", () => {
    const mockUser = {
      id: "user-789",
      email: "unlink@test.com",
      user_metadata: {},
    };

    it("throws if user is not authenticated", async () => {
      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() =>
        result.current.unlinkWallet(),
      );

      expect(caught.message).toBe(
        "You must be signed in to unlink a wallet",
      );
      expect(result.current.error).toBe(
        "You must be signed in to unlink a wallet",
      );
      expect(result.current.loading).toBe(false);
    });

    it("calls supabase update to clear wallet fields", async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: mockUser as ReturnType<typeof useAuth>["user"],
      });

      // Mock the supabase from chain for update
      const mockUpdate = jest.fn();
      const mockEq = jest.fn(() =>
        Promise.resolve({ data: null, error: null }),
      );
      mockUpdate.mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof jest.fn>).mockImplementation(() => {
        const chain = createQueryChain({
          data: null,
          error: { message: "none" },
        });
        (chain as Record<string, unknown>).update = mockUpdate;
        return chain;
      });

      const { result } = renderHook(() => useUnifiedAuth());

      await act(async () => {
        await result.current.unlinkWallet();
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        wallet_address: null,
        wallet_linked_at: null,
      });
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut", async () => {
      const { result } = renderHook(() => useUnifiedAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("disconnects wallet before signing out if connected", async () => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        isConnected: true,
        disconnect: mockDisconnect,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockDisconnect).toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("sets error and throws on signOut failure", async () => {
      (supabase.auth.signOut as ReturnType<typeof jest.fn>).mockRejectedValue(
        new Error("Sign out failed"),
      );

      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() => result.current.signOut());

      expect(caught.message).toBe("Sign out failed");
      expect(result.current.error).toBe("Sign out failed");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("linkWallet", () => {
    it("throws if user is not authenticated", async () => {
      const { result } = renderHook(() => useUnifiedAuth());

      const caught = await actAndCatch(() => result.current.linkWallet());

      expect(caught.message).toBe(
        "You must be signed in to link a wallet",
      );
      expect(result.current.error).toBe(
        "You must be signed in to link a wallet",
      );
      expect(result.current.loading).toBe(false);
    });
  });

  describe("role resolution", () => {
    it("returns charity role when auth context has charity userType", () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: {
          id: "u1",
          email: "c@test.com",
          user_metadata: {},
        } as ReturnType<typeof useAuth>["user"],
        userType: "charity",
      });

      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.role).toBe("charity");
    });

    it("defaults to donor when userType is null", () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthMock,
        user: {
          id: "u2",
          email: "d@test.com",
          user_metadata: {},
        } as ReturnType<typeof useAuth>["user"],
        userType: null,
      });

      const { result } = renderHook(() => useUnifiedAuth());

      expect(result.current.role).toBe("donor");
    });
  });
});
