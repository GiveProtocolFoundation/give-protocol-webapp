import { jest } from "@jest/globals";
import {
  formatAddress,
  formatBalance,
  formatUsdValue,
  getAddressGradient,
  getExplorerUrl,
  copyToClipboard,
  NETWORK_NAMES,
  NETWORK_TOKENS,
  PROVIDER_NAMES,
} from "./utils";

describe("getAddressGradient", () => {
  it("returns the first gradient for empty or short addresses", () => {
    expect(getAddressGradient("")).toContain("linear-gradient(135deg,");
    expect(getAddressGradient("0x")).toContain("#667eea");
    expect(getAddressGradient("0x1")).toContain("#667eea");
  });

  it("derives a deterministic gradient from address bytes", () => {
    const firstGradient = getAddressGradient("0xab1234567890");
    const secondGradient = getAddressGradient("0xab9876543210");
    expect(firstGradient).toBe(secondGradient);
  });

  it("produces different gradients for addresses with different leading bytes", () => {
    const firstGradient = getAddressGradient("0x00abcdef0000");
    const secondGradient = getAddressGradient("0x07abcdef0000");
    expect(firstGradient).not.toBe(secondGradient);
  });

  it("always returns a CSS linear-gradient string", () => {
    expect(getAddressGradient("0xff00112233445566")).toMatch(
      /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/i,
    );
  });
});

describe("formatAddress", () => {
  it("returns empty string for falsy input", () => {
    expect(formatAddress("")).toBe("");
  });

  it("returns the address as-is when shorter than 12 characters", () => {
    expect(formatAddress("0x1234")).toBe("0x1234");
    expect(formatAddress("0xabcdef0123")).toBe("0xabcdef0123");
  });

  it("formats long addresses in short variant by default (6...4)", () => {
    expect(formatAddress("0x1234567890abcdef1234")).toBe("0x1234...1234");
  });

  it("formats long addresses in medium variant (8...6)", () => {
    expect(formatAddress("0x1234567890abcdef1234", "medium")).toBe(
      "0x123456...ef1234",
    );
  });
});

describe("getExplorerUrl", () => {
  it("returns the correct URL for each known network", () => {
    expect(getExplorerUrl("polkadot", "0xabc")).toBe(
      "https://polkadot.subscan.io/account/0xabc",
    );
    expect(getExplorerUrl("base", "0xdef")).toBe(
      "https://basescan.org/address/0xdef",
    );
    expect(getExplorerUrl("optimism-sepolia", "0x1")).toBe(
      "https://sepolia-optimistic.etherscan.io/address/0x1",
    );
    expect(getExplorerUrl("solana-mainnet", "ABC")).toBe(
      "https://explorer.solana.com/address/ABC",
    );
  });

  it("falls back to the moonbase explorer for unknown networks", () => {
    expect(getExplorerUrl("unknown-network", "0xdead")).toBe(
      "https://moonbase.moonscan.io/address/0xdead",
    );
  });
});

describe("network constants", () => {
  it("exposes display names for every supported network", () => {
    expect(NETWORK_NAMES.moonbase).toBe("Moonbase Alpha");
    expect(NETWORK_NAMES["base-sepolia"]).toBe("Base Sepolia");
    expect(NETWORK_NAMES["optimism-sepolia"]).toBe("OP Sepolia");
  });

  it("exposes token symbols for every supported network", () => {
    expect(NETWORK_TOKENS.polkadot).toBe("DOT");
    expect(NETWORK_TOKENS.moonbeam).toBe("GLMR");
    expect(NETWORK_TOKENS.base).toBe("ETH");
    expect(NETWORK_TOKENS["solana-mainnet"]).toBe("SOL");
  });

  it("exposes display names for every supported wallet provider", () => {
    expect(PROVIDER_NAMES["polkadot-js"]).toBe("Polkadot.js");
    expect(PROVIDER_NAMES.talisman).toBe("Talisman");
    expect(PROVIDER_NAMES.metamask).toBe("MetaMask");
  });
});

describe("formatBalance", () => {
  it("returns the zero placeholder for missing input", () => {
    const missing: string | number | undefined = undefined;
    expect(formatBalance(missing)).toBe("0.0000");
    expect(formatBalance(null as unknown as undefined)).toBe("0.0000");
    expect(formatBalance("")).toBe("0.0000");
  });

  it("formats numeric input with the default 4 decimals", () => {
    expect(formatBalance(1.23456)).toBe("1.2346");
  });

  it("formats string input by parsing it as a float", () => {
    expect(formatBalance("2.5")).toBe("2.5000");
  });

  it("respects a custom decimal count", () => {
    expect(formatBalance(1.234567, 2)).toBe("1.23");
    expect(formatBalance(1, 0)).toBe("1");
  });

  it("returns the zero placeholder for non-numeric strings", () => {
    expect(formatBalance("not a number")).toBe("0.0000");
  });
});

describe("formatUsdValue", () => {
  it("returns $0.00 for missing input", () => {
    const missing: string | number | undefined = undefined;
    expect(formatUsdValue(missing)).toBe("$0.00");
    expect(formatUsdValue(null as unknown as undefined)).toBe("$0.00");
    expect(formatUsdValue("")).toBe("$0.00");
  });

  it("formats numeric values with the USD symbol and grouping", () => {
    expect(formatUsdValue(1234.5)).toBe("$1,234.50");
  });

  it("formats string values by parsing them as floats", () => {
    expect(formatUsdValue("99.9")).toBe("$99.90");
  });

  it("returns $0.00 for non-numeric strings", () => {
    expect(formatUsdValue("abc")).toBe("$0.00");
  });
});

describe("copyToClipboard", () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    document.execCommand = originalExecCommand;
  });

  it("uses navigator.clipboard.writeText on the happy path", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const result = await copyToClipboard("hello");

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when the clipboard API rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand =
      execCommand as unknown as typeof document.execCommand;

    const result = await copyToClipboard("fallback text");

    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false when both the clipboard API and execCommand fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error("denied")),
      },
    });
    document.execCommand = jest.fn(() => {
      throw new Error("execCommand unsupported");
    }) as unknown as typeof document.execCommand;

    const result = await copyToClipboard("anything");

    expect(result).toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});
