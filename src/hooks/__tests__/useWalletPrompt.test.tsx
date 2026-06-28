import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { Logger } from "@/utils/logger";
import { useWalletPrompt } from "../useWalletPrompt";

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

const DISMISSED_KEY = "give_protocol_wallet_prompt_dismissed";
const DISMISSED_AT_KEY = "give_protocol_wallet_prompt_dismissed_at";

function setAuth(user: { id: string; email: string } | null): void {
  mockedUseAuth.mockReturnValue({
    user,
    userType: user ? "donor" : null,
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

function setWeb3(isConnected: boolean): void {
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
  localStorage.clear();
  setAuth(null);
  setWeb3(false);
});

describe("useWalletPrompt", () => {
  it("hides modal and banner when user is logged out", () => {
    const { result } = renderHook(() => useWalletPrompt());
    expect(result.current.showModal).toBe(false);
    expect(result.current.showBanner).toBe(false);
  });

  it("logs the prompt and flips hasShownPrompt when a fresh logged-in user has no wallet", () => {
    setAuth({ id: "u", email: "u@x" });
    renderHook(() => useWalletPrompt());
    // showModal is computed as true on the first render; the effect then sets
    // hasShownPrompt = true so the next render returns false. We assert via
    // the Logger side-effect, which only fires while showModal is still true.
    expect(mockedLogger.info).toHaveBeenCalledWith(
      "Showing wallet connection modal",
    );
  });

  it("hides the modal once it has been dismissed and shows the banner instead", () => {
    setAuth({ id: "u", email: "u@x" });
    const { result } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.dismissModal();
    });

    expect(result.current.showModal).toBe(false);
    expect(result.current.showBanner).toBe(true);
  });

  it("persists the dismissal to localStorage when the banner is dismissed", () => {
    setAuth({ id: "u", email: "u@x" });
    const { result } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.dismissModal();
    });
    act(() => {
      result.current.dismissBanner();
    });

    expect(result.current.showBanner).toBe(false);
    expect(localStorage.getItem(DISMISSED_KEY)).toBe("true");
    expect(localStorage.getItem(DISMISSED_AT_KEY)).not.toBeNull();
  });

  it("respects an active prior dismissal stored in localStorage", () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setAuth({ id: "u", email: "u@x" });

    const { result } = renderHook(() => useWalletPrompt());
    expect(result.current.showModal).toBe(false);
    expect(result.current.showBanner).toBe(false);
  });

  it("clears an expired dismissal", () => {
    const stale = Date.now() - 25 * 60 * 60 * 1000; // 25 h ago
    localStorage.setItem(DISMISSED_KEY, "true");
    localStorage.setItem(DISMISSED_AT_KEY, String(stale));
    setAuth({ id: "u", email: "u@x" });

    renderHook(() => useWalletPrompt());
    expect(localStorage.getItem(DISMISSED_KEY)).toBeNull();
  });

  it("hides everything once the wallet connects, regardless of past dismissal", () => {
    setAuth({ id: "u", email: "u@x" });
    const { result, rerender } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.dismissModal();
    });
    act(() => {
      result.current.dismissBanner();
    });

    setWeb3(true);
    rerender();

    expect(result.current.showModal).toBe(false);
    expect(result.current.showBanner).toBe(false);
  });

  it("clears all prompt state when onWalletConnected is invoked", () => {
    setAuth({ id: "u", email: "u@x" });
    localStorage.setItem(DISMISSED_KEY, "true");
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));

    const { result } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.onWalletConnected();
    });

    expect(localStorage.getItem(DISMISSED_KEY)).toBeNull();
    expect(localStorage.getItem(DISMISSED_AT_KEY)).toBeNull();
  });

  it("resets state on resetPromptState", () => {
    setAuth({ id: "u", email: "u@x" });
    localStorage.setItem(DISMISSED_KEY, "true");
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));

    const { result } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.resetPromptState();
    });

    expect(localStorage.getItem(DISMISSED_KEY)).toBeNull();
    expect(localStorage.getItem(DISMISSED_AT_KEY)).toBeNull();
  });

  it("resets session-only flags when the user logs out", () => {
    setAuth({ id: "u", email: "u@x" });
    const { result, rerender } = renderHook(() => useWalletPrompt());

    act(() => {
      result.current.dismissModal();
    });
    expect(result.current.showBanner).toBe(true);

    setAuth(null);
    rerender();

    // No user → both prompts hidden, regardless of session dismissal flag.
    expect(result.current.showModal).toBe(false);
    expect(result.current.showBanner).toBe(false);
  });

  it("treats malformed localStorage entries as no dismissal", () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    // Missing the timestamp key → isDismissalActive returns false.
    setAuth({ id: "u", email: "u@x" });

    renderHook(() => useWalletPrompt());
    // The Logger.info side-effect only fires when isDismissalActive returns false.
    expect(mockedLogger.info).toHaveBeenCalledWith(
      "Showing wallet connection modal",
    );
  });
});
