import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { supabase, setMockResult, resetMockState } from "@/lib/supabase";
import { ImpactProfileTab } from "../ImpactProfileTab";

const mockFrom = jest.mocked(supabase).from;

describe("ImpactProfileTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    setMockResult("charity_details", {
      data: {
        mission_statement: "Test mission",
        impact_stats: [],
        impact_highlights: [],
      },
      error: null,
    });
  });

  it("renders impact profile form after loading", async () => {
    render(<ImpactProfileTab profileId="profile-123" />);
    const saveBtn = await screen.findByRole("button", {
      name: /save changes/i,
    });
    expect(saveBtn).toBeInTheDocument();
  });

  it("calls upsert (not update) with profile_id on save", async () => {
    render(<ImpactProfileTab profileId="profile-123" />);

    // Wait for form to appear after initial data fetch
    const saveBtn = await screen.findByRole("button", {
      name: /save changes/i,
    });
    const preCallCount = mockFrom.mock.calls.length;

    // Click the submit button (triggers form onSubmit)
    fireEvent.click(saveBtn);

    // Wait for the save from() call to be made
    await waitFor(() => {
      expect(mockFrom.mock.calls.length).toBeGreaterThan(preCallCount);
    });

    const saveBuilder = mockFrom.mock.results[preCallCount]?.value;
    expect(saveBuilder.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ profile_id: "profile-123" })],
      { onConflict: "profile_id" },
    );
    expect(saveBuilder.update).not.toHaveBeenCalled();
  });

  it("includes all impact fields in the upsert payload", async () => {
    render(<ImpactProfileTab profileId="profile-456" />);

    const saveBtn = await screen.findByRole("button", {
      name: /save changes/i,
    });
    const preCallCount = mockFrom.mock.calls.length;

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFrom.mock.calls.length).toBeGreaterThan(preCallCount);
    });

    const saveBuilder = mockFrom.mock.results[preCallCount]?.value;
    expect(saveBuilder.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          profile_id: "profile-456",
          mission_statement: expect.any(String),
          impact_stats: expect.any(Array),
          impact_highlights: expect.any(Array),
        }),
      ],
      { onConflict: "profile_id" },
    );
  });
});
