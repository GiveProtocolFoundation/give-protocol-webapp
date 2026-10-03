import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { HeroStats } from "./HeroStats";

const mockRpc = supabase.rpc as unknown as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;

describe("HeroStats", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("shows real counts once loaded", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          verified_organizations: 1234,
          charitable_sectors: 5,
          verified_volunteer_hours: "98.6",
        },
      ],
      error: null,
    });
    render(<HeroStats />);

    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // Hours are rounded for display.
    expect(screen.getByText("99")).toBeInTheDocument();
    // Networks come from configuration.
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows dashes instead of invented numbers when the fetch fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<HeroStats />);

    await waitFor(() => expect(screen.getAllByText("—")).toHaveLength(3));
    expect(screen.queryByText("3+")).not.toBeInTheDocument();
  });

  it("labels every tile", () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    render(<HeroStats />);
    expect(screen.getByText("Networks supported")).toBeInTheDocument();
    expect(screen.getByText("Charitable sectors")).toBeInTheDocument();
    expect(screen.getByText("Verified organizations")).toBeInTheDocument();
    expect(screen.getByText("Volunteer hours")).toBeInTheDocument();
  });
});
