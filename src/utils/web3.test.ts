import { describe, it, expect, jest } from "@jest/globals";
import { formatBalance, shortenAddress, isValidAddress } from "./web3";

jest.mock("@/utils/logger", () => ({
  Logger: {
    error: jest.fn(),
  },
}));

describe("formatBalance", () => {
  it("should format a bigint balance with 12 decimal places", () => {
    const result = formatBalance("1000000000000");
    expect(result).toBe("1.000000000000");
  });

  it("should handle zero balance", () => {
    expect(formatBalance(0)).toBe("0.00");
  });

  it("should handle empty string", () => {
    expect(formatBalance("")).toBe("0.00");
  });

  it("should handle string with non-numeric characters", () => {
    const result = formatBalance("1.5e18");
    expect(result).toMatch(/^\d+\.\d{12}$/);
  });

  it("should handle bigint input", () => {
    const result = formatBalance(BigInt("5000000000000"));
    expect(result).toBe("5.000000000000");
  });

  it("should return 0.00 on error", () => {
    // @ts-expect-error testing invalid input
    expect(formatBalance(null)).toBe("0.00");
  });
});

describe("shortenAddress", () => {
  it("should shorten a long address", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678",
    );
  });

  it("should return short addresses unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });

  it("should handle empty string", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("should handle undefined-like input", () => {
    const input = undefined as unknown as string;
    expect(shortenAddress(input)).toBe("");
  });
});

describe("isValidAddress", () => {
  it("should validate Ethereum addresses", () => {
    expect(isValidAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      true,
    );
  });

  it("should reject short Ethereum addresses", () => {
    expect(isValidAddress("0x1234")).toBe(false);
  });

  it("should reject invalid addresses", () => {
    expect(isValidAddress("not-an-address")).toBe(false);
  });
});
