import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharityDetail from "./CharityDetail";

// Supabase and logger are mocked here.
// CharityPageTemplate is globally mocked via jest.config.mjs to render:
//   <div data-testid="charity-page-template"><h1>{name}</h1>...</div>

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

const mockFrom = jest.mocked(supabase.from);

function buildSelectChain(result: { data: unknown; error: unknown }) {
  const single = jest.fn(() => Promise.resolve(result));
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  return { select, eq, single };
}

function renderWithRoute(ein: string) {
  return render(
    <MemoryRouter initialEntries={[`/charity/${ein}`]}>
      <Routes>
        <Route path="/charity/:id" element={<CharityDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CharityDetail", () => {
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

    renderWithRoute("12-3456789");
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows not-found message when supabase returns an error", async () => {
    const chain = buildSelectChain({
      data: null,
      error: { message: "Not found" },
    });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("00-0000000");

    await waitFor(() => {
      expect(screen.getByText("Charity not found")).toBeTruthy();
    });
  });

  it("renders charity name via CharityPageTemplate on success", async () => {
    const fakeRow = {
      id: "uuid-001",
      ein: "12-3456789",
      name: "Ocean Aid",
      mission: "Protect the oceans",
      location: "California",
      logo_url: "https://example.com/logo.png",
      ntee_code: "C20",
      status: "verified",
      wallet_address: "0xabc",
    };
    const chain = buildSelectChain({ data: fakeRow, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("12-3456789");

    await waitFor(() => {
      // Global CharityPageTemplate mock renders <h1>{charity.name}</h1>
      expect(screen.getByRole("heading", { name: "Ocean Aid" })).toBeTruthy();
    });
  });

  it("shows not-found when data is null without error", async () => {
    const chain = buildSelectChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    renderWithRoute("99-9999999");

    await waitFor(() => {
      expect(screen.getByText("Charity not found")).toBeTruthy();
    });
  });
});
