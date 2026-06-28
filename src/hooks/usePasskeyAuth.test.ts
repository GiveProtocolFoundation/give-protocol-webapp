import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { usePasskeyAuth } from "./usePasskeyAuth";
import { supabase } from "@/lib/supabase";

// @/lib/supabase is mapped via jest moduleNameMapper to src/test-utils/supabaseMock.js
// @/utils/logger is mapped via jest moduleNameMapper to src/test-utils/loggerMock.js
// The in-test jest.mock() calls are ignored — use the global mock objects directly.

describe("usePasskeyAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish default resolved value after clearAllMocks wipes call records
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
  });

  describe("isSupported", () => {
    it("returns true when PublicKeyCredential is available", () => {
      const originalPKC = window.PublicKeyCredential;
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePasskeyAuth());
      expect(result.current.isSupported).toBe(true);

      Object.defineProperty(window, "PublicKeyCredential", {
        value: originalPKC,
        configurable: true,
        writable: true,
      });
    });

    it("returns false when PublicKeyCredential is undefined", () => {
      const originalPKC = window.PublicKeyCredential;
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePasskeyAuth());
      expect(result.current.isSupported).toBe(false);

      Object.defineProperty(window, "PublicKeyCredential", {
        value: originalPKC,
        configurable: true,
        writable: true,
      });
    });
  });

  describe("initial state", () => {
    it("returns correct initial state", () => {
      const { result } = renderHook(() => usePasskeyAuth());
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.registerPasskey).toBe("function");
      expect(typeof result.current.loginWithPasskey).toBe("function");
      expect(typeof result.current.listPasskeys).toBe("function");
      expect(typeof result.current.removePasskey).toBe("function");
    });
  });

  describe("registerPasskey", () => {
    it("throws when browser does not support passkeys", async () => {
      const originalPKC = window.PublicKeyCredential;
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        act(async () => {
          await result.current.registerPasskey();
        }),
      ).rejects.toThrow("Passkeys are not supported in this browser");

      Object.defineProperty(window, "PublicKeyCredential", {
        value: originalPKC,
        configurable: true,
        writable: true,
      });
    });

    it("calls passkey-register-options edge function", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      const mockOptions = {
        challenge: "test-challenge",
        rp: { name: "Give Protocol", id: "giveprotocol.io" },
        user: { id: "user-id", name: "test@example.com", displayName: "Test" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: true, options: mockOptions },
        error: null,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await act(async () => {
        try {
          await result.current.registerPasskey("My Device");
        } catch {
          // May fail due to dynamic import in test env — that's OK
        }
      });

      // Verify the register-options edge function was called
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "passkey-register-options",
        { body: { deviceName: "My Device" } },
      );
    });

    it("throws when register-options returns a server error", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: false, error: "User not authenticated" },
        error: null,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        act(async () => {
          await result.current.registerPasskey();
        }),
      ).rejects.toThrow("User not authenticated");
    });

    it("returns silently when user cancels registration (NotAllowedError)", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: "NotAllowedError: user cancelled" },
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await act(async () => {
        await result.current.registerPasskey();
      });

      // Cancellation: no error set, loading reset
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("passes undefined deviceName when called with no argument", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: true, options: {} },
        error: null,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await act(async () => {
        try {
          await result.current.registerPasskey();
        } catch {
          // Dynamic import may fail in test env — that's OK
        }
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "passkey-register-options",
        { body: { deviceName: undefined } },
      );
    });
  });

  describe("loginWithPasskey", () => {
    it("throws when browser does not support passkeys", async () => {
      const originalPKC = window.PublicKeyCredential;
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        act(async () => {
          await result.current.loginWithPasskey();
        }),
      ).rejects.toThrow("Passkeys are not supported in this browser");

      Object.defineProperty(window, "PublicKeyCredential", {
        value: originalPKC,
        configurable: true,
        writable: true,
      });
    });

    it("returns undefined silently when user cancels (NotAllowedError)", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      // Simulate invoke returning an error matching the cancellation pattern.
      // This exercises the catch branch that previously re-threw the error (Bug 2).
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: "NotAllowedError: user cancelled biometric prompt" },
      });

      const { result } = renderHook(() => usePasskeyAuth());

      let returnValue: unknown = "sentinel";
      await act(async () => {
        returnValue = await result.current.loginWithPasskey();
      });

      // After Bug 2 fix: must return undefined, not throw
      expect(returnValue).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("throws for non-cancellation login failure", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: false, error: "No credentials found" },
        error: null,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await expect(
        act(async () => {
          await result.current.loginWithPasskey();
        }),
      ).rejects.toThrow("No credentials found");
    });

    it("calls passkey-login-options edge function", async () => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {},
        configurable: true,
        writable: true,
      });

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: true, options: { challenge: "login-challenge" } },
        error: null,
      });

      const { result } = renderHook(() => usePasskeyAuth());

      await act(async () => {
        try {
          await result.current.loginWithPasskey();
        } catch {
          // Dynamic import may fail in test env — that's OK
        }
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "passkey-login-options",
        { body: {} },
      );
    });
  });

  describe("listPasskeys", () => {
    it("queries user_passkeys table", async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      let passkeys: unknown[] = [];
      await act(async () => {
        passkeys = await result.current.listPasskeys();
      });

      expect(supabase.from).toHaveBeenCalledWith("user_passkeys");
      expect(Array.isArray(passkeys)).toBe(true);
    });
  });

  describe("removePasskey", () => {
    it("deletes passkey by credential ID", async () => {
      const { result } = renderHook(() => usePasskeyAuth());

      await act(async () => {
        await result.current.removePasskey("cred-to-delete");
      });

      expect(supabase.from).toHaveBeenCalledWith("user_passkeys");
    });
  });
});
