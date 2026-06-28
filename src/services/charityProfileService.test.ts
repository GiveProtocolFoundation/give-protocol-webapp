import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getCharityProfileByEin,
  claimCharityProfile,
  getCharityWalletAddress,
  fetchCharityProfileAssets,
  fetchCharityProfileAssetsByEin,
  claimCharityProfileBySignerEmail,
} from "./charityProfileService";

describe("charityProfileService", () => {
  beforeEach(() => {
    (supabase.rpc as ReturnType<typeof jest.fn>).mockReset();
  });

  describe("getCharityProfileByEin", () => {
    it("should return null for empty EIN without calling RPC", async () => {
      const result = await getCharityProfileByEin("");
      expect(result).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("should return null for whitespace-only EIN without calling RPC", async () => {
      const result = await getCharityProfileByEin("   ");
      expect(result).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("should call RPC with trimmed EIN and return the profile", async () => {
      const mockProfile = {
        id: "abc-123",
        ein: "123456789",
        name: "Test Charity",
        status: "unclaimed",
        nominations_count: 0,
        interested_donors_count: 0,
      };
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: [mockProfile],
        error: null,
      });

      const result = await getCharityProfileByEin("  123456789  ");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "get_or_create_charity_profile",
        {
          lookup_ein: "123456789",
        },
      );
      expect(result).toEqual(mockProfile);
    });

    it("should return null when RPC returns empty array", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getCharityProfileByEin("999999999");
      expect(result).toBeNull();
    });

    it("should return null when RPC returns null data", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getCharityProfileByEin("123456789");
      expect(result).toBeNull();
    });

    it("should return null on RPC error", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      const result = await getCharityProfileByEin("123456789");
      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await getCharityProfileByEin("123456789");
      expect(result).toBeNull();
    });
  });

  describe("claimCharityProfile", () => {
    const claimParams = {
      ein: "123456789",
      signerName: "Jane Doe",
      signerEmail: "jane@example.com",
      signerPhone: "5551234567",
    };

    it("should call RPC with correct params and return the profile", async () => {
      const mockProfile = {
        id: "abc-123",
        ein: "123456789",
        name: "Test Charity",
        status: "claimed-pending",
        authorized_signer_name: "Jane Doe",
        authorized_signer_email: "jane@example.com",
        authorized_signer_phone: "5551234567",
      };
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: [mockProfile],
        error: null,
      });

      const result = await claimCharityProfile(claimParams);

      expect(supabase.rpc).toHaveBeenCalledWith("claim_charity_profile", {
        p_ein: "123456789",
        p_signer_name: "Jane Doe",
        p_signer_email: "jane@example.com",
        p_signer_phone: "5551234567",
      });
      expect(result).toEqual(mockProfile);
    });

    it("should return null on RPC error", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: null,
        error: { message: "Profile not found or already claimed" },
      });

      const result = await claimCharityProfile(claimParams);
      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await claimCharityProfile(claimParams);
      expect(result).toBeNull();
    });
  });

  describe("getCharityWalletAddress", () => {
    type JestFn = ReturnType<typeof jest.fn>;
    let mockFrom: JestFn;

    beforeEach(() => {
      mockFrom = supabase.from as JestFn;
      mockFrom.mockReset();
    });

    it("should return null for empty userId without calling from", async () => {
      const result = await getCharityWalletAddress("");
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("should return wallet address when found", async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { wallet_address: "0xabc123" },
        error: null,
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getCharityWalletAddress("user-1");

      expect(result).toBe("0xabc123");
      expect(mockFrom).toHaveBeenCalledWith("charity_profiles");
      expect(mockSelect).toHaveBeenCalledWith("wallet_address");
      expect(mockEq).toHaveBeenCalledWith("claimed_by", "user-1");
    });

    it("should return null when wallet_address is null", async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { wallet_address: null },
        error: null,
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      const result = await getCharityWalletAddress("user-1");
      expect(result).toBeNull();
    });

    it("should return null when no profile found", async () => {
      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      const result = await getCharityWalletAddress("user-1");
      expect(result).toBeNull();
    });

    it("should return null on Supabase error", async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      const result = await getCharityWalletAddress("user-1");
      expect(result).toBeNull();
    });

    it("should return null when from throws", async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      const result = await getCharityWalletAddress("user-1");
      expect(result).toBeNull();
    });
  });

  describe("fetchCharityProfileAssets", () => {
    type JestFn = ReturnType<typeof jest.fn>;
    let mockFrom: JestFn;

    function mockOnce(result: { data: unknown; error: unknown }) {
      const maybeSingle = jest.fn().mockResolvedValue(result);
      const eq = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValueOnce({ select });
      return { select, eq, maybeSingle };
    }

    beforeEach(() => {
      mockFrom = supabase.from as JestFn;
      mockFrom.mockReset();
    });

    it("returns null for empty userId without calling supabase", async () => {
      const result = await fetchCharityProfileAssets("");
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns mapped assets when the full select succeeds", async () => {
      const chain = mockOnce({
        data: {
          id: "cp-1",
          name: "Test Charity",
          ein: "12-3456789",
          logo_url: "https://l.test/l.png",
          banner_image_url: "https://l.test/b.png",
          claimed_by: "user-1",
        },
        error: null,
      });

      const result = await fetchCharityProfileAssets("user-1");

      expect(result).toEqual({
        id: "cp-1",
        name: "Test Charity",
        ein: "12-3456789",
        logoUrl: "https://l.test/l.png",
        bannerImageUrl: "https://l.test/b.png",
        claimedByUserId: "user-1",
      });
      expect(chain.select).toHaveBeenCalledWith(
        "id, name, ein, logo_url, banner_image_url, claimed_by",
      );
    });

    it("returns null when no row exists and there is no error", async () => {
      mockOnce({ data: null, error: null });
      const result = await fetchCharityProfileAssets("user-1");
      expect(result).toBeNull();
    });

    it("falls back to the narrower select on a 42703 undefined-column error", async () => {
      const firstChain = mockOnce({
        data: null,
        error: {
          code: "42703",
          message: "column banner_image_url does not exist",
        },
      });
      const fallbackChain = mockOnce({
        data: {
          id: "cp-1",
          name: "Test Charity",
          ein: "12-3456789",
          logo_url: "https://l.test/l.png",
          claimed_by: "user-1",
        },
        error: null,
      });

      const result = await fetchCharityProfileAssets("user-1");

      expect(result).toEqual({
        id: "cp-1",
        name: "Test Charity",
        ein: "12-3456789",
        logoUrl: "https://l.test/l.png",
        bannerImageUrl: null,
        claimedByUserId: "user-1",
      });
      expect(firstChain.select).toHaveBeenCalledWith(
        "id, name, ein, logo_url, banner_image_url, claimed_by",
      );
      expect(fallbackChain.select).toHaveBeenCalledWith(
        "id, name, ein, logo_url, claimed_by",
      );
    });

    it("falls back when the error message mentions banner_image_url without a 42703 code", async () => {
      mockOnce({
        data: null,
        error: { message: "PostgREST: banner_image_url problem" },
      });
      mockOnce({
        data: {
          ein: "12-3456789",
          logo_url: null,
          claimed_by: "user-1",
        },
        error: null,
      });

      const result = await fetchCharityProfileAssets("user-1");
      expect(result?.bannerImageUrl).toBeNull();
      expect(result?.logoUrl).toBeNull();
    });

    it("returns null when the fallback select also errors", async () => {
      mockOnce({
        data: null,
        error: { code: "42703", message: "x" },
      });
      mockOnce({
        data: null,
        error: { message: "still broken" },
      });

      const result = await fetchCharityProfileAssets("user-1");
      expect(result).toBeNull();
    });

    it("returns null when the fallback select finds no row", async () => {
      mockOnce({
        data: null,
        error: { code: "42703", message: "x" },
      });
      mockOnce({ data: null, error: null });

      const result = await fetchCharityProfileAssets("user-1");
      expect(result).toBeNull();
    });

    it("returns null when the initial error is unrelated", async () => {
      mockOnce({ data: null, error: { code: "PGRST500", message: "boom" } });
      const result = await fetchCharityProfileAssets("user-1");
      expect(result).toBeNull();
      // Should not retry on an unrelated error
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("returns null when supabase.from throws", async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error("network");
      });
      const result = await fetchCharityProfileAssets("user-1");
      expect(result).toBeNull();
    });
  });

  describe("fetchCharityProfileAssetsByEin", () => {
    type JestFn = ReturnType<typeof jest.fn>;
    let mockFrom: JestFn;

    function mockOnce(result: { data: unknown; error: unknown }) {
      const maybeSingle = jest.fn().mockResolvedValue(result);
      const eq = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValueOnce({ select });
      return { select, eq };
    }

    beforeEach(() => {
      mockFrom = supabase.from as JestFn;
      mockFrom.mockReset();
    });

    it("returns null for empty ein", async () => {
      const result = await fetchCharityProfileAssetsByEin("");
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns null for whitespace-only ein", async () => {
      const result = await fetchCharityProfileAssetsByEin("   ");
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns mapped assets when found by EIN", async () => {
      const chain = mockOnce({
        data: {
          ein: "98-7654321",
          logo_url: "https://l.test/logo.png",
          banner_image_url: null,
          claimed_by: null,
        },
        error: null,
      });

      const result = await fetchCharityProfileAssetsByEin("98-7654321");

      expect(result).toEqual({
        ein: "98-7654321",
        logoUrl: "https://l.test/logo.png",
        bannerImageUrl: null,
        claimedByUserId: null,
      });
      expect(chain.eq).toHaveBeenCalledWith("ein", "98-7654321");
    });

    it("returns null when no row found", async () => {
      mockOnce({ data: null, error: null });
      const result = await fetchCharityProfileAssetsByEin("00-0000000");
      expect(result).toBeNull();
    });

    it("returns null when supabase.from throws", async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error("network");
      });
      const result = await fetchCharityProfileAssetsByEin("12-3456789");
      expect(result).toBeNull();
    });
  });

  describe("claimCharityProfileBySignerEmail", () => {
    beforeEach(() => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockReset();
    });

    it("calls the claim_charity_profile_by_signer_email RPC with no params", async () => {
      const mockRow = {
        id: "cp-1",
        name: "My Charity",
        ein: "12-3456789",
        logo_url: "https://l.test/logo.png",
        banner_image_url: null,
        claimed_by: "user-1",
      };
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: [mockRow],
        error: null,
      });

      const result = await claimCharityProfileBySignerEmail();

      expect(supabase.rpc).toHaveBeenCalledWith(
        "claim_charity_profile_by_signer_email",
      );
      expect(result).toEqual({
        id: "cp-1",
        name: "My Charity",
        ein: "12-3456789",
        logoUrl: "https://l.test/logo.png",
        bannerImageUrl: null,
        claimedByUserId: "user-1",
      });
    });

    it("returns null when RPC returns empty array (no matching profile)", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await claimCharityProfileBySignerEmail();
      expect(result).toBeNull();
    });

    it("returns null when RPC returns null data", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await claimCharityProfileBySignerEmail();
      expect(result).toBeNull();
    });

    it("returns null on RPC error (column SELECT denied for non-owner)", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockResolvedValue({
        data: null,
        error: {
          message: "permission denied for column authorized_signer_email",
        },
      });

      const result = await claimCharityProfileBySignerEmail();
      expect(result).toBeNull();
    });

    it("returns null when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof jest.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await claimCharityProfileBySignerEmail();
      expect(result).toBeNull();
    });
  });
});
