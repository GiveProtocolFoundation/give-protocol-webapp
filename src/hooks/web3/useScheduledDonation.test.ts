import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useScheduledDonation } from "./useScheduledDonation";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { getContractAddress } from "@/config/contracts";

// Real contract address (non-dummy) for tests that reach contract call path
const REAL_CONTRACT_ADDRESS = "0xabcdef1234567890123456789012345678abcdef";
const DONOR_ADDRESS = "0xTestDonorAddress";

/**
 * Helper: set up useWeb3 with a connected wallet and mock provider
 * @returns The mock getSigner function for further configuration
 */
function setupConnectedWallet() {
  const mockSigner = {};
  const mockGetSigner = jest
    .fn<() => Promise<object>>()
    .mockResolvedValue(mockSigner);
  const mockProvider = { getSigner: mockGetSigner };

  jest.mocked(useWeb3).mockReturnValue({
    provider: mockProvider as unknown as ReturnType<typeof useWeb3>["provider"],
    signer: null,
    address: DONOR_ADDRESS,
    chainId: 84532,
    isConnected: true,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    switchChain: jest.fn(),
  });

  return mockGetSigner;
}

describe("useScheduledDonation", () => {
  beforeEach(() => {
    jest
      .mocked(getContractAddress)
      .mockReturnValue("0x1234567890123456789012345678901234567890");
    jest.mocked(useWeb3).mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: 84532,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });
  });

  afterEach(() => {
    jest.mocked(ethers.Contract).mockReset();
  });

  it("initial state has loading false and error null", () => {
    const { result } = renderHook(() => useScheduledDonation());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe("when wallet is not connected", () => {
    it("createSchedule throws Wallet not connected", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await expect(
        result.current.createSchedule({
          charityAddress: "0xabc",
          tokenAddress: "0xdef",
          totalAmount: "1.0",
        }),
      ).rejects.toThrow("Wallet not connected");
    });

    it("cancelSchedule throws Wallet not connected", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await expect(result.current.cancelSchedule(1)).rejects.toThrow(
        "Wallet not connected",
      );
    });

    it("getDonorSchedules returns empty array", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });
  });

  describe("when wallet is connected with dummy dev contract address", () => {
    beforeEach(() => {
      setupConnectedWallet();
    });

    it("createSchedule throws dev mode error for dummy contract", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(
          result.current.createSchedule({
            charityAddress: "0xabc",
            tokenAddress: "0xdef",
            totalAmount: "1.0",
          }),
        ).rejects.toThrow(
          "Scheduled donations are not available in development mode.",
        );
      });
    });

    it("cancelSchedule throws dev mode error for dummy contract", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(result.current.cancelSchedule(1)).rejects.toThrow(
          "Scheduled donations are not available in development mode.",
        );
      });
    });

    it("getDonorSchedules returns empty array for dummy contract", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });
  });

  describe("when getContractAddress throws (contract not deployed)", () => {
    beforeEach(() => {
      setupConnectedWallet();
      jest.mocked(getContractAddress).mockImplementation(() => {
        throw new Error("No contract addresses found");
      });
    });

    it("createSchedule throws not deployed error", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(
          result.current.createSchedule({
            charityAddress: "0xabc",
            tokenAddress: "0xdef",
            totalAmount: "1.0",
          }),
        ).rejects.toThrow("Distribution contract not deployed");
      });
    });

    it("cancelSchedule throws not deployed error", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(result.current.cancelSchedule(1)).rejects.toThrow(
          "Distribution contract not deployed",
        );
      });
    });

    it("getDonorSchedules returns empty array when contract not deployed", async () => {
      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });
  });

  describe("with real contract address — createSchedule", () => {
    const mockApprove =
      jest.fn<() => Promise<{ wait: () => Promise<object> }>>();
    const mockCreateSchedule =
      jest.fn<() => Promise<{ wait: () => Promise<{ hash: string }> }>>();

    beforeEach(() => {
      setupConnectedWallet();
      jest.mocked(getContractAddress).mockReturnValue(REAL_CONTRACT_ADDRESS);

      // ethers.Contract is called twice for createSchedule:
      // 1st: distribution contract (createSchedule method)
      // 2nd: token contract (approve method)
      let callCount = 0;
      jest.mocked(ethers.Contract).mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { createSchedule: mockCreateSchedule } as ReturnType<
            typeof ethers.Contract
          >;
        }
        return { approve: mockApprove } as ReturnType<typeof ethers.Contract>;
      });
    });

    it("approves token then creates schedule, returns tx hash", async () => {
      mockApprove.mockResolvedValue({
        wait: jest.fn<() => Promise<object>>().mockResolvedValue({}),
      });
      mockCreateSchedule.mockResolvedValue({
        wait: jest
          .fn<() => Promise<{ hash: string }>>()
          .mockResolvedValue({ hash: "0xCreatedHash" }),
      });

      const { result } = renderHook(() => useScheduledDonation());
      let txHash: string | undefined;
      await act(async () => {
        txHash = await result.current.createSchedule({
          charityAddress: "0xCharity",
          tokenAddress: "0xToken",
          totalAmount: "10",
        });
      });

      expect(txHash).toBe("0xCreatedHash");
      expect(mockApprove).toHaveBeenCalled();
      expect(mockCreateSchedule).toHaveBeenCalledWith(
        "0xCharity",
        "0xToken",
        expect.anything(),
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets error on user rejection during token approval (code 4001)", async () => {
      const rejectionError = Object.assign(new Error("user rejected"), {
        code: 4001,
      });
      mockApprove.mockRejectedValue(rejectionError);

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(
          result.current.createSchedule({
            charityAddress: "0xCharity",
            tokenAddress: "0xToken",
            totalAmount: "10",
          }),
        ).rejects.toThrow("Please approve the transaction in your wallet");
      });
      expect(result.current.error).toContain("Please approve the transaction");
      expect(result.current.loading).toBe(false);
    });

    it("sets error on user rejection during schedule creation", async () => {
      mockApprove.mockResolvedValue({
        wait: jest.fn<() => Promise<object>>().mockResolvedValue({}),
      });
      const rejectionError = Object.assign(new Error("user rejected"), {
        code: 4001,
      });
      mockCreateSchedule.mockRejectedValue(rejectionError);

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(
          result.current.createSchedule({
            charityAddress: "0xCharity",
            tokenAddress: "0xToken",
            totalAmount: "10",
          }),
        ).rejects.toThrow(
          "Please confirm the transaction in your wallet to schedule",
        );
      });
      expect(result.current.error).toContain("Please confirm the transaction");
    });

    it("propagates non-rejection contract errors", async () => {
      mockApprove.mockRejectedValue(new Error("insufficient funds"));

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(
          result.current.createSchedule({
            charityAddress: "0xCharity",
            tokenAddress: "0xToken",
            totalAmount: "10",
          }),
        ).rejects.toThrow("insufficient funds");
      });
      expect(result.current.error).toBe("insufficient funds");
    });
  });

  describe("with real contract address — cancelSchedule", () => {
    const mockCancelScheduleFn =
      jest.fn<() => Promise<{ wait: () => Promise<{ hash: string }> }>>();

    beforeEach(() => {
      setupConnectedWallet();
      jest.mocked(getContractAddress).mockReturnValue(REAL_CONTRACT_ADDRESS);
      jest
        .mocked(ethers.Contract)
        .mockImplementation(
          () =>
            ({ cancelSchedule: mockCancelScheduleFn }) as ReturnType<
              typeof ethers.Contract
            >,
        );
    });

    it("cancels schedule and returns tx hash", async () => {
      mockCancelScheduleFn.mockResolvedValue({
        wait: jest
          .fn<() => Promise<{ hash: string }>>()
          .mockResolvedValue({ hash: "0xCancelHash" }),
      });

      const { result } = renderHook(() => useScheduledDonation());
      let txHash: string | undefined;
      await act(async () => {
        txHash = await result.current.cancelSchedule(42);
      });
      expect(txHash).toBe("0xCancelHash");
      expect(mockCancelScheduleFn).toHaveBeenCalledWith(42);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("throws user-friendly message on wallet rejection (code 4001)", async () => {
      const rejectionError = Object.assign(
        new Error("user rejected transaction"),
        { code: 4001 },
      );
      mockCancelScheduleFn.mockRejectedValue(rejectionError);

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(result.current.cancelSchedule(42)).rejects.toThrow(
          "Please confirm the transaction in your wallet to cancel",
        );
      });
      expect(result.current.error).toContain("Please confirm the transaction");
    });

    it("throws user-friendly message on user rejected in message string", async () => {
      mockCancelScheduleFn.mockRejectedValue(
        new Error("MetaMask: user rejected"),
      );

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(result.current.cancelSchedule(42)).rejects.toThrow(
          "Please confirm the transaction in your wallet to cancel",
        );
      });
    });

    it("re-throws non-rejection contract errors", async () => {
      mockCancelScheduleFn.mockRejectedValue(
        new Error("gas estimation failed"),
      );

      const { result } = renderHook(() => useScheduledDonation());
      await act(async () => {
        await expect(result.current.cancelSchedule(42)).rejects.toThrow(
          "gas estimation failed",
        );
      });
      expect(result.current.error).toBe("gas estimation failed");
    });
  });

  describe("with real contract address — getDonorSchedules", () => {
    const mockGetDonorSchedulesFn = jest.fn<() => Promise<bigint[]>>();
    const mockDonationSchedulesFn = jest.fn<() => Promise<object>>();

    beforeEach(() => {
      setupConnectedWallet();
      jest.mocked(getContractAddress).mockReturnValue(REAL_CONTRACT_ADDRESS);
      jest.mocked(ethers.Contract).mockImplementation(
        () =>
          ({
            getDonorSchedules: mockGetDonorSchedulesFn,
            donationSchedules: mockDonationSchedulesFn,
          }) as ReturnType<typeof ethers.Contract>,
      );
    });

    it("returns mapped schedule data for donor", async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockGetDonorSchedulesFn.mockResolvedValue([BigInt(1), BigInt(2)]);
      mockDonationSchedulesFn
        .mockResolvedValueOnce({
          charity: "0xCharity1",
          token: "0xToken1",
          totalAmount: BigInt(5e18),
          amountPerMonth: BigInt(1e18),
          monthsRemaining: BigInt(5),
          nextDistributionTimestamp: BigInt(nowSec),
          active: true,
        })
        .mockResolvedValueOnce({
          charity: "0xCharity2",
          token: "0xToken2",
          totalAmount: BigInt(10e18),
          amountPerMonth: BigInt(2e18),
          monthsRemaining: BigInt(3),
          nextDistributionTimestamp: BigInt(nowSec + 86400),
          active: false,
        });

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });

      expect(schedules).toHaveLength(2);
      expect(schedules[0]).toEqual(
        expect.objectContaining({
          id: 1,
          charity: "0xCharity1",
          active: true,
          monthsRemaining: 5,
        }),
      );
      expect(schedules[1]).toEqual(
        expect.objectContaining({
          id: 2,
          charity: "0xCharity2",
          active: false,
          monthsRemaining: 3,
        }),
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty when no schedules exist", async () => {
      mockGetDonorSchedulesFn.mockResolvedValue([]);

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });

    it("returns empty array on decode error (contract not deployed)", async () => {
      mockGetDonorSchedulesFn.mockRejectedValue(
        new Error("could not decode result data"),
      );

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("sets error on unexpected network failure", async () => {
      mockGetDonorSchedulesFn.mockRejectedValue(new Error("network timeout"));

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
      expect(result.current.error).toBe("network timeout");
    });
  });

  describe("getDonorSchedules with alternate dummy addresses", () => {
    beforeEach(() => {
      setupConnectedWallet();
    });

    it("returns empty for zero address", async () => {
      jest
        .mocked(getContractAddress)
        .mockReturnValue("0x0000000000000000000000000000000000000000");

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });

    it("returns empty for alternate dummy address", async () => {
      jest
        .mocked(getContractAddress)
        .mockReturnValue("0x3456789012345678901234567890123456789012");

      const { result } = renderHook(() => useScheduledDonation());
      let schedules: Awaited<
        ReturnType<typeof result.current.getDonorSchedules>
      > = [];
      await act(async () => {
        schedules = await result.current.getDonorSchedules();
      });
      expect(schedules).toEqual([]);
    });
  });
});
