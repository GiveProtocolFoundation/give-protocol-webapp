import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  isRestrictedVerificationStatus,
  loadOnboardingState,
} from "./charityDashboardState";

jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const fromMock = supabase.from as unknown as jest.Mock;

/** Mocks supabase.from(...).select().eq().single() to resolve with a result. */
function mockSingle(result: unknown): void {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(() => Promise.resolve(result)),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  fromMock.mockReturnValue(chain);
}

describe("isRestrictedVerificationStatus", () => {
  it.each(["pending", "rejected", "suspended"] as const)(
    "restricts %s charities",
    (status) => {
      expect(isRestrictedVerificationStatus(status)).toBe(true);
    },
  );

  it.each(["approved", "verified"] as const)(
    "allows %s charities",
    (status) => {
      expect(isRestrictedVerificationStatus(status)).toBe(false);
    },
  );

  it("does not restrict when status is unknown", () => {
    expect(isRestrictedVerificationStatus(null)).toBe(false);
    expect(isRestrictedVerificationStatus(undefined)).toBe(false);
  });
});

describe("loadOnboardingState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns saved dismissed and completed items", async () => {
    mockSingle({
      data: {
        meta: {
          onboarding_checklist: {
            dismissed: true,
            completedItems: ["upload_logo"],
          },
        },
      },
      error: null,
    });
    await expect(loadOnboardingState("p1")).resolves.toEqual({
      dismissed: true,
      completedItems: ["upload_logo"],
    });
  });

  it("returns defaults when nothing has been saved", async () => {
    mockSingle({ data: { meta: null }, error: null });
    await expect(loadOnboardingState("p1")).resolves.toEqual({
      dismissed: false,
      completedItems: [],
    });
  });

  it("returns null when the query errors", async () => {
    mockSingle({ data: null, error: { message: "boom" } });
    await expect(loadOnboardingState("p1")).resolves.toBeNull();
  });

  it("returns null when the query throws", async () => {
    fromMock.mockImplementation(() => {
      throw new Error("network");
    });
    await expect(loadOnboardingState("p1")).resolves.toBeNull();
  });
});
