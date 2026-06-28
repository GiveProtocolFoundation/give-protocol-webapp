import { renderHook } from "@testing-library/react";
import { usePageTitle } from "./usePageTitle";

describe("usePageTitle", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should set document.title with suffix", () => {
    renderHook(() => usePageTitle("Browse"));
    expect(document.title).toBe("Browse | Give Protocol");
  });

  it("should reset title on unmount", () => {
    const { unmount } = renderHook(() => usePageTitle("FAQ"));
    expect(document.title).toBe("FAQ | Give Protocol");
    unmount();
    expect(document.title).toBe("Give Protocol - Smart Giving Platform");
  });

  it("should update title when argument changes", () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: "About" },
    });
    expect(document.title).toBe("About | Give Protocol");
    rerender({ title: "Settings" });
    expect(document.title).toBe("Settings | Give Protocol");
  });
});
