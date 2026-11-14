import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  supabase,
  setMockResult,
  resetMockState,
} from "@/test-utils/supabaseMock";
import {
  getPrivateUserIds,
  getRankingsHidden,
  setRankingsHidden,
} from "./privacySettingsService";

jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("privacySettingsService", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("getPrivateUserIds", () => {
    it("should return user IDs where publicProfile is false", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "user-1", privacy_settings: { publicProfile: false, showDonations: true } },
          { user_id: "user-2", privacy_settings: { publicProfile: true, showDonations: true } },
        ],
        error: null,
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.has("user-1")).toBe(true);
      expect(privateIds.has("user-2")).toBe(false);
    });

    it("should return user IDs where specific field is false", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "user-1", privacy_settings: { publicProfile: true, showDonations: false } },
          { user_id: "user-2", privacy_settings: { publicProfile: true, showDonations: true } },
          { user_id: "user-3", privacy_settings: { publicProfile: true, showVolunteerHours: false } },
        ],
        error: null,
      });

      const privateDonorIds = await getPrivateUserIds("showDonations");

      expect(privateDonorIds.has("user-1")).toBe(true);
      expect(privateDonorIds.has("user-2")).toBe(false);
      expect(privateDonorIds.has("user-3")).toBe(false);
    });

    it("should return user IDs for showVolunteerHours field", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "user-1", privacy_settings: { publicProfile: true, showVolunteerHours: false } },
          { user_id: "user-2", privacy_settings: { publicProfile: true, showVolunteerHours: true } },
        ],
        error: null,
      });

      const privateIds = await getPrivateUserIds("showVolunteerHours");

      expect(privateIds.has("user-1")).toBe(true);
      expect(privateIds.has("user-2")).toBe(false);
    });

    it("should treat users with both publicProfile=false and field=false as private", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "user-1", privacy_settings: { publicProfile: false, showDonations: false } },
        ],
        error: null,
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.has("user-1")).toBe(true);
    });

    it("should not exclude users with null privacy_settings", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "user-1", privacy_settings: null },
        ],
        error: null,
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.size).toBe(0);
    });

    it("should return empty set when no data", async () => {
      setMockResult("user_preferences", {
        data: [],
        error: null,
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.size).toBe(0);
    });

    it("should return empty set on database error", async () => {
      setMockResult("user_preferences", {
        data: null,
        error: { message: "Database error" },
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.size).toBe(0);
    });

    it("should return empty set on null data", async () => {
      setMockResult("user_preferences", {
        data: null,
        error: null,
      });

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.size).toBe(0);
    });

    it("should return empty set when supabase throws", async () => {
      const originalFrom = supabase.from;
      supabase.from = jest.fn(() => {
        throw new Error("Connection lost");
      }) as typeof supabase.from;

      const privateIds = await getPrivateUserIds("showDonations");

      expect(privateIds.size).toBe(0);

      supabase.from = originalFrom;
    });

    it("should handle mixed privacy settings correctly", async () => {
      setMockResult("user_preferences", {
        data: [
          { user_id: "public-user", privacy_settings: { publicProfile: true, showDonations: true, showVolunteerHours: true } },
          { user_id: "private-profile", privacy_settings: { publicProfile: false, showDonations: true, showVolunteerHours: true } },
          { user_id: "hidden-donations", privacy_settings: { publicProfile: true, showDonations: false, showVolunteerHours: true } },
          { user_id: "hidden-hours", privacy_settings: { publicProfile: true, showDonations: true, showVolunteerHours: false } },
          { user_id: "no-settings", privacy_settings: null },
        ],
        error: null,
      });

      const donorPrivateIds = await getPrivateUserIds("showDonations");

      expect(donorPrivateIds.has("public-user")).toBe(false);
      expect(donorPrivateIds.has("private-profile")).toBe(true);
      expect(donorPrivateIds.has("hidden-donations")).toBe(true);
      expect(donorPrivateIds.has("hidden-hours")).toBe(false);
      expect(donorPrivateIds.has("no-settings")).toBe(false);
    });
  });

  describe("getRankingsHidden", () => {
    it("returns true when donations and volunteer hours are both hidden", async () => {
      setMockResult("user_preferences", {
        data: {
          privacy_settings: { showDonations: false, showVolunteerHours: false },
        },
        error: null,
      });

      await expect(getRankingsHidden("auth-user-1")).resolves.toBe(true);
    });

    it("returns false when only one field is hidden", async () => {
      setMockResult("user_preferences", {
        data: { privacy_settings: { showDonations: false } },
        error: null,
      });

      await expect(getRankingsHidden("auth-user-1")).resolves.toBe(false);
    });

    it("returns false when the user has no preferences row", async () => {
      setMockResult("user_preferences", { data: null, error: null });

      await expect(getRankingsHidden("auth-user-1")).resolves.toBe(false);
    });

    it("throws when the read fails", async () => {
      setMockResult("user_preferences", {
        data: null,
        error: { message: "boom" },
      });

      await expect(getRankingsHidden("auth-user-1")).rejects.toThrow(
        "Failed to load privacy settings",
      );
    });
  });

  describe("setRankingsHidden", () => {
    /**
     * Returns the most recent upsert call on user_preferences.
     * @returns The upsert argument list
     */
    const lastUpsert = (): unknown[] => {
      const fromMock = supabase.from as unknown as {
        mock: { results: { value: { upsert: { mock: { calls: unknown[][] } } } }[] };
      };
      const calls = fromMock.mock.results.flatMap(
        (result) => result.value.upsert.mock.calls,
      );
      return calls[calls.length - 1];
    };

    it("hides both fields and keeps other saved settings", async () => {
      setMockResult("user_preferences", {
        data: { privacy_settings: { showSkillEndorsements: false } },
        error: null,
      });

      await setRankingsHidden("auth-user-1", true);

      expect(lastUpsert()).toEqual([
        {
          user_id: "auth-user-1",
          privacy_settings: {
            showSkillEndorsements: false,
            showDonations: false,
            showVolunteerHours: false,
          },
        },
        { onConflict: "user_id" },
      ]);
    });

    it("shows both fields when unhiding with no existing row", async () => {
      setMockResult("user_preferences", { data: null, error: null });

      await setRankingsHidden("auth-user-1", false);

      expect(lastUpsert()).toEqual([
        {
          user_id: "auth-user-1",
          privacy_settings: { showDonations: true, showVolunteerHours: true },
        },
        { onConflict: "user_id" },
      ]);
    });

    it("throws when the save fails", async () => {
      setMockResult("user_preferences", {
        data: null,
        error: { message: "denied" },
      });

      await expect(setRankingsHidden("auth-user-1", true)).rejects.toThrow(
        "Failed to save privacy settings",
      );
    });
  });
});
