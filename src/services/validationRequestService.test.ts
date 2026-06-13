import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { setMockResult, resetMockState } from "@/test-utils/supabaseMock";
import {
  ValidationStatus,
  RejectionReason,
  ActivityType,
} from "@/types/selfReportedHours";
import {
  getOrganizationValidationQueue,
  getValidationQueueCount,
  processValidationResponse,
  batchApproveRequests,
  batchRejectRequests,
  cancelValidationRequest,
  resubmitValidationRequest,
  getValidationHistory,
} from "./validationRequestService";

// Mock the volunteer utility
jest.mock("@/utils/volunteer", () => ({
  generateVerificationHash: jest.fn(() => "0xmockhash123"),
}));

describe("validationRequestService", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("getOrganizationValidationQueue", () => {
    it("should return validation queue items", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const mockData = [
        {
          id: "request-1",
          self_reported_hours_id: "hours-1",
          organization_id: "org-1",
          volunteer_id: "vol-1",
          status: "pending",
          expires_at: expiresAt.toISOString(),
          is_resubmission: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          self_reported_hours: {
            id: "hours-1",
            volunteer_id: "vol-1",
            activity_date: "2024-01-15",
            hours: 4,
            activity_type: ActivityType.DIRECT_SERVICE,
            description: "Test description",
            organization_id: "org-1",
            validation_status: ValidationStatus.PENDING,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          volunteer: {
            user_id: "vol-1",
            display_name: "Test User",
          },
        },
      ];
      setMockResult("validation_requests", { data: mockData, error: null });

      const result = await getOrganizationValidationQueue("org-1");

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe("request-1");
      expect(result[0].volunteerName).toBe("Test User");
      // GIV-406: Art. 5(1)(c) — email must not be exposed on the queue item.
      expect(result[0]).not.toHaveProperty("volunteerEmail");
      expect(result[0].isResubmission).toBe(false);
    });

    it("should handle anonymous volunteers", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const mockData = [
        {
          id: "request-1",
          self_reported_hours_id: "hours-1",
          organization_id: "org-1",
          volunteer_id: "vol-1",
          status: "pending",
          expires_at: expiresAt.toISOString(),
          is_resubmission: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          self_reported_hours: {
            id: "hours-1",
            volunteer_id: "vol-1",
            activity_date: "2024-01-15",
            hours: 4,
            activity_type: ActivityType.DIRECT_SERVICE,
            description: "Test description",
            validation_status: ValidationStatus.PENDING,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          volunteer: null,
        },
      ];
      setMockResult("validation_requests", { data: mockData, error: null });

      const result = await getOrganizationValidationQueue("org-1");

      expect(result[0].volunteerName).toBe("Anonymous Volunteer");
      // GIV-406: queue item carries no email at all.
      expect(result[0]).not.toHaveProperty("volunteerEmail");
    });

    it("should throw on database error", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "DB Error" },
      });

      await expect(getOrganizationValidationQueue("org-1")).rejects.toThrow(
        "Failed to fetch validation queue",
      );
    });

    it("should return empty array when no data", async () => {
      setMockResult("validation_requests", { data: null, error: null });

      const result = await getOrganizationValidationQueue("org-1");
      expect(result).toEqual([]);
    });
  });

  describe("getValidationQueueCount", () => {
    it("should return count of pending requests", async () => {
      setMockResult("validation_requests", { count: 5, error: null });

      const result = await getValidationQueueCount("org-1");

      expect(result).toBe(5);
    });

    it("should return 0 on error", async () => {
      setMockResult("validation_requests", {
        count: null,
        error: { message: "DB Error" },
      });

      const result = await getValidationQueueCount("org-1");

      expect(result).toBe(0);
    });

    it("should return 0 when count is null", async () => {
      setMockResult("validation_requests", { count: null, error: null });

      const result = await getValidationQueueCount("org-1");

      expect(result).toBe(0);
    });
  });

  describe("processValidationResponse", () => {
    it("should approve a validation request", async () => {
      const mockRequest = {
        self_reported_hours_id: "hours-1",
        status: "pending",
        organization_id: "org-1",
      };
      const mockHours = {
        volunteer_id: "vol-1",
        hours: 4,
        activity_date: "2024-01-15",
        activity_type: ActivityType.DIRECT_SERVICE,
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });
      setMockResult("self_reported_hours", { data: mockHours, error: null });

      await expect(
        processValidationResponse(
          { requestId: "request-1", approved: true },
          "responder-1",
        ),
      ).resolves.not.toThrow();
    });

    it("should reject a validation request", async () => {
      const mockRequest = {
        self_reported_hours_id: "hours-1",
        status: "pending",
        organization_id: "org-1",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });
      setMockResult("self_reported_hours", { data: null, error: null });

      await expect(
        processValidationResponse(
          {
            requestId: "request-1",
            approved: false,
            rejectionReason: RejectionReason.HOURS_INACCURATE,
            rejectionNotes: "Hours do not match our records",
          },
          "responder-1",
        ),
      ).resolves.not.toThrow();
    });

    it("should throw when request not found", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        processValidationResponse(
          { requestId: "nonexistent", approved: true },
          "responder-1",
        ),
      ).rejects.toThrow("Validation request not found");
    });

    it("should throw when request already processed", async () => {
      const mockRequest = {
        self_reported_hours_id: "hours-1",
        status: "approved",
        organization_id: "org-1",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });

      await expect(
        processValidationResponse(
          { requestId: "request-1", approved: true },
          "responder-1",
        ),
      ).rejects.toThrow("This request has already been processed");
    });
  });

  describe("batchApproveRequests", () => {
    it("should approve multiple requests", async () => {
      const mockRequest = {
        self_reported_hours_id: "hours-1",
        status: "pending",
        organization_id: "org-1",
      };
      const mockHours = {
        volunteer_id: "vol-1",
        hours: 4,
        activity_date: "2024-01-15",
        activity_type: ActivityType.DIRECT_SERVICE,
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });
      setMockResult("self_reported_hours", { data: mockHours, error: null });

      const result = await batchApproveRequests(
        ["request-1", "request-2"],
        "responder-1",
      );

      expect(result.success).toContain("request-1");
      expect(result.success).toContain("request-2");
      expect(result.failed).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "Not found" },
      });

      const result = await batchApproveRequests(
        ["request-1", "request-2"],
        "responder-1",
      );

      expect(result.failed).toContain("request-1");
      expect(result.failed).toContain("request-2");
    });
  });

  describe("batchRejectRequests", () => {
    it("should reject multiple requests", async () => {
      const mockRequest = {
        self_reported_hours_id: "hours-1",
        status: "pending",
        organization_id: "org-1",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });
      setMockResult("self_reported_hours", { data: null, error: null });

      const result = await batchRejectRequests(
        ["request-1", "request-2"],
        "responder-1",
        RejectionReason.HOURS_INACCURATE,
        "Hours do not match",
      );

      expect(result.success).toContain("request-1");
      expect(result.success).toContain("request-2");
    });

    it("should handle failures gracefully", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "Error" },
      });

      const result = await batchRejectRequests(
        ["request-1"],
        "responder-1",
        RejectionReason.OTHER,
      );

      expect(result.failed).toContain("request-1");
      expect(result.success).toHaveLength(0);
    });
  });

  describe("cancelValidationRequest", () => {
    it("should cancel a pending request", async () => {
      const mockRequest = {
        volunteer_id: "vol-1",
        self_reported_hours_id: "hours-1",
        status: "pending",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });
      setMockResult("self_reported_hours", { data: null, error: null });

      await expect(
        cancelValidationRequest("request-1", "vol-1"),
      ).resolves.not.toThrow();
    });

    it("should throw when request not found", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        cancelValidationRequest("nonexistent", "vol-1"),
      ).rejects.toThrow("Request not found");
    });

    it("should throw when access denied", async () => {
      const mockRequest = {
        volunteer_id: "other-vol",
        self_reported_hours_id: "hours-1",
        status: "pending",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });

      await expect(
        cancelValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Access denied");
    });

    it("should throw when request not pending", async () => {
      const mockRequest = {
        volunteer_id: "vol-1",
        self_reported_hours_id: "hours-1",
        status: "approved",
      };

      setMockResult("validation_requests", { data: mockRequest, error: null });

      await expect(
        cancelValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Can only cancel pending requests");
    });
  });

  describe("resubmitValidationRequest", () => {
    it("should throw when original request not found", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        resubmitValidationRequest("nonexistent", "vol-1"),
      ).rejects.toThrow("Original request not found");
    });

    it("should throw when access denied", async () => {
      const mockOriginal = {
        volunteer_id: "other-vol",
        self_reported_hours_id: "hours-1",
        organization_id: "org-1",
        status: "rejected",
      };

      setMockResult("validation_requests", { data: mockOriginal, error: null });

      await expect(
        resubmitValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Access denied");
    });

    it("should throw when request not rejected", async () => {
      const mockOriginal = {
        volunteer_id: "vol-1",
        self_reported_hours_id: "hours-1",
        organization_id: "org-1",
        status: "approved",
      };

      setMockResult("validation_requests", { data: mockOriginal, error: null });

      await expect(
        resubmitValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Can only resubmit rejected requests");
    });

    it("should throw when validation window expired", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 100);
      const mockOriginal = {
        volunteer_id: "vol-1",
        self_reported_hours_id: "hours-1",
        organization_id: "org-1",
        status: "rejected",
        self_reported_hours: {
          activity_date: expiredDate.toISOString().split("T")[0],
        },
      };

      setMockResult("validation_requests", { data: mockOriginal, error: null });

      await expect(
        resubmitValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Validation window has expired");
    });

    it("should throw when hours record not found", async () => {
      const mockOriginal = {
        volunteer_id: "vol-1",
        self_reported_hours_id: "hours-1",
        organization_id: "org-1",
        status: "rejected",
        self_reported_hours: null,
      };

      setMockResult("validation_requests", { data: mockOriginal, error: null });

      await expect(
        resubmitValidationRequest("request-1", "vol-1"),
      ).rejects.toThrow("Hours record not found");
    });
  });

  describe("getValidationHistory", () => {
    it("should return validation history for hours record", async () => {
      const now = new Date();
      const mockData = [
        {
          id: "request-1",
          self_reported_hours_id: "hours-1",
          organization_id: "org-1",
          volunteer_id: "vol-1",
          status: "rejected",
          expires_at: now.toISOString(),
          is_resubmission: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          id: "request-2",
          self_reported_hours_id: "hours-1",
          organization_id: "org-1",
          volunteer_id: "vol-1",
          status: "approved",
          expires_at: now.toISOString(),
          is_resubmission: true,
          original_request_id: "request-1",
          responded_at: now.toISOString(),
          responded_by: "responder-1",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ];

      setMockResult("validation_requests", { data: mockData, error: null });

      const result = await getValidationHistory("hours-1", "vol-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("request-1");
      expect(result[1].id).toBe("request-2");
      expect(result[1].isResubmission).toBe(true);
    });

    it("should throw on database error", async () => {
      setMockResult("validation_requests", {
        data: null,
        error: { message: "DB Error" },
      });

      await expect(getValidationHistory("hours-1", "vol-1")).rejects.toThrow(
        "Failed to fetch history",
      );
    });

    it("should return empty array when no history", async () => {
      setMockResult("validation_requests", { data: [], error: null });

      const result = await getValidationHistory("hours-1", "vol-1");

      expect(result).toEqual([]);
    });
  });
});
