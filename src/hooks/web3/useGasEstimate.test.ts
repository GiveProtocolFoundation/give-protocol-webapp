import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useGasEstimate } from "./useGasEstimate";
import { useWeb3 } from "@/contexts/Web3Context";

jest.mock("@/contexts/Web3Context");
jest.mock("@/services/chainlinkPriceFeed");
jest.mock("@/utils/logger", () => ({
  Logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockGetPrice =
  jest.fn<() => Promise<{ price: number; symbol: string; updatedAt: number; isValid: boolean }>>();

beforeEach(async () => {
  const { chainlinkPriceFeedService } = await import(
    "@/services/chainlinkPriceFeed"
  );
  (
    chainlinkPriceFeedService as unknown as {
      getPrice: typeof mockGetPrice;
    }
  ).getPrice = mockGetPrice;
});

function setupProvider(maxFeePerGas: bigint) {
  jest.mocked(useWeb3).mockReturnValue({
    provider: {
      getFeeData: jest.fn<() => Promise<{ maxFeePerGas: bigint; gasPrice: null }>>().mockResolvedValue({
        maxFeePerGas,
        gasPrice: null,
      }),
    } as unknown as ReturnType<typeof useWeb3>["provider"],
    signer: null,
    address: "0xtest",
    chainId: 1,
    isConnected: true,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    switchChain: jest.fn(),
  });
}

describe("useGasEstimate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetPrice.mockResolvedValue({
      price: 2500,
      symbol: "ETH",
      updatedAt: 1700000000,
      isValid: true,
    });
    setupProvider(30000000000n);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should return gas estimate with USD conversion", async () => {
    const { result } = renderHook(() => useGasEstimate(100));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    const estimate = result.current.gasEstimate;
    expect(estimate?.nativeCurrencySymbol).toBe("ETH");
    expect(estimate?.gasEstimateUsd).toBeGreaterThan(0);
    expect(estimate?.isHighGasChain).toBe(true);
    expect(estimate?.gasEstimateNative).toBeGreaterThan(0);
  });

  it("should calculate gas ratio correctly", async () => {
    const { result } = renderHook(() => useGasEstimate(10));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    expect(result.current.gasRatio).not.toBeNull();
    expect(result.current.gasRatio).toBeGreaterThan(0);
  });

  it("should flag high gas ratio when gas > 20% of donation", async () => {
    const { result } = renderHook(() => useGasEstimate(5));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    expect(result.current.isHighGasRatio).toBe(true);
  });

  it("should not flag high gas ratio for large donations", async () => {
    const { result } = renderHook(() => useGasEstimate(10000));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    expect(result.current.isHighGasRatio).toBe(false);
  });

  it("should return null gas ratio when donation amount is null", async () => {
    const { result } = renderHook(() => useGasEstimate(null));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    expect(result.current.gasRatio).toBeNull();
    expect(result.current.isHighGasRatio).toBe(false);
  });

  it("should handle price fetch failure gracefully", async () => {
    mockGetPrice.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGasEstimate(100));

    await waitFor(() => {
      expect(result.current.gasEstimate).not.toBeNull();
    });

    expect(result.current.gasEstimate?.gasEstimateUsd).toBe(0);
  });

  it("should return null when provider is not available", async () => {
    jest.mocked(useWeb3).mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });

    const { result } = renderHook(() => useGasEstimate(100));

    expect(result.current.gasEstimate).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
