import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import {
  useVolunteerOpportunities,
  useVolunteerOpportunity,
  DEFAULT_OPPORTUNITY_IMAGE,
} from "./useVolunteerOpportunities";

// supabase is mocked globally via moduleNameMapper — setMockResult controls per-table responses.

const makeRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  charity_id: `charity-${id}`,
  title: `Opportunity ${id}`,
  description: `Description ${id}`,
  skills: ["React"],
  commitment: "5 hours/week",
  location: "Remote",
  type: "remote",
  work_language: "english",
  image_url: `https://example.com/${id}.jpg`,
  ...overrides,
});

describe("useVolunteerOpportunities", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    const { result } = renderHook(() => useVolunteerOpportunities());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("maps rows and joins the charity name and profile path", async () => {
    setMockResult("volunteer_opportunities", {
      data: [makeRow("1")],
      error: null,
    });
    setMockResult("charity_profiles", {
      data: [{ id: "charity-1", ein: "99-1230001", name: "Charity One" }],
      error: null,
    });

    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.opportunities).toHaveLength(1);
    expect(result.current.opportunities[0]).toMatchObject({
      id: "1",
      charityId: "charity-1",
      organization: "Charity One",
      charityPath: "/charity/99-1230001",
      imageUrl: "https://example.com/1.jpg",
      type: "remote",
      workLanguage: "english",
    });
  });

  it("resolves charities posting under a profiles.id via claimed_by", async () => {
    setMockResult("volunteer_opportunities", {
      data: [makeRow("1")],
      error: null,
    });
    setMockResult("profiles", {
      data: [{ id: "charity-1", user_id: "user-1", name: "Profile Name" }],
      error: null,
    });
    // Same table answers both lookups: no direct id match, claimed_by match.
    setMockResult("charity_profiles", {
      data: [
        {
          id: "cp-1",
          ein: "99-1230002",
          name: "Claimed Charity",
          claimed_by: "user-1",
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.opportunities[0].organization).toBe(
      "Claimed Charity",
    );
    expect(result.current.opportunities[0].charityPath).toBe(
      "/charity/99-1230002",
    );
  });

  it("falls back to defaults for missing image, skills and unknown enums", async () => {
    setMockResult("volunteer_opportunities", {
      data: [
        makeRow("1", {
          image_url: null,
          skills: null,
          type: "weird",
          work_language: "klingon",
        }),
      ],
      error: null,
    });

    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const [item] = result.current.opportunities;
    expect(item.imageUrl).toBe(DEFAULT_OPPORTUNITY_IMAGE);
    expect(item.skills).toEqual([]);
    expect(item.type).toBe("remote");
    expect(item.workLanguage).toBe("english");
    expect(item.organization).toBe("");
    expect(item.charityPath).toBeUndefined();
  });

  it("returns an empty list when there are no opportunities", async () => {
    setMockResult("volunteer_opportunities", { data: [], error: null });
    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.opportunities).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("sets an error when the query fails", async () => {
    setMockResult("volunteer_opportunities", {
      data: null,
      error: { message: "boom" },
    });
    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load volunteer opportunities");
    expect(result.current.opportunities).toEqual([]);
  });
});

describe("detail fields", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("maps the structured detail columns", async () => {
    setMockResult("volunteer_opportunities", {
      data: [
        makeRow("1", {
          requirements: "A\nB",
          benefits: "C",
          schedule: "Tuesdays",
          start_date: "2026-11-01",
          end_date: null,
          application_deadline: "2026-10-25",
          volunteers_needed: 3,
          minimum_age: 18,
          background_check_required: true,
          training_provided: true,
        }),
      ],
      error: null,
    });

    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.opportunities[0]).toMatchObject({
      requirements: "A\nB",
      benefits: "C",
      schedule: "Tuesdays",
      startDate: "2026-11-01",
      endDate: null,
      applicationDeadline: "2026-10-25",
      volunteersNeeded: 3,
      minimumAge: 18,
      backgroundCheckRequired: true,
      trainingProvided: true,
    });
  });

  it("defaults the detail columns when they are absent", async () => {
    setMockResult("volunteer_opportunities", {
      data: [makeRow("1")],
      error: null,
    });
    const { result } = renderHook(() => useVolunteerOpportunities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.opportunities[0]).toMatchObject({
      requirements: null,
      schedule: null,
      startDate: null,
      volunteersNeeded: null,
      backgroundCheckRequired: false,
      trainingProvided: false,
    });
  });
});

describe("useVolunteerOpportunity", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("loads one opportunity with its charity", async () => {
    setMockResult("volunteer_opportunities", {
      data: makeRow("1"),
      error: null,
    });
    setMockResult("charity_profiles", {
      data: [{ id: "charity-1", ein: "99-1230001", name: "Charity One" }],
      error: null,
    });

    const { result } = renderHook(() => useVolunteerOpportunity("1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.opportunity?.id).toBe("1");
    expect(result.current.opportunity?.organization).toBe("Charity One");
  });

  it("returns null when the opportunity does not exist", async () => {
    setMockResult("volunteer_opportunities", { data: null, error: null });
    const { result } = renderHook(() => useVolunteerOpportunity("missing"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.opportunity).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets an error when the query fails", async () => {
    setMockResult("volunteer_opportunities", {
      data: null,
      error: { message: "boom" },
    });
    const { result } = renderHook(() => useVolunteerOpportunity("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load volunteer opportunity");
  });

  it("does not load when there is no id", () => {
    const { result } = renderHook(() => useVolunteerOpportunity(undefined));
    expect(result.current.loading).toBe(false);
    expect(result.current.opportunity).toBeNull();
  });
});
