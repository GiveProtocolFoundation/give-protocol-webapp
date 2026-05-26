import { describe, it, expect, beforeEach } from "@jest/globals";
import { TalismanProvider } from "../TalismanProvider";

// Minimal mock for window.talismanEth
function makeTalismanEth() {
  return {
    request({ method }: { method: string; params?: unknown[] }) {
      if (method === "eth_requestAccounts") return Promise.resolve(["0xabc"]);
      if (method === "eth_accounts") return Promise.resolve(["0xabc"]);
      if (method === "eth_chainId") return Promise.resolve("0x1");
      return Promise.resolve(undefined);
    },
    // No-op stubs required by the EIP-1193 provider interface
    on(_event: string, _handler: unknown) {
      /* stub */
    },
    removeListener(_event: string, _handler: unknown) {
      /* stub */
    },
    isMetaMask: false,
    isTalisman: true,
  };
}

describe("TalismanProvider", () => {
  beforeEach(() => {
    // Clear talismanEth
    Object.defineProperty(window, "talismanEth", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("re-throws with a user-readable message when Talisman is not configured", async () => {
    // Simulate Talisman installed but not onboarded
    const talismanEth = {
      ...makeTalismanEth(),
      request() {
        return Promise.reject(
          new Error(
            "Talisman extension has not been configured yet. Please set it up first.",
          ),
        );
      },
    };
    Object.defineProperty(window, "talismanEth", {
      value: talismanEth,
      configurable: true,
      writable: true,
    });

    const provider = new TalismanProvider();
    await expect(provider.connect("evm")).rejects.toThrow(
      /Talisman needs to be set up first/,
    );
  });

  it("propagates other errors unchanged", async () => {
    const talismanEth = {
      ...makeTalismanEth(),
      request() {
        return Promise.reject(new Error("User rejected the request"));
      },
    };
    Object.defineProperty(window, "talismanEth", {
      value: talismanEth,
      configurable: true,
      writable: true,
    });

    const provider = new TalismanProvider();
    await expect(provider.connect("evm")).rejects.toThrow(
      /User rejected the request/,
    );
  });
});
