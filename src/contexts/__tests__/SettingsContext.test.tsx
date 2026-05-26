import React from "react";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, act, renderHook } from "@testing-library/react";
import {
  SettingsProvider,
  useSettings,
  type Language,
  type Currency,
  type Theme,
} from "@/contexts/SettingsContext.real";

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe("SettingsContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.documentElement.classList.remove("dark");
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("returns fallback defaults when useSettings is used outside SettingsProvider", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.language).toBe("en");
    expect(result.current.currency).toBe("USD");
    expect(result.current.theme).toBe("light");
  });

  it("exposes the available language and currency options", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.languageOptions.map((o) => o.value)).toContain("en");
    expect(result.current.currencyOptions.map((o) => o.value)).toContain("USD");
  });

  it("starts with default values when nothing is stored", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.language).toBe("en");
    expect(result.current.currency).toBe("USD");
    expect(result.current.theme).toBe("light");
  });

  it("hydrates language and currency from localStorage on mount", () => {
    localStorage.setItem("language", "fr");
    localStorage.setItem("currency", "EUR");
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.language).toBe("fr");
    expect(result.current.currency).toBe("EUR");
  });

  it("hydrates theme from cookie when present", () => {
    document.cookie = "theme=dark; path=/";
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to localStorage theme when no cookie is set", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("persists language updates to localStorage and updates document.lang", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setLanguage("de" as Language);
    });
    expect(result.current.language).toBe("de");
    expect(localStorage.getItem("language")).toBe("de");
    expect(document.documentElement.lang).toBe("de");
  });

  it("persists currency updates to localStorage", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setCurrency("GBP" as Currency);
    });
    expect(result.current.currency).toBe("GBP");
    expect(localStorage.getItem("currency")).toBe("GBP");
  });

  it("persists theme to localStorage, sets a cookie, and toggles the dark class", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setTheme("dark" as Theme);
    });
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("light" as Theme);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("sets dir=rtl on document when Arabic is selected", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setLanguage("ar" as Language);
    });
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("sets dir=ltr on document when a non-Arabic language is selected", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setLanguage("ar" as Language);
    });
    act(() => {
      result.current.setLanguage("en" as Language);
    });
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("renders children inside the provider", () => {
    const { getByText } = render(
      <SettingsProvider>
        <span>child content</span>
      </SettingsProvider>,
    );
    expect(getByText("child content")).toBeInTheDocument();
  });
});
