import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { usePlatformNews, useAdminPlatformNews } from "./usePlatformNews";
import { NEWS_UPDATES } from "@/data/newsUpdates";

// supabase is mocked globally via moduleNameMapper

interface PlatformNewsRow {
  id: string;
  title: string;
  content: string;
  url: string | null;
  image_url: string | null;
  published_at: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function makeRow(
  id: string,
  overrides?: Partial<PlatformNewsRow>,
): PlatformNewsRow {
  return {
    id,
    title: `News ${id}`,
    content: `Content for ${id}`,
    url: `/news/${id}`,
    image_url: null,
    published_at: "2026-05-25T00:00:00Z",
    category: "general",
    is_active: true,
    created_at: "2026-05-25T00:00:00Z",
    updated_at: "2026-05-25T00:00:00Z",
    ...overrides,
  };
}

describe("usePlatformNews", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    const { result } = renderHook(() => usePlatformNews());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns fetched news after successful load", async () => {
    const rows = [makeRow("1"), makeRow("2")];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => usePlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news).toHaveLength(2);
    expect(result.current.news[0].id).toBe("1");
    expect(result.current.news[0].title).toBe("News 1");
    expect(result.current.news[0].excerpt).toBe("Content for 1");
    expect(result.current.news[0].url).toBe("/news/1");
    expect(result.current.error).toBeNull();
  });

  it("falls back to static NEWS_UPDATES on fetch error", async () => {
    setMockResult("platform_news", {
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => usePlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news).toEqual(NEWS_UPDATES);
    expect(result.current.error).toBe(
      "Failed to load platform news, showing defaults",
    );
  });

  it("falls back to static NEWS_UPDATES when fetch returns empty", async () => {
    setMockResult("platform_news", { data: [], error: null });

    const { result } = renderHook(() => usePlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news).toEqual(NEWS_UPDATES);
    expect(result.current.error).toBeNull();
  });

  it("maps null url to '#' fallback", async () => {
    const rows = [makeRow("1", { url: null })];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => usePlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news[0].url).toBe("#");
  });
});

describe("useAdminPlatformNews", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("loads all items on mount", async () => {
    const rows = [makeRow("a"), makeRow("b", { is_active: false })];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1].is_active).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    setMockResult("platform_news", {
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBe("Failed to load news items");
  });

  it("create calls insert and refetches", async () => {
    setMockResult("platform_news", { data: [], error: null });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({
        title: "New news",
        content: "Content",
        url: "/news/new",
        image_url: "",
        published_at: "2026-05-25T10:00",
        category: "product",
        is_active: true,
      });
    });

    expect(result.current.saving).toBe(false);
  });

  it("update calls update and refetches", async () => {
    const rows = [makeRow("x")];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update("x", {
        title: "Updated",
        content: "Updated content",
        url: "/news/updated",
        image_url: "",
        published_at: "2026-05-25T10:00",
        category: "impact",
        is_active: true,
      });
    });

    expect(result.current.saving).toBe(false);
  });

  it("toggleActive flips is_active and refetches", async () => {
    const rows = [makeRow("t", { is_active: true })];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleActive("t", false);
    });

    expect(result.current.saving).toBe(false);
  });

  it("remove calls delete and refetches", async () => {
    const rows = [makeRow("d")];
    setMockResult("platform_news", { data: rows, error: null });

    const { result } = renderHook(() => useAdminPlatformNews());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("d");
    });

    expect(result.current.saving).toBe(false);
  });
});
