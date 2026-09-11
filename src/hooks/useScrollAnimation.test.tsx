import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import React from "react";
import { renderHook, render, act } from "@testing-library/react";
import {
  useScrollAnimation,
  useScrollDirection,
  useSmoothScroll,
} from "./useScrollAnimation";

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();
let observerCallback:
  | ((entries: Array<{ isIntersecting: boolean }>) => void)
  | null = null;

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
  observerCallback = null;

  (
    global as unknown as { IntersectionObserver: unknown }
  ).IntersectionObserver = jest.fn(
    (callback: (entries: Array<{ isIntersecting: boolean }>) => void) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      };
    },
  );
});

describe("useScrollAnimation", () => {
  it("should return elementRef and isVisible=false initially", () => {
    const { result } = renderHook(() => useScrollAnimation());
    expect(result.current.isVisible).toBe(false);
    expect(result.current.elementRef).toBeDefined();
  });

  it("should accept custom options", () => {
    const { result } = renderHook(() =>
      useScrollAnimation({
        threshold: 0.5,
        rootMargin: "10px",
        triggerOnce: false,
      }),
    );
    expect(result.current.isVisible).toBe(false);
  });

  it("should handle unmount without errors when ref has no element", () => {
    const { result, unmount } = renderHook(() => useScrollAnimation());
    // With no element attached to ref, observer is never created
    // Unmount should not throw
    unmount();
    expect(result.current.elementRef).toBeDefined();
  });

  it("should become visible when the observer reports intersection", () => {
    const Probe: React.FC = () => {
      const { elementRef, isVisible } = useScrollAnimation({
        threshold: 0,
        triggerOnce: true,
      });
      return <div ref={elementRef} data-visible={String(isVisible)} />;
    };
    const { container } = render(<Probe />);
    expect(observerCallback).not.toBeNull();
    expect(container.firstChild).toHaveAttribute("data-visible", "false");

    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });
    expect(container.firstChild).toHaveAttribute("data-visible", "true");
  });

  it("should reveal immediately when IntersectionObserver is unavailable (GIV-988)", () => {
    const globalScope = global as unknown as {
      IntersectionObserver?: unknown;
    };
    const savedObserver = globalScope.IntersectionObserver;
    delete globalScope.IntersectionObserver;

    const Probe: React.FC = () => {
      const { elementRef, isVisible } = useScrollAnimation();
      return <div ref={elementRef} data-visible={String(isVisible)} />;
    };
    const { container, unmount } = render(<Probe />);
    expect(container.firstChild).toHaveAttribute("data-visible", "true");
    unmount();

    globalScope.IntersectionObserver = savedObserver;
  });

  it("should reveal via failsafe timer when the observer callback is never delivered (GIV-988)", () => {
    jest.useFakeTimers();
    try {
      const Probe: React.FC = () => {
        const { elementRef, isVisible } = useScrollAnimation({
          threshold: 0,
          triggerOnce: true,
        });
        return <div ref={elementRef} data-visible={String(isVisible)} />;
      };
      const { container } = render(<Probe />);
      // Observer was set up but its callback never fires (hidden or
      // embedded rendering surfaces).
      expect(mockObserve).toHaveBeenCalled();
      expect(container.firstChild).toHaveAttribute("data-visible", "false");

      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(container.firstChild).toHaveAttribute("data-visible", "true");
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("useScrollDirection", () => {
  it("should return null initially", () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current).toBeNull();
  });

  it("should detect downward scroll", () => {
    const { result } = renderHook(() => useScrollDirection());

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe("down");
  });

  it("should detect upward scroll", () => {
    const { result } = renderHook(() => useScrollDirection());

    // First scroll down
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 200, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    // Then scroll up
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe("up");
  });
});

describe("useSmoothScroll", () => {
  it("should return scrollToElement and scrollToTop functions", () => {
    const { result } = renderHook(() => useSmoothScroll());
    expect(typeof result.current.scrollToElement).toBe("function");
    expect(typeof result.current.scrollToTop).toBe("function");
  });

  it("scrollToElement should scroll to existing element", () => {
    const mockElement = document.createElement("div");
    mockElement.id = "test-section";
    document.body.appendChild(mockElement);

    const scrollToSpy = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {
        // Mock implementation
      });

    const { result } = renderHook(() => useSmoothScroll());
    act(() => {
      result.current.scrollToElement("test-section");
    });

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );

    document.body.removeChild(mockElement);
    scrollToSpy.mockRestore();
  });

  it("scrollToElement should do nothing for non-existing element", () => {
    const scrollToSpy = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {
        // Mock implementation
      });

    const { result } = renderHook(() => useSmoothScroll());
    act(() => {
      result.current.scrollToElement("non-existent");
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it("scrollToTop should scroll to top", () => {
    const scrollToSpy = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {
        // Mock implementation
      });

    const { result } = renderHook(() => useSmoothScroll());
    act(() => {
      result.current.scrollToTop();
    });

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });

    scrollToSpy.mockRestore();
  });

  it("scrollToElement should apply offset", () => {
    const mockElement = document.createElement("div");
    mockElement.id = "test-offset";
    document.body.appendChild(mockElement);

    const scrollToSpy = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {
        // Mock implementation
      });

    const { result } = renderHook(() => useSmoothScroll());
    act(() => {
      result.current.scrollToElement("test-offset", 50);
    });

    expect(scrollToSpy).toHaveBeenCalled();

    document.body.removeChild(mockElement);
    scrollToSpy.mockRestore();
  });
});
