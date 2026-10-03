import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { CONFIGURED_NETWORK_COUNT, usePlatformStats } from "./usePlatformStats";

const mockRpc = supabase.rpc as unknown as jest.Mock;

describe("usePlatformStats", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("counts configured mainnet networks (EVM chains + Solana)", () => {
    expect(CONFIGURED_NETWORK_COUNT).toBe(7);
  });

  it("returns real counts from the RPC", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          verified_organizations: 12,
          charitable_sectors: "4",
          verified_volunteer_hours: "1234.50",
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePlatformStats());
    expect(result.current.stats).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRpc).toHaveBeenCalledWith("get_public_platform_stats");
    expect(result.current.stats).toEqual({
      networks: CONFIGURED_NETWORK_COUNT,
      verifiedOrganizations: 12,
      charitableSectors: 4,
      verifiedVolunteerHours: 1234.5,
    });
    expect(result.current.error).toBeNull();
  });

  it("treats null or invalid values as zero", async () => {
    mockRpc.mockResolvedValue({
      data: {
        verified_organizations: null,
        charitable_sectors: "abc",
        verified_volunteer_hours: -5,
      },
      error: null,
    });

    const { result } = renderHook(() => usePlatformStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toEqual({
      networks: CONFIGURED_NETWORK_COUNT,
      verifiedOrganizations: 0,
      charitableSectors: 0,
      verifiedVolunteerHours: 0,
    });
  });

  it("leaves stats null (no invented numbers) when the RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { result } = renderHook(() => usePlatformStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe("Failed to load platform stats");
  });

  it("leaves stats null when the RPC returns no row", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => usePlatformStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
