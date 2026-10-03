import { jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  (window.matchMedia as unknown as jest.Mock).mockImplementation(() => ({
    matches,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.push(cb),
    removeEventListener: jest.fn(),
  }));
  return listeners;
}

describe("usePrefersReducedMotion", () => {
  it("is false by default", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("is true when the user prefers reduced motion", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the preference changes", () => {
    const listeners = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    act(() => {
      listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current).toBe(true);
  });
});
