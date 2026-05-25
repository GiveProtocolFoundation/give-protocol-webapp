import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CauseDetail from "./CauseDetail";

// Supabase and logger are mocked here.
// CausePageTemplate is globally mocked via jest.config.mjs to expose
// data-testid spans for cause fields.

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/utils/logger", () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

const mockFrom = jest.mocked(supabase.from);

function buildSelectChain(result: { data: unknown; error: unknown }) {
  const single = jest.fn(() => Promise.resolve(result));
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  return { select, eq, single };
}

function renderWithRoute(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/causes/${id}`]}>
      <Routes>
        <Route path="/causes/:id" element={<CauseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithoutIdParam() {
  return render(
    <MemoryRouter initialEntries={["/causes"]}>
      <Routes>
        <Route path="/causes" element={<CauseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CauseDetail", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders loading spinner initially", () => {
    const chain = buildSelectChain({ data: null, error: null });
    chain.single = jest.fn(
      () =>
        new Promise(() => {
          // intentionally pending — keeps component in loading state
        }),
    );
    chain.eq = jest.fn(() => ({ single: chain.single }));
    chain.select = jest.fn(() => ({ eq: chain.eq }));
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("cause-1");
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();
  });

  it("shows not-found message when no id param is present", async () => {
    renderWithoutIdParam();

    await waitFor(() => {
      expect(screen.getByText("Cause Not Found")).toBeTruthy();
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("shows not-found message when supabase returns an error", async () => {
    const chain = buildSelectChain({
      data: null,
      error: { message: "Not found" },
    });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("missing-id");

    await waitFor(() => {
      expect(screen.getByText("Cause Not Found")).toBeTruthy();
    });
    expect(Logger.error).toHaveBeenCalledWith(
      "Error fetching cause detail",
      expect.objectContaining({ id: "missing-id" }),
    );
  });

  it("shows not-found message when data is null without error", async () => {
    const chain = buildSelectChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("missing-id");

    await waitFor(() => {
      expect(screen.getByText("Cause Not Found")).toBeTruthy();
    });
  });

  it("renders cause via CausePageTemplate on success with all fields", async () => {
    const fakeRow = {
      id: "cause-uuid",
      name: "Clean Water for Villages",
      description: "Bring clean water to remote communities.",
      target_amount: 100000,
      raised_amount: 42000,
      charity_id: "charity-1",
      category: "water",
      image_url: "https://example.com/image.png",
      impact: ["10 wells built", "5,000 served"],
      timeline: "12 months",
      location: "Kenya",
      partners: ["UNICEF", "WaterAid"],
      status: "active",
    };
    const chain = buildSelectChain({ data: fakeRow, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("cause-uuid");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Clean Water for Villages" }),
      ).toBeTruthy();
    });

    expect(screen.getByTestId("category").textContent).toBe("water");
    expect(screen.getByTestId("location").textContent).toBe("Kenya");
    expect(screen.getByTestId("timeline").textContent).toBe("12 months");
    expect(screen.getByTestId("image").textContent).toBe(
      "https://example.com/image.png",
    );
    expect(screen.getByTestId("status").textContent).toBe("active");
    expect(screen.getByTestId("target").textContent).toBe("100000");
    expect(screen.getByTestId("raised").textContent).toBe("42000");
    expect(screen.getByTestId("impact-count").textContent).toBe("2");
    expect(screen.getByTestId("partners-count").textContent).toBe("2");
    expect(mockFrom).toHaveBeenCalledWith("causes");
  });

  it("falls back to empty defaults for nullable fields", async () => {
    const fakeRow = {
      id: "cause-2",
      name: "Reforestation",
      description: "Plant trees.",
      target_amount: 50000,
      raised_amount: 0,
      charity_id: "charity-2",
      category: "environment",
      image_url: null,
      impact: null,
      timeline: null,
      location: null,
      partners: null,
      status: "paused",
    };
    const chain = buildSelectChain({ data: fakeRow, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("cause-2");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Reforestation" }),
      ).toBeTruthy();
    });

    expect(screen.getByTestId("image").textContent).toBe("");
    expect(screen.getByTestId("location").textContent).toBe("");
    expect(screen.getByTestId("timeline").textContent).toBe("");
    expect(screen.getByTestId("impact-count").textContent).toBe("0");
    expect(screen.getByTestId("partners-count").textContent).toBe("0");
    expect(screen.getByTestId("status").textContent).toBe("paused");
  });

  it("does not update state if unmounted before fetch resolves", async () => {
    type FetchResult = { data: unknown; error: unknown };
    let resolveSingle: ((_value: FetchResult) => void) | undefined;
    const single = jest.fn(
      () =>
        new Promise<FetchResult>((resolve) => {
          resolveSingle = resolve;
        }),
    );
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select, eq, single } as ReturnType<
      typeof supabase.from
    >);

    const { unmount } = renderWithRoute("cause-3");
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();

    unmount();

    resolveSingle?.({
      data: {
        id: "cause-3",
        name: "Late",
        description: "",
        target_amount: 0,
        raised_amount: 0,
        charity_id: "c",
        category: "x",
        image_url: null,
        impact: null,
        timeline: null,
        location: null,
        partners: null,
        status: "active",
      },
      error: null,
    });

    // Allow microtask to flush; component is unmounted so no state update / no error.
    await Promise.resolve();
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
