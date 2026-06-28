import { jest } from "@jest/globals";
import {
  isEIP1193Provider,
  isWalletError,
  hasErrorCode,
  hasErrorMessage,
  isEventObject,
  getChainParams,
  switchToChain,
} from "../web3ContextHelpers";

describe("web3ContextHelpers", () => {
  describe("isEIP1193Provider", () => {
    it("returns true for an object with a request method", () => {
      expect(isEIP1193Provider({ request: jest.fn() })).toBe(true);
    });

    it("returns false for null", () => {
      expect(isEIP1193Provider(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isEIP1193Provider()).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isEIP1193Provider("foo")).toBe(false);
      expect(isEIP1193Provider(42)).toBe(false);
      expect(isEIP1193Provider(true)).toBe(false);
    });

    it("returns false for objects without a request method", () => {
      expect(isEIP1193Provider({})).toBe(false);
      expect(isEIP1193Provider({ request: "not a function" })).toBe(false);
    });
  });

  describe("isWalletError", () => {
    it("returns true for any non-null object", () => {
      expect(isWalletError({ code: 4001 })).toBe(true);
      expect(isWalletError({ message: "boom" })).toBe(true);
      expect(isWalletError(new Error("boom"))).toBe(true);
    });

    it("returns false for null", () => {
      expect(isWalletError(null)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isWalletError("string")).toBe(false);
      expect(isWalletError(123)).toBe(false);
      expect(isWalletError()).toBe(false);
    });
  });

  describe("hasErrorCode", () => {
    it("returns true when error.code matches the supplied code", () => {
      expect(hasErrorCode({ code: 4001 }, 4001)).toBe(true);
    });

    it("returns false when codes differ", () => {
      expect(hasErrorCode({ code: 4001 }, 4902)).toBe(false);
    });

    it("returns false when error has no code", () => {
      expect(hasErrorCode({ message: "no code" }, 4001)).toBe(false);
    });

    it("returns false for non-error values", () => {
      expect(hasErrorCode(null, 4001)).toBe(false);
      expect(hasErrorCode("string", 4001)).toBe(false);
    });
  });

  describe("hasErrorMessage", () => {
    it("returns true when message contains the substring", () => {
      expect(
        hasErrorMessage(
          { message: "wallet has not been authorized yet" },
          "has not been authorized",
        ),
      ).toBe(true);
    });

    it("returns false when message does not contain the substring", () => {
      expect(hasErrorMessage({ message: "foo" }, "bar")).toBe(false);
    });

    it("returns false when message is missing or non-string", () => {
      expect(hasErrorMessage({ message: 123 }, "foo")).toBe(false);
      expect(hasErrorMessage({}, "foo")).toBe(false);
    });

    it("returns false for null and primitives", () => {
      expect(hasErrorMessage(null, "foo")).toBe(false);
      expect(hasErrorMessage("string", "foo")).toBe(false);
    });
  });

  describe("isEventObject", () => {
    it("returns true for a real Event instance", () => {
      expect(isEventObject(new Event("click"))).toBe(true);
    });

    it("returns true for synthetic React events (have nativeEvent)", () => {
      expect(isEventObject({ nativeEvent: new Event("click") })).toBe(true);
    });

    it("returns false for plain objects", () => {
      expect(isEventObject({})).toBe(false);
      expect(isEventObject({ foo: "bar" })).toBe(false);
    });

    it("returns false for null and primitives", () => {
      expect(isEventObject(null)).toBe(false);
      expect(isEventObject()).toBe(false);
      expect(isEventObject("event")).toBe(false);
      expect(isEventObject(42)).toBe(false);
    });
  });

  describe("getChainParams", () => {
    it("returns chain params for a known chain", () => {
      // 1287 = MOONBASE in the contractsMock.
      const params = getChainParams(1287);
      expect(params).toMatchObject({
        chainId: "0x507",
        chainName: "Moonbase Alpha",
      });
      expect(Array.isArray(params?.rpcUrls)).toBe(true);
      expect(Array.isArray(params?.blockExplorerUrls)).toBe(true);
      expect(params?.nativeCurrency).toBeDefined();
    });

    it("encodes chainId as a hex string", () => {
      // 84532 = BASE_SEPOLIA -> 0x14a34
      const params = getChainParams(84532);
      expect(params?.chainId).toBe("0x14a34");
    });

    it("returns null for unsupported chain IDs", () => {
      expect(getChainParams(99999 as never)).toBeNull();
    });
  });

  describe("switchToChain", () => {
    const baseProvider = () => ({
      request: jest.fn(),
    });

    it("calls wallet_switchEthereumChain with the encoded chain id", async () => {
      const provider = baseProvider();
      provider.request.mockResolvedValueOnce(null);

      await switchToChain(provider as never, 1287 as never);

      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x507" }],
      });
    });

    it("falls back to wallet_addEthereumChain when chain is not added (4902)", async () => {
      const provider = baseProvider();
      provider.request
        .mockRejectedValueOnce({ code: 4902 })
        .mockResolvedValueOnce(null);

      await switchToChain(provider as never, 1287 as never);

      expect(provider.request).toHaveBeenNthCalledWith(2, {
        method: "wallet_addEthereumChain",
        params: [
          expect.objectContaining({
            chainId: "0x507",
            chainName: "Moonbase Alpha",
          }),
        ],
      });
    });

    it("throws a friendly message when the user rejects (4001)", async () => {
      const provider = baseProvider();
      provider.request.mockRejectedValueOnce({ code: 4001 });

      await expect(
        switchToChain(provider as never, 1287 as never),
      ).rejects.toThrow(/Please switch to/);
    });

    it("throws a generic message for other switch errors", async () => {
      const provider = baseProvider();
      provider.request.mockRejectedValueOnce({ code: -32000, message: "rpc" });

      await expect(
        switchToChain(provider as never, 1287 as never),
      ).rejects.toThrow("Failed to switch network. Please try again.");
    });

    it("throws when the chain id is not configured", async () => {
      const provider = baseProvider();
      await expect(
        switchToChain(provider as never, 99999 as never),
      ).rejects.toThrow(/Unsupported chain/);
      expect(provider.request).not.toHaveBeenCalled();
    });
  });
});
