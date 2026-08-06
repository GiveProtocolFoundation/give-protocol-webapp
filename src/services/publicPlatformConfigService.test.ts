import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import { getPublicPlatformConfig } from "./publicPlatformConfigService";

// supabase is mocked globally via moduleNameMapper → supabaseMock.js

describe("publicPlatformConfigService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  describe("getPublicPlatformConfig", () => {
    it("should call get_public_platform_config with no params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: { supported_networks: [], supported_tokens: [] },
        error: null,
      });

      await getPublicPlatformConfig();

      expect(supabase.rpc).toHaveBeenCalledWith("get_public_platform_config");
    });

    it("should parse {chainId, name}[] shape for supported_networks", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: {
          supported_networks: [
            { chainId: 8453, name: "Base" },
            { chainId: 10, name: "Optimism" },
            { chainId: 42161, name: "Arbitrum" },
          ],
          supported_tokens: ["USDC", "ETH"],
        },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([8453, 10, 42161]);
      expect(result.supportedTokens).toEqual(["USDC", "ETH"]);
    });

    it("should parse plain number[] for supported_networks", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: {
          supported_networks: [8453, 10, 900001],
          supported_tokens: ["ETH"],
        },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([8453, 10, 900001]);
    });

    it("should include synthetic non-EVM chain IDs", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: {
          supported_networks: [
            { chainId: 900001, name: "Solana" },
            { chainId: 8453, name: "Base" },
            { chainId: 42161, name: "Arbitrum" },
          ],
          supported_tokens: ["SOL", "ETH", "ETH"],
        },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([900001, 8453, 42161]);
      expect(result.supportedTokens).toEqual(["SOL", "ETH", "ETH"]);
    });

    it("should skip items with invalid chainId", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: {
          supported_networks: [
            { chainId: 8453, name: "Base" },
            { chainId: "bad", name: "Unknown" },
            null,
            "not-an-object",
            42,
          ],
          supported_tokens: [],
        },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([8453, 42]);
    });

    it("should filter non-string values from supported_tokens", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: {
          supported_networks: [],
          supported_tokens: ["USDC", 42, null, "ETH", true],
        },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedTokens).toEqual(["USDC", "ETH"]);
    });

    it("should handle empty arrays", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: { supported_networks: [], supported_tokens: [] },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([]);
      expect(result.supportedTokens).toEqual([]);
    });

    it("should handle non-array supported_networks (returns empty)", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: { supported_networks: null, supported_tokens: ["USDC"] },
        error: null,
      });

      const result = await getPublicPlatformConfig();

      expect(result.supportedNetworks).toEqual([]);
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(getPublicPlatformConfig()).rejects.toThrow("Access denied");
    });

    it("should throw when data is null with no error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      await expect(getPublicPlatformConfig()).rejects.toThrow(
        "get_public_platform_config returned null",
      );
    });

    it("should throw on network exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      await expect(getPublicPlatformConfig()).rejects.toThrow(
        "Network failure",
      );
    });
  });
});
