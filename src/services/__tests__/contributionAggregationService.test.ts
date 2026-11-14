import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  supabase,
  setMockResult,
  resetMockState,
} from "@/test-utils/supabaseMock";
import {
  getUserContributionStats,
  getUnifiedContributions,
  getVolunteerLeaderboard,
  getDonorLeaderboard,
  getGlobalContributionStats,
} from "../contributionAggregationService";

interface MockBuilder {
  gte: { mock: { calls: unknown[][] } };
}

/**
 * Returns the gte() calls made on every query builder created for a table.
 * @param table - Supabase table name
 * @returns Flattened list of gte call argument arrays
 */
const gteCallsFor = (table: string): unknown[][] => {
  const fromMock = supabase.from as unknown as {
    mock: { calls: unknown[][]; results: { value: MockBuilder }[] };
  };
  return fromMock.mock.calls.flatMap((call, index) =>
    call[0] === table ? fromMock.mock.results[index].value.gte.mock.calls : [],
  );
};

describe("contributionAggregationService", () => {
  beforeEach(() => {
    resetMockState();
    (supabase.from as unknown as { mockClear: () => void }).mockClear();
  });

  describe("getUserContributionStats", () => {
    it("should return aggregated stats for a user with donations and volunteer hours", async () => {
      setMockResult("donations", {
        data: [{ amount: 100 }, { amount: 250 }, { amount: 50 }],
        error: null,
      });
      setMockResult("volunteer_hours", {
        data: [
          { hours: 5, charity_id: "charity-1" },
          { hours: 3, charity_id: "charity-2" },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: [
          {
            hours: 4,
            validation_status: "validated",
            organization_id: "org-1",
            organization_name: null,
          },
          {
            hours: 2,
            validation_status: "pending",
            organization_id: null,
            organization_name: "Local Shelter",
          },
          {
            hours: 1,
            validation_status: "unvalidated",
            organization_id: null,
            organization_name: null,
          },
        ],
        error: null,
      });
      setMockResult("skill_endorsements", {
        data: [{ id: "1" }, { id: "2" }, { id: "3" }],
        error: null,
      });

      const result = await getUserContributionStats("user-123");

      expect(result.userId).toBe("user-123");
      expect(result.totalDonated).toBe(400);
      expect(result.donationCount).toBe(3);
      expect(result.formalVolunteerHours).toBe(8);
      expect(result.selfReportedHours.validated).toBe(4);
      expect(result.selfReportedHours.pending).toBe(2);
      expect(result.selfReportedHours.unvalidated).toBe(1);
      expect(result.selfReportedHours.total).toBe(7);
      expect(result.totalVolunteerHours).toBe(12); // 8 formal + 4 validated
      expect(result.skillsEndorsed).toBe(3);
      expect(result.organizationsHelped).toBe(4); // 2 charities + 1 org + 1 named org
    });

    it("should include fiat donations in stats", async () => {
      setMockResult("donations", {
        data: [{ amount: 100 }],
        error: null,
      });
      setMockResult("fiat_donations", {
        data: [
          { amount_cents: 5000 },
          { amount_cents: 2500 },
        ],
        error: null,
      });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });
      setMockResult("skill_endorsements", { data: [], error: null });

      const result = await getUserContributionStats("user-123");

      expect(result.totalDonated).toBe(100);
      expect(result.donationCount).toBe(1);
      expect(result.totalFiatDonated).toBe(75); // (5000 + 2500) / 100
      expect(result.fiatDonationCount).toBe(2);
    });

    it("should handle fiat donations database error gracefully", async () => {
      setMockResult("donations", { data: [{ amount: 100 }], error: null });
      setMockResult("fiat_donations", {
        data: null,
        error: { message: "Database error" },
      });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });
      setMockResult("skill_endorsements", { data: [], error: null });

      const result = await getUserContributionStats("user-123");

      expect(result.totalDonated).toBe(100);
      expect(result.totalFiatDonated).toBe(0);
      expect(result.fiatDonationCount).toBe(0);
    });

    it("should return zeros when user has no contributions", async () => {
      setMockResult("donations", { data: [], error: null });
      setMockResult("fiat_donations", { data: [], error: null });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });
      setMockResult("skill_endorsements", { data: [], error: null });

      const result = await getUserContributionStats("user-empty");

      expect(result.totalDonated).toBe(0);
      expect(result.donationCount).toBe(0);
      expect(result.totalFiatDonated).toBe(0);
      expect(result.fiatDonationCount).toBe(0);
      expect(result.formalVolunteerHours).toBe(0);
      expect(result.selfReportedHours.total).toBe(0);
      expect(result.skillsEndorsed).toBe(0);
      expect(result.organizationsHelped).toBe(0);
    });

    it("should handle null amounts and hours gracefully", async () => {
      setMockResult("donations", {
        data: [{ amount: 100 }, { amount: null }, { amount: 50 }],
        error: null,
      });
      setMockResult("volunteer_hours", {
        data: [
          { hours: null, charity_id: "charity-1" },
          { hours: 5, charity_id: "charity-1" },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", { data: [], error: null });
      setMockResult("skill_endorsements", { data: [], error: null });

      const result = await getUserContributionStats("user-123");

      expect(result.totalDonated).toBe(150);
      expect(result.formalVolunteerHours).toBe(5);
    });

    it("should handle database errors gracefully", async () => {
      setMockResult("donations", {
        data: null,
        error: { message: "Database error" },
      });
      setMockResult("volunteer_hours", {
        data: null,
        error: { message: "Database error" },
      });
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "Database error" },
      });
      setMockResult("skill_endorsements", {
        data: null,
        error: { message: "Database error" },
      });

      const result = await getUserContributionStats("user-123");

      expect(result.totalDonated).toBe(0);
      expect(result.formalVolunteerHours).toBe(0);
      expect(result.selfReportedHours.total).toBe(0);
    });
  });

  describe("getUnifiedContributions", () => {
    it("should return all contribution types when no filter specified", async () => {
      setMockResult("donations", {
        data: [
          {
            id: "donation-1",
            amount: 100,
            created_at: "2024-01-15",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: { charity_details: { name: "Test Charity" } },
          },
        ],
        error: null,
      });
      setMockResult("fiat_donations", { data: [], error: null });
      setMockResult("volunteer_hours", {
        data: [
          {
            id: "vh-1",
            hours: 5,
            date_performed: "2024-01-14",
            description: "Test work",
            status: "approved",
            created_at: "2024-01-14",
            volunteer_id: "user-1",
            charity_id: "charity-1",
          },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: [
          {
            id: "srh-1",
            hours: 3,
            activity_date: "2024-01-13",
            activity_type: "cleanup",
            description: "Beach cleanup",
            validation_status: "validated",
            created_at: "2024-01-13",
            volunteer_id: "user-1",
            organization_id: "org-1",
            organization_name: "Beach Org",
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({ userId: "user-1" });

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe("donation");
      expect(result[0].amount).toBe(100);
      expect(result[1].type).toBe("formal_volunteer");
      expect(result[1].hours).toBe(5);
      expect(result[2].type).toBe("self_reported");
      expect(result[2].hours).toBe(3);
    });

    it("should include fiat donations when no filter specified", async () => {
      setMockResult("donations", { data: [], error: null });
      setMockResult("fiat_donations", {
        data: [
          {
            id: "fiat-1",
            amount_cents: 5000,
            currency: "USD",
            payment_method: "card",
            transaction_id: "txn-123",
            card_last_four: "4242",
            donor_name: "Test Donor",
            disbursement_status: "received",
            status: "completed",
            created_at: "2024-01-16",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: { charity_details: { name: "Test Charity" } },
          },
        ],
        error: null,
      });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getUnifiedContributions({ userId: "user-1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("fiat_donation");
      expect(result[0].amount).toBe(50); // 5000 / 100
      expect(result[0].isFiatDonation).toBe(true);
      expect(result[0].paymentMethod).toBe("card");
      expect(result[0].disbursementStatus).toBe("received");
      expect(result[0].organizationName).toBe("Test Charity");
    });

    it("should filter to only fiat_donation source", async () => {
      setMockResult("fiat_donations", {
        data: [
          {
            id: "fiat-1",
            amount_cents: 2500,
            currency: "USD",
            payment_method: "card",
            transaction_id: "",
            card_last_four: "",
            donor_name: "",
            disbursement_status: "received",
            status: "completed",
            created_at: "2024-01-16",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: null,
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["fiat_donation"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("fiat_donation");
      expect(result[0].organizationName).toBe("Unknown Charity");
    });

    it("should handle fiat donations database error in unified contributions", async () => {
      setMockResult("donations", { data: [], error: null });
      setMockResult("fiat_donations", {
        data: null,
        error: { message: "Error" },
      });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getUnifiedContributions({ userId: "user-1" });

      expect(result).toHaveLength(0);
    });

    it("should filter by source type", async () => {
      setMockResult("donations", {
        data: [
          {
            id: "donation-1",
            amount: 100,
            created_at: "2024-01-15",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: null,
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["donation"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("donation");
    });

    it("should sort contributions by date descending", async () => {
      setMockResult("donations", {
        data: [
          {
            id: "donation-1",
            amount: 100,
            created_at: "2024-01-10",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: null,
          },
          {
            id: "donation-2",
            amount: 200,
            created_at: "2024-01-20",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: null,
          },
        ],
        error: null,
      });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getUnifiedContributions({ userId: "user-1" });

      expect(result[0].date).toBe("2024-01-20");
      expect(result[1].date).toBe("2024-01-10");
    });

    it("should handle database errors in individual fetch functions", async () => {
      setMockResult("donations", { data: null, error: { message: "Error" } });
      setMockResult("volunteer_hours", { data: null, error: { message: "Error" } });
      setMockResult("self_reported_hours", { data: null, error: { message: "Error" } });

      const result = await getUnifiedContributions({ userId: "user-1" });

      expect(result).toHaveLength(0);
    });

    it("should handle donations with null charity data", async () => {
      setMockResult("donations", {
        data: [
          {
            id: "donation-1",
            amount: 100,
            created_at: "2024-01-15",
            donor_id: "user-1",
            charity_id: "charity-1",
            charity: null,
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["donation"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].organizationName).toBe("Unknown Charity");
    });

    it("should handle self-reported hours with null organization", async () => {
      setMockResult("self_reported_hours", {
        data: [
          {
            id: "srh-1",
            hours: 3,
            activity_date: "2024-01-13",
            activity_type: "cleanup",
            description: "Beach cleanup",
            validation_status: null,
            created_at: "2024-01-13",
            volunteer_id: "user-1",
            organization_id: null,
            organization_name: null,
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["self_reported"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].organizationName).toBe("Unknown Organization");
      expect(result[0].status).toBe("unvalidated");
    });

    it("should handle formal volunteer hours with pending status", async () => {
      setMockResult("volunteer_hours", {
        data: [
          {
            id: "vh-1",
            hours: 5,
            date_performed: "2024-01-14",
            description: "Test work",
            status: "pending",
            created_at: "2024-01-14",
            volunteer_id: "user-1",
            charity_id: "charity-1",
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["formal_volunteer"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });

    it("should map validation status to correct contribution status", async () => {
      setMockResult("donations", { data: [], error: null });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", {
        data: [
          {
            id: "srh-1",
            hours: 3,
            activity_date: "2024-01-13",
            activity_type: "cleanup",
            description: "Beach cleanup",
            validation_status: "validated",
            created_at: "2024-01-13",
            volunteer_id: "user-1",
            organization_id: null,
            organization_name: "Org",
          },
          {
            id: "srh-2",
            hours: 2,
            activity_date: "2024-01-12",
            activity_type: "other",
            description: "Other work",
            validation_status: "pending",
            created_at: "2024-01-12",
            volunteer_id: "user-1",
            organization_id: null,
            organization_name: "Org",
          },
          {
            id: "srh-3",
            hours: 1,
            activity_date: "2024-01-11",
            activity_type: "other",
            description: "More work",
            validation_status: "unvalidated",
            created_at: "2024-01-11",
            volunteer_id: "user-1",
            organization_id: null,
            organization_name: "Org",
          },
        ],
        error: null,
      });

      const result = await getUnifiedContributions({
        userId: "user-1",
        sources: ["self_reported"],
      });

      expect(result[0].status).toBe("validated");
      expect(result[1].status).toBe("pending");
      expect(result[2].status).toBe("unvalidated");
    });
  });

  describe("getVolunteerLeaderboard", () => {
    it("should aggregate hours by user and rank by total", async () => {
      setMockResult("volunteer_hours", {
        data: [
          { volunteer_id: "user-1", hours: 10 },
          { volunteer_id: "user-1", hours: 5 },
          { volunteer_id: "user-2", hours: 20 },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: [
          { volunteer_id: "user-1", hours: 3, validation_status: "validated" },
          { volunteer_id: "user-3", hours: 8, validation_status: "validated" },
        ],
        error: null,
      });

      const result = await getVolunteerLeaderboard(10, false);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe("user-2");
      expect(result[0].totalHours).toBe(20);
      expect(result[0].rank).toBe(1);
      expect(result[1].userId).toBe("user-1");
      expect(result[1].totalHours).toBe(18); // 15 formal + 3 self-reported
      expect(result[1].rank).toBe(2);
      expect(result[2].userId).toBe("user-3");
      expect(result[2].rank).toBe(3);
    });

    it("should include unvalidated hours when includeUnvalidated is true", async () => {
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", {
        data: [
          { volunteer_id: "user-1", hours: 5, validation_status: "validated" },
          { volunteer_id: "user-1", hours: 3, validation_status: "unvalidated" },
        ],
        error: null,
      });

      const result = await getVolunteerLeaderboard(10, true);

      expect(result).toHaveLength(1);
      expect(result[0].selfReportedHours).toBe(8);
    });

    it("should respect limit parameter", async () => {
      setMockResult("volunteer_hours", {
        data: [
          { volunteer_id: "user-1", hours: 10 },
          { volunteer_id: "user-2", hours: 20 },
          { volunteer_id: "user-3", hours: 15 },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getVolunteerLeaderboard(2, false);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe("user-2");
      expect(result[1].userId).toBe("user-3");
    });

    it("should return empty array when no data", async () => {
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getVolunteerLeaderboard();

      expect(result).toHaveLength(0);
    });

    it("should handle null hours in data", async () => {
      setMockResult("volunteer_hours", {
        data: [
          { volunteer_id: "user-1", hours: null },
          { volunteer_id: "user-1", hours: 5 },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: [
          { volunteer_id: "user-1", hours: null, validation_status: "validated" },
        ],
        error: null,
      });

      const result = await getVolunteerLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].formalHours).toBe(5);
      expect(result[0].selfReportedHours).toBe(0);
    });

    it("should handle database errors for formal hours", async () => {
      setMockResult("volunteer_hours", {
        data: null,
        error: { message: "Database error" },
      });
      setMockResult("self_reported_hours", {
        data: [{ volunteer_id: "user-1", hours: 5, validation_status: "validated" }],
        error: null,
      });

      const result = await getVolunteerLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].selfReportedHours).toBe(5);
    });

    it("should handle database errors for self-reported hours", async () => {
      setMockResult("volunteer_hours", {
        data: [{ volunteer_id: "user-1", hours: 10 }],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "Database error" },
      });

      const result = await getVolunteerLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].formalHours).toBe(10);
    });
  });

  describe("leaderboard time range", () => {
    it("filters volunteer hours by date when since is given", async () => {
      await getVolunteerLeaderboard(10, false, "2026-11-01T00:00:00.000Z");

      expect(gteCallsFor("volunteer_hours")).toContainEqual([
        "date_performed",
        "2026-11-01",
      ]);
      expect(gteCallsFor("self_reported_hours")).toContainEqual([
        "activity_date",
        "2026-11-01",
      ]);
    });

    it("does not filter volunteer hours by date without since", async () => {
      await getVolunteerLeaderboard(10, false);

      expect(gteCallsFor("volunteer_hours")).toHaveLength(0);
      expect(gteCallsFor("self_reported_hours")).toHaveLength(0);
    });

    it("filters crypto and fiat donations by created_at when since is given", async () => {
      await getDonorLeaderboard(10, "2026-11-01");

      expect(gteCallsFor("donations")).toContainEqual([
        "created_at",
        "2026-11-01",
      ]);
      expect(gteCallsFor("fiat_donations")).toContainEqual([
        "created_at",
        "2026-11-01",
      ]);
    });

    it("does not filter donations by date without since", async () => {
      await getDonorLeaderboard(10);

      expect(gteCallsFor("donations")).toHaveLength(0);
      expect(gteCallsFor("fiat_donations")).toHaveLength(0);
    });
  });

  describe("getDonorLeaderboard", () => {
    it("should aggregate donations by user and rank by total", async () => {
      setMockResult("donations", {
        data: [
          { donor_id: "user-1", amount: 100, charity_id: "charity-1" },
          { donor_id: "user-1", amount: 50, charity_id: "charity-2" },
          { donor_id: "user-2", amount: 500, charity_id: "charity-1" },
          { donor_id: "user-3", amount: 200, charity_id: "charity-1" },
        ],
        error: null,
      });

      const result = await getDonorLeaderboard(10);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe("user-2");
      expect(result[0].totalDonated).toBe(500);
      expect(result[0].donationCount).toBe(1);
      expect(result[0].organizationsSupported).toBe(1);
      expect(result[0].rank).toBe(1);

      expect(result[1].userId).toBe("user-3");
      expect(result[1].totalDonated).toBe(200);
      expect(result[1].rank).toBe(2);

      expect(result[2].userId).toBe("user-1");
      expect(result[2].totalDonated).toBe(150);
      expect(result[2].donationCount).toBe(2);
      expect(result[2].organizationsSupported).toBe(2);
      expect(result[2].rank).toBe(3);
    });

    it("should return empty array on database error", async () => {
      setMockResult("donations", {
        data: null,
        error: { message: "Database error" },
      });

      const result = await getDonorLeaderboard();

      expect(result).toHaveLength(0);
    });

    it("should handle null amounts", async () => {
      setMockResult("donations", {
        data: [
          { donor_id: "user-1", amount: 100, charity_id: "charity-1" },
          { donor_id: "user-1", amount: null, charity_id: "charity-1" },
        ],
        error: null,
      });

      const result = await getDonorLeaderboard();

      expect(result[0].totalDonated).toBe(100);
      expect(result[0].donationCount).toBe(2);
    });

    it("should handle null charity_id in donations", async () => {
      setMockResult("donations", {
        data: [
          { donor_id: "user-1", amount: 100, charity_id: null },
        ],
        error: null,
      });

      const result = await getDonorLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].organizationsSupported).toBe(0);
    });

    it("should respect limit parameter", async () => {
      setMockResult("donations", {
        data: [
          { donor_id: "user-1", amount: 100, charity_id: "charity-1" },
          { donor_id: "user-2", amount: 200, charity_id: "charity-1" },
          { donor_id: "user-3", amount: 300, charity_id: "charity-1" },
        ],
        error: null,
      });

      const result = await getDonorLeaderboard(2);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe("user-3");
      expect(result[1].userId).toBe("user-2");
    });
  });

  describe("getGlobalContributionStats", () => {
    it("should return aggregated global statistics", async () => {
      setMockResult("donations", {
        data: [
          { amount: 100, donor_id: "donor-1" },
          { amount: 200, donor_id: "donor-2" },
          { amount: 150, donor_id: "donor-1" },
        ],
        error: null,
      });
      setMockResult("volunteer_hours", {
        data: [
          { hours: 10, volunteer_id: "vol-1" },
          { hours: 5, volunteer_id: "vol-2" },
        ],
        error: null,
      });
      setMockResult("self_reported_hours", {
        data: [
          { hours: 3, validation_status: "validated", volunteer_id: "vol-1" },
          { hours: 2, validation_status: "pending", volunteer_id: "vol-3" },
          { hours: 1, validation_status: "unvalidated", volunteer_id: "vol-1" },
        ],
        error: null,
      });

      const result = await getGlobalContributionStats();

      expect(result.totalDonations).toBe(3);
      expect(result.totalDonationAmount).toBe(450);
      expect(result.totalDonors).toBe(2);
      expect(result.totalFormalVolunteerHours).toBe(15);
      expect(result.totalSelfReportedHours.validated).toBe(3);
      expect(result.totalSelfReportedHours.pending).toBe(2);
      expect(result.totalSelfReportedHours.total).toBe(6);
      expect(result.totalVolunteerHours).toBe(18); // 15 formal + 3 validated
      expect(result.totalVolunteers).toBe(3); // vol-1, vol-2, vol-3
    });

    it("should return zeros when no data exists", async () => {
      setMockResult("donations", { data: [], error: null });
      setMockResult("volunteer_hours", { data: [], error: null });
      setMockResult("self_reported_hours", { data: [], error: null });

      const result = await getGlobalContributionStats();

      expect(result.totalDonations).toBe(0);
      expect(result.totalDonationAmount).toBe(0);
      expect(result.totalFormalVolunteerHours).toBe(0);
      expect(result.totalVolunteerHours).toBe(0);
      expect(result.totalVolunteers).toBe(0);
      expect(result.totalDonors).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      setMockResult("donations", { data: null, error: { message: "Error" } });
      setMockResult("volunteer_hours", {
        data: null,
        error: { message: "Error" },
      });
      setMockResult("self_reported_hours", {
        data: null,
        error: { message: "Error" },
      });

      const result = await getGlobalContributionStats();

      expect(result.totalDonationAmount).toBe(0);
      expect(result.totalFormalVolunteerHours).toBe(0);
    });
  });
});
