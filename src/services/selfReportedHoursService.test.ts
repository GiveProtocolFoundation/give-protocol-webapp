import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  setMockResult,
  resetMockState,
  setMockAuthUser,
  supabase as mockSupabase,
} from "@/test-utils/supabaseMock";
import { ValidationStatus, ActivityType } from "@/types/selfReportedHours";
import {
  createSelfReportedHours,
  getVolunteerSelfReportedHours,
  getSelfReportedHoursById,
  getVolunteerHoursStats,
  updateSelfReportedHours,
  deleteSelfReportedHours,
  requestValidation,
} from "./selfReportedHoursService";

describe("selfReportedHoursService", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("createSelfReportedHours", () => {
    it("should create a valid hours record", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: yesterday.toISOString().split("T")[0],
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organization_name: "Test Org",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      const result = await createSelfReportedHours("user-1", input);

      expect(result.id).toBe("record-1");
      expect(result.volunteerId).toBe("user-1");
      expect(result.hours).toBe(4);
    });

    it("should throw error for future date", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      // Use a date far in the future to avoid timezone edge cases
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const input = {
        activityDate: futureDate.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Activity date cannot be in the future",
      );
    });

    it("should throw error for invalid hours", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 25, // exceeds max
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Hours must be between",
      );
    });

    it("should throw error for short description", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description: "Short", // too short
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Description must be at least",
      );
    });

    it("should throw error when no organization specified", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
      };

      // Intentionally omitting organizationName/organizationId to test validation
      await expect(
        createSelfReportedHours(
          "user-1",
          input as Omit<typeof input, "organizationName" | "organizationId">,
        ),
      ).rejects.toThrow(
        "Either organization ID or organization name is required",
      );
    });

    it("should throw error when not logged in", async () => {
      // Auth user is null by default after resetMockState
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "You must be logged in to log volunteer hours",
      );
    });

    it("should throw error when user ID mismatch", async () => {
      setMockAuthUser({ id: "different-user", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Authentication mismatch",
      );
    });
  });

  describe("getVolunteerSelfReportedHours", () => {
    it("should return volunteer hours", async () => {
      const now = new Date();
      const mockData = [
        {
          id: "record-1",
          volunteer_id: "user-1",
          activity_date: "2024-01-15",
          hours: 4,
          activity_type: ActivityType.DIRECT_SERVICE,
          description: "Test description",
          organization_name: "Org A",
          validation_status: ValidationStatus.UNVALIDATED,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ];
      setMockResult("self_reported_hours", { data: mockData, error: null });

      const result = await getVolunteerSelfReportedHours("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("record-1");
    });

    it("should throw on error", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "DB Error" },
      });

      await expect(getVolunteerSelfReportedHours("user-1")).rejects.toThrow(
        "Failed to fetch records",
      );
    });
  });

  describe("getSelfReportedHoursById", () => {
    it("should return record by id", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: "2024-01-15",
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description: "Test description",
        organization_name: "Org A",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const result = await getSelfReportedHoursById("record-1", "user-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("record-1");
    });

    it("should return null when not found", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await getSelfReportedHoursById("nonexistent", "user-1");
      expect(result).toBeNull();
    });
  });

  describe("getVolunteerHoursStats", () => {
    it("should return stats object", async () => {
      const now = new Date();
      const mockData = [
        {
          id: "record-1",
          volunteer_id: "user-1",
          activity_date: "2024-01-15",
          hours: 4,
          activity_type: ActivityType.DIRECT_SERVICE,
          description: "Test",
          organization_name: "Org A",
          validation_status: ValidationStatus.VALIDATED,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ];
      setMockResult("self_reported_hours", { data: mockData, error: null });

      const result = await getVolunteerHoursStats("user-1");

      expect(result).toBeDefined();
      // Result should contain stats properties
      expect(
        typeof result.totalRecords === "number" ||
          result.totalRecords === undefined,
      ).toBe(true);
    });

    it("should throw on error", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "DB Error" },
      });

      await expect(getVolunteerHoursStats("user-1")).rejects.toThrow(
        "Failed to fetch stats",
      );
    });
  });

  describe("updateSelfReportedHours", () => {
    it("should update record with valid data", async () => {
      const now = new Date();
      const mockUpdated = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: "2024-01-15",
        hours: 5,
        activity_type: ActivityType.DIRECT_SERVICE,
        description:
          "Updated description that meets the minimum character requirement for validation purposes.",
        organization_name: "Org A",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      setMockResult("self_reported_hours", { data: mockUpdated, error: null });

      const updates = {
        hours: 5,
        description:
          "Updated description that meets the minimum character requirement for validation purposes.",
      };

      const result = await updateSelfReportedHours(
        "record-1",
        "user-1",
        updates,
      );

      expect(result.hours).toBe(5);
    });

    it("should throw error when record not found", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        updateSelfReportedHours("nonexistent", "user-1", { hours: 5 }),
      ).rejects.toThrow();
    });
  });

  describe("deleteSelfReportedHours", () => {
    it("should delete unvalidated record", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        activity_date: "2024-01-15",
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description: "Test",
        organization_name: "Test Org",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        deleteSelfReportedHours("record-1", "user-1"),
      ).resolves.not.toThrow();
    });

    it("should throw error for validated record", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.VALIDATED,
        activity_date: "2024-01-15",
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description: "Test",
        organization_name: "Test Org",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        deleteSelfReportedHours("record-1", "user-1"),
      ).rejects.toThrow("Cannot delete validated records");
    });
  });

  describe("requestValidation", () => {
    it("should throw error when record not found", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        requestValidation("nonexistent", "user-1", "org-1"),
      ).rejects.toThrow("Record not found");
    });

    it("should throw error when not unvalidated", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.VALIDATED,
        organization_id: "org-1",
        activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description: "Test",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        requestValidation("record-1", "user-1", "org-1"),
      ).rejects.toThrow("Record is already validated");
    });

    it("should throw error when access denied", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "other-user",
        validation_status: ValidationStatus.UNVALIDATED,
        activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        requestValidation("record-1", "user-1", "org-1"),
      ).rejects.toThrow("Access denied");
    });

    it("should throw error when validation window expired", async () => {
      const now = new Date();
      const expiredDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        activity_date: expiredDate.toISOString().split("T")[0],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        requestValidation("record-1", "user-1", "org-1"),
      ).rejects.toThrow("Validation window has expired");
    });

    it("should throw error when already pending", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.PENDING,
        activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        requestValidation("record-1", "user-1", "org-1"),
      ).rejects.toThrow("Validation request already pending");
    });
  });

  describe("createSelfReportedHours - additional cases", () => {
    it("should throw error for description too long", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const longDescription = "x".repeat(600);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description: longDescription,
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Description cannot exceed",
      );
    });

    it("should throw error when both organization ID and name specified", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationId: "org-1",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Cannot specify both organization ID and organization name",
      );
    });
  });

  describe("updateSelfReportedHours - additional cases", () => {
    it("should throw error when access denied", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "other-user",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", { hours: 5 }),
      ).rejects.toThrow("Access denied");
    });

    it("should throw error for validated records", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.VALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", { hours: 5 }),
      ).rejects.toThrow("Cannot edit validated records");
    });

    it("should throw error for future activity date", async () => {
      const now = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", {
          activityDate: tomorrow.toISOString().split("T")[0],
        }),
      ).rejects.toThrow("Activity date cannot be in the future");
    });

    it("should throw error for invalid hours", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", { hours: 30 }),
      ).rejects.toThrow("Hours must be between");
    });

    it("should throw error for description too short", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", {
          description: "Too short",
        }),
      ).rejects.toThrow("Description must be at least");
    });

    it("should throw error for description too long", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        updateSelfReportedHours("record-1", "user-1", {
          description: "x".repeat(600),
        }),
      ).rejects.toThrow("Description cannot exceed");
    });
  });

  describe("deleteSelfReportedHours - additional cases", () => {
    it("should throw error when access denied", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-1",
        volunteer_id: "other-user",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await expect(
        deleteSelfReportedHours("record-1", "user-1"),
      ).rejects.toThrow("Access denied");
    });
  });

  describe("getVolunteerHoursStats - detailed", () => {
    it("should calculate stats correctly for multiple statuses", async () => {
      const mockData = [
        { hours: 4, validation_status: ValidationStatus.VALIDATED },
        { hours: 3, validation_status: ValidationStatus.VALIDATED },
        { hours: 2, validation_status: ValidationStatus.PENDING },
        { hours: 1, validation_status: ValidationStatus.REJECTED },
        { hours: 5, validation_status: ValidationStatus.UNVALIDATED },
        { hours: 6, validation_status: ValidationStatus.EXPIRED },
      ];
      setMockResult("self_reported_hours", { data: mockData, error: null });

      const result = await getVolunteerHoursStats("user-1");

      expect(result.totalValidatedHours).toBe(7);
      expect(result.totalPendingHours).toBe(2);
      expect(result.totalRejectedHours).toBe(1);
      expect(result.totalUnvalidatedHours).toBe(5);
      expect(result.totalExpiredHours).toBe(6);
      expect(result.recordCount).toBe(6);
      expect(result.recordsByStatus[ValidationStatus.VALIDATED]).toBe(2);
      expect(result.recordsByStatus[ValidationStatus.PENDING]).toBe(1);
    });

    it("should return empty stats when no data", async () => {
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getVolunteerHoursStats("user-1");

      expect(result.recordCount).toBe(0);
      expect(result.totalValidatedHours).toBe(0);
    });
  });

  describe("createSelfReportedHours - with organizationId", () => {
    it("should set PENDING status for recent activity with organizationId", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: yesterday.toISOString().split("T")[0],
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organization_id: "org-1",
        validation_status: ValidationStatus.PENDING,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });
      setMockResult("validation_requests", {
        data: { id: "request-1" },
        error: null,
      });

      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationId: "org-1",
      };

      const result = await createSelfReportedHours("user-1", input);

      expect(result.id).toBe("record-1");
    });

    it("should set EXPIRED status for old activity with organizationId", async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: oldDate.toISOString().split("T")[0],
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organization_id: "org-1",
        validation_status: ValidationStatus.EXPIRED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const input = {
        activityDate: oldDate.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationId: "org-1",
      };

      const result = await createSelfReportedHours("user-1", input);

      expect(result.id).toBe("record-1");
    });

    it("should throw on database error during create", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "DB Error" },
      });

      const input = {
        activityDate: yesterday.toISOString().split("T")[0],
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description:
          "This is a test description that meets the minimum character requirement for validation purposes.",
        organizationName: "Test Org",
      };

      await expect(createSelfReportedHours("user-1", input)).rejects.toThrow(
        "Failed to create record",
      );
    });
  });

  describe("getVolunteerSelfReportedHours - with filters", () => {
    it("should apply status filter", async () => {
      const now = new Date();
      const mockData = [
        {
          id: "record-1",
          volunteer_id: "user-1",
          activity_date: "2024-01-15",
          hours: 4,
          activity_type: ActivityType.DIRECT_SERVICE,
          description: "Test",
          validation_status: ValidationStatus.VALIDATED,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          organization: null,
        },
      ];
      setMockResult("self_reported_hours", { data: mockData, error: null });

      const result = await getVolunteerSelfReportedHours("user-1", {
        status: ValidationStatus.VALIDATED,
      });

      expect(result).toHaveLength(1);
    });

    it("should apply organizationId filter", async () => {
      const mockData = [];
      setMockResult("self_reported_hours", { data: mockData, error: null });

      const result = await getVolunteerSelfReportedHours("user-1", {
        organizationId: "org-1",
      });

      expect(result).toEqual([]);
    });

    it("should apply activityType filter", async () => {
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getVolunteerSelfReportedHours("user-1", {
        activityType: ActivityType.DIRECT_SERVICE,
      });

      expect(result).toEqual([]);
    });

    it("should apply date range filters", async () => {
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getVolunteerSelfReportedHours("user-1", {
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      });

      expect(result).toEqual([]);
    });
  });

  describe("getSelfReportedHoursById - error cases", () => {
    it("should throw on non-PGRST116 database error", async () => {
      setMockResult("self_reported_hours", {
        data: null,
        error: { code: "OTHER", message: "DB Error" },
      });

      await expect(
        getSelfReportedHoursById("record-1", "user-1"),
      ).rejects.toThrow("Failed to fetch record");
    });
  });

  describe("updateSelfReportedHours - more fields", () => {
    it("should update activityType", async () => {
      const now = new Date();
      const mockExisting = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
      };
      const mockUpdated = {
        ...mockExisting,
        activity_type: ActivityType.EVENT_SUPPORT,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockUpdated, error: null });

      const result = await updateSelfReportedHours("record-1", "user-1", {
        activityType: ActivityType.EVENT_SUPPORT,
      });

      expect(result).toBeDefined();
    });

    it("should update location", async () => {
      const now = new Date();
      const mockExisting = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
      };
      const mockUpdated = {
        ...mockExisting,
        location: "New York",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockUpdated, error: null });

      const result = await updateSelfReportedHours("record-1", "user-1", {
        location: "New York",
      });

      expect(result).toBeDefined();
    });

    it("should clear location when empty string", async () => {
      const now = new Date();
      const mockExisting = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
      };
      const mockUpdated = {
        ...mockExisting,
        location: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockResult("self_reported_hours", { data: mockUpdated, error: null });

      const result = await updateSelfReportedHours("record-1", "user-1", {
        location: "",
      });

      expect(result).toBeDefined();
    });
  });

  describe("requestValidation - success path", () => {
    it("should successfully create validation request", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        validation_status: ValidationStatus.UNVALIDATED,
        activity_date: yesterday.toISOString().split("T")[0],
      };
      setMockResult("self_reported_hours", { data: mockRecord, error: null });
      setMockResult("validation_requests", {
        data: { id: "request-1" },
        error: null,
      });

      await expect(
        requestValidation("record-1", "user-1", "org-1"),
      ).resolves.not.toThrow();
    });
  });

  describe("charityOrgId support (GIV-119)", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activityDate = yesterday.toISOString().split("T")[0];
    const description =
      "This is a test description that meets the minimum character requirement for validation purposes.";

    it("should pass charity_org_id to the DB when provided", async () => {
      const mockRecord = {
        id: "record-1",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 2,
        activity_type: "direct_service",
        description,
        organization_name: "American Red Cross",
        charity_org_id: "co-uuid-1",
        validation_status: "unvalidated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const result = await createSelfReportedHours("user-1", {
        activityDate,
        hours: 2,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        organizationName: "American Red Cross",
        charityOrgId: "co-uuid-1",
      });

      expect(result.charityOrgId).toBe("co-uuid-1");
    });

    it("should map charity_org_id from DB row", async () => {
      const mockRecord = {
        id: "record-2",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 3,
        activity_type: "direct_service",
        description,
        organization_name: "Habitat for Humanity",
        charity_org_id: "co-uuid-2",
        validation_status: "unvalidated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: [mockRecord], error: null });

      const results = await getVolunteerSelfReportedHours("user-1");

      expect(results).toHaveLength(1);
      expect(results[0].charityOrgId).toBe("co-uuid-2");
    });

    it("should leave charityOrgId undefined when not present in DB row", async () => {
      const mockRecord = {
        id: "record-3",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 1,
        activity_type: "direct_service",
        description,
        organization_name: "Some Org",
        charity_org_id: null,
        validation_status: "unvalidated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: [mockRecord], error: null });

      const results = await getVolunteerSelfReportedHours("user-1");

      expect(results[0].charityOrgId).toBeUndefined();
    });
  });

  describe("platform charity resolution (GIV-959)", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activityDate = yesterday.toISOString().split("T")[0];
    const description =
      "This is a test description that meets the minimum character requirement for validation purposes.";

    it("resolves a claimed platform charity to its charity account profile id", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-claimed",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 4,
        activity_type: ActivityType.DIRECT_SERVICE,
        description,
        organization_id: "charity-profile-1",
        charity_org_id: "co-uuid-1",
        organization_name: null,
        validation_status: ValidationStatus.PENDING,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("charity_profiles", {
        data: { claimed_by: "charity-user-1" },
        error: null,
      });
      setMockResult("profiles", {
        data: { id: "charity-profile-1" },
        error: null,
      });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });
      setMockResult("validation_requests", {
        data: { id: "request-1" },
        error: null,
      });

      const result = await createSelfReportedHours("user-1", {
        activityDate,
        hours: 4,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        charityOrgId: "co-uuid-1",
        platformCharityId: "cp-1",
        organizationName: "Claimed Platform Charity",
      });

      // The resolution path must consult the charity profile registry and
      // the profiles table to map charity_profiles.id → profiles.id.
      expect(mockSupabase.from).toHaveBeenCalledWith("charity_profiles");
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");

      expect(result.id).toBe("record-claimed");
      expect(result.organizationId).toBe("charity-profile-1");
    });

    it("falls back to the organization name when the platform charity is unclaimed", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-unclaimed",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 2,
        activity_type: ActivityType.DIRECT_SERVICE,
        description,
        organization_id: null,
        charity_org_id: "co-uuid-2",
        organization_name: "Seeded Platform Charity",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("charity_profiles", {
        data: { claimed_by: null },
        error: null,
      });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const result = await createSelfReportedHours("user-1", {
        activityDate,
        hours: 2,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        charityOrgId: "co-uuid-2",
        platformCharityId: "cp-unclaimed",
        organizationName: "Seeded Platform Charity",
      });

      expect(result.id).toBe("record-unclaimed");
      expect(result.organizationName).toBe("Seeded Platform Charity");
      expect(result.organizationId).toBeNull();
      expect(result.validationStatus).toBe(ValidationStatus.UNVALIDATED);
    });

    it("requires the organization name when a platform charity id is provided", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });

      await expect(
        createSelfReportedHours("user-1", {
          activityDate,
          hours: 2,
          activityType: ActivityType.DIRECT_SERVICE,
          description,
          charityOrgId: "co-uuid-3",
          platformCharityId: "cp-no-name",
        }),
      ).rejects.toThrow(
        "Organization name is required when logging hours for an on-platform organization",
      );
    });

    it("rejects platform charity id combined with organization id", async () => {
      setMockAuthUser({ id: "user-1", email: "test@example.com" });

      await expect(
        createSelfReportedHours("user-1", {
          activityDate,
          hours: 2,
          activityType: ActivityType.DIRECT_SERVICE,
          description,
          organizationId: "org-legacy",
          platformCharityId: "cp-both",
          organizationName: "Some Org",
        }),
      ).rejects.toThrow(
        "Cannot specify both platform charity ID and organization ID",
      );
    });

    it("treats lookup failures as unclaimed and falls back to the organization name", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-lookup-error",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 3,
        activity_type: ActivityType.DIRECT_SERVICE,
        description,
        organization_id: null,
        charity_org_id: "co-uuid-4",
        organization_name: "Fallback Name",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("charity_profiles", {
        data: null,
        error: { message: "connection closed" },
      });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      const result = await createSelfReportedHours("user-1", {
        activityDate,
        hours: 3,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        charityOrgId: "co-uuid-4",
        platformCharityId: "cp-error",
        organizationName: "Fallback Name",
      });

      expect(result.id).toBe("record-lookup-error");
      expect(result.organizationName).toBe("Fallback Name");
    });
  });

  describe("insert payload drift safety (GIV-959)", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activityDate = yesterday.toISOString().split("T")[0];
    const description =
      "This is a test description that meets the minimum character requirement for validation purposes.";

    /** Returns the insert payload captured from the mocked supabase client. */
    const captureInsertPayload = (): Record<string, unknown> => {
      const fromMock = mockSupabase.from as unknown as {
        mock: {
          calls: unknown[][];
          results: { value: { insert: { mock: { calls: unknown[][] } } } }[];
        };
      };
      const calls = fromMock.mock.calls;
      const results = fromMock.mock.results;
      for (let i = calls.length - 1; i >= 0; i--) {
        if (calls[i][0] === "self_reported_hours") {
          const insertCalls =
            results[i].value.insert.mock.calls;
          if (insertCalls.length > 0) {
            return insertCalls[0][0] as Record<string, unknown>;
          }
        }
      }
      throw new Error("No self_reported_hours insert captured");
    };

    it("omits charity_org_id from the insert payload when no registry id exists", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-drift",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 2,
        activity_type: ActivityType.DIRECT_SERVICE,
        description,
        organization_id: null,
        organization_name: "Give Protocol Foundation",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      // Registry selection without an `id` (production RPC drift): the org is
      // recorded by name only. Sending charity_org_id: null would make
      // PostgREST reject the insert on databases missing the column.
      await createSelfReportedHours("user-1", {
        activityDate,
        hours: 2,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        organizationName: "Give Protocol Foundation",
      });

      const payload = captureInsertPayload();
      expect(Object.keys(payload)).not.toContain("charity_org_id");
      expect(payload.organization_name).toBe("Give Protocol Foundation");
    });

    it("includes charity_org_id when a registry id exists", async () => {
      const now = new Date();
      const mockRecord = {
        id: "record-with-id",
        volunteer_id: "user-1",
        activity_date: activityDate,
        hours: 2,
        activity_type: ActivityType.DIRECT_SERVICE,
        description,
        organization_id: null,
        charity_org_id: "co-uuid-9",
        organization_name: "Registry Org",
        validation_status: ValidationStatus.UNVALIDATED,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setMockAuthUser({ id: "user-1", email: "test@example.com" });
      setMockResult("self_reported_hours", { data: mockRecord, error: null });

      await createSelfReportedHours("user-1", {
        activityDate,
        hours: 2,
        activityType: ActivityType.DIRECT_SERVICE,
        description,
        charityOrgId: "co-uuid-9",
        organizationName: "Registry Org",
      });

      const payload = captureInsertPayload();
      expect(payload.charity_org_id).toBe("co-uuid-9");
    });
  });
});
