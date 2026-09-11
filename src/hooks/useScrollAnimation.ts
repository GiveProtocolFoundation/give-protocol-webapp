import { useEffect, useRef, useState } from "react";

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Failsafe reveal window (ms). Some embedded/automated rendering surfaces never
 * deliver IntersectionObserver callbacks; content must not stay opacity:0
 * forever in those environments (GIV-988, previously PR #466).
 */
const FAILSAFE_REVEAL_MS = 4000;

/**
 * Custom hook for scroll-based animations
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref to attach to element and visibility state
 */
export const useScrollAnimation = (options: ScrollAnimationOptions = {}) => {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Environments without IntersectionObserver must never gate content
    // behind the reveal animation.
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const element = elementRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    // Failsafe: if the observer callback is never delivered (e.g. hidden or
    // embedded rendering surfaces), reveal anyway so content cannot stay
    // invisible indefinitely.
    const failsafe = setTimeout(() => {
      setIsVisible(true);
    }, FAILSAFE_REVEAL_MS);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { elementRef, isVisible };
};

/**
 * Hook for detecting scroll direction
 * @returns Current scroll direction ('up' | 'down' | null)
 */
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null,
  );
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    /** Updates scroll direction state when the window is scrolled. */
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        setScrollDirection("down");
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection("up");
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  return scrollDirection;
};

/**
 * Hook for smooth scroll to element
 * @returns Function to scroll to a specific element or position
 */
export const useSmoothScroll = () => {
  /**
   * Smoothly scrolls to the element with the given ID.
   * @param elementId - DOM element ID to scroll to
   * @param offset - Pixel offset to subtract from the scroll position
   */
  const scrollToElement = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  /** Smoothly scrolls the page back to the top. */
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return { scrollToElement, scrollToTop };
};
