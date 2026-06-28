import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { setMockResult, resetMockState } from "@/test-utils/supabaseMock";
import {
  getCharityRecordByEin,
  submitRemovalRequest,
  submitCharityRequest,
  hasUserRequestedCharity,
} from "./charityDataService";

jest.mock("@/utils/logger", () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe("charityDataService", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("getCharityRecordByEin", () => {
    const mockRecord = {
      ein: "123456789",
      name: "Test Org",
      ico: null,
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip: "90210",
      group_exemption: null,
      subsection: "03",
      affiliation: "3",
      classification: "1",
      ruling: "199201",
      deductibility: "1",
      foundation: "15",
      activity: "000000000",
      organization: "1",
      status: "01",
      ntee_cd: "B20",
      sort_name: "TEST ORG",
      is_on_platform: false,
    };

    it("should return the charity record on success", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [mockRecord],
        error: null,
      });

      const result = await getCharityRecordByEin("123456789");

      expect(result).toEqual(mockRecord);
      expect(supabase.rpc).toHaveBeenCalledWith("get_charity_record_by_ein", {
        lookup_ein: "123456789",
      });
    });

    it("should pass hyphenated EIN to RPC for server-side normalization", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [mockRecord],
        error: null,
      });

      const result = await getCharityRecordByEin("12-3456789");

      expect(result).toEqual(mockRecord);
      expect(supabase.rpc).toHaveBeenCalledWith("get_charity_record_by_ein", {
        lookup_ein: "12-3456789",
      });
    });

    it("should return null for empty EIN", async () => {
      const result = await getCharityRecordByEin("");

      expect(result).toBeNull();
    });

    it("should return null when RPC returns empty array", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getCharityRecordByEin("000000000");

      expect(result).toBeNull();
    });

    it("should return null when supabase returns an error", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });

      const result = await getCharityRecordByEin("000000000");

      expect(result).toBeNull();
    });

    it("should return null when an Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      const result = await getCharityRecordByEin("123456789");

      expect(result).toBeNull();
    });

    it("should return null when a non-Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      (supabase.rpc as jest.Mock).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await getCharityRecordByEin("123456789");

      expect(result).toBeNull();
    });
  });

  describe("submitRemovalRequest", () => {
    it("should return true on successful insertion", async () => {
      setMockResult("removal_requests", { data: null, error: null });

      const result = await submitRemovalRequest("123456789", "Duplicate entry");

      expect(result).toBe(true);
    });

    it("should strip hyphens from EIN", async () => {
      setMockResult("removal_requests", { data: null, error: null });

      const result = await submitRemovalRequest("12-3456789", "Test reason");

      expect(result).toBe(true);
    });

    it("should return false when supabase returns an error", async () => {
      setMockResult("removal_requests", {
        data: null,
        error: { message: "Insert failed", code: "42501" },
      });

      const result = await submitRemovalRequest("123456789", "Reason");

      expect(result).toBe(false);
    });

    it("should return false when an Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw new Error("Connection refused");
      });

      const result = await submitRemovalRequest("123456789", "Reason");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });

    it("should return false when a non-Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw 42;
      });

      const result = await submitRemovalRequest("123456789", "Reason");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });
  });

  describe("submitCharityRequest", () => {
    it("should return true on successful insertion", async () => {
      setMockResult("charity_requests", { data: null, error: null });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should strip hyphens from EIN", async () => {
      setMockResult("charity_requests", { data: null, error: null });

      const result = await submitCharityRequest("12-3456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should return false when supabase returns an error", async () => {
      setMockResult("charity_requests", {
        data: null,
        error: { message: "Duplicate", code: "23505" },
      });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(false);
    });

    it("should return false when an Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw new Error("Connection refused");
      });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });

    it("should return false when a non-Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw 42;
      });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });

    it("should return true without inserting when duplicate request exists", async () => {
      setMockResult("charity_requests", {
        data: [{ id: "existing-req-id" }],
        error: null,
      });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should return true without inserting for hyphenated duplicate EIN", async () => {
      setMockResult("charity_requests", {
        data: [{ id: "existing-req-id" }],
        error: null,
      });

      const result = await submitCharityRequest("12-3456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should return true when contactEmail is provided", async () => {
      setMockResult("charity_requests", { data: null, error: null });

      const result = await submitCharityRequest(
        "123456789",
        "user-uuid-1",
        "contact@org.org",
      );

      expect(result).toBe(true);
    });

    it("should return true when contactEmail is omitted (backward compatibility)", async () => {
      setMockResult("charity_requests", { data: null, error: null });

      const result = await submitCharityRequest("123456789", "user-uuid-1");

      expect(result).toBe(true);
    });
  });

  describe("hasUserRequestedCharity", () => {
    it("should return true when a matching request exists", async () => {
      setMockResult("charity_requests", {
        data: [{ id: "req-uuid-1" }],
        error: null,
      });

      const result = await hasUserRequestedCharity("123456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should return false when no matching request exists", async () => {
      setMockResult("charity_requests", { data: [], error: null });

      const result = await hasUserRequestedCharity("123456789", "user-uuid-1");

      expect(result).toBe(false);
    });

    it("should strip hyphens from EIN", async () => {
      setMockResult("charity_requests", {
        data: [{ id: "req-uuid-1" }],
        error: null,
      });

      const result = await hasUserRequestedCharity("12-3456789", "user-uuid-1");

      expect(result).toBe(true);
    });

    it("should return false when supabase returns an error", async () => {
      setMockResult("charity_requests", {
        data: null,
        error: { message: "Permission denied", code: "42501" },
      });

      const result = await hasUserRequestedCharity("123456789", "user-uuid-1");

      expect(result).toBe(false);
    });

    it("should return false when an Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw new Error("Network error");
      });

      const result = await hasUserRequestedCharity("123456789", "user-uuid-1");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });

    it("should return false when a non-Error exception is thrown", async () => {
      const { supabase } = await import("@/lib/supabase");
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw "string error";
      });

      const result = await hasUserRequestedCharity("123456789", "user-uuid-1");

      expect(result).toBe(false);

      supabase.from = originalFrom;
    });
  });
});
