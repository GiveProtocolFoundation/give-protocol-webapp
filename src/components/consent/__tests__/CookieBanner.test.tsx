import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CookieBanner } from "../CookieBanner";
import { ConsentProvider } from "@/lib/consent/ConsentProvider";
import { CONSENT_STORAGE_KEY } from "@/lib/consent/storage";

// useTranslation is mocked globally via moduleNameMapper (returns en.ts strings).
// Modal is mocked globally via moduleNameMapper (data-testid="modal", always renders).

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

/** Seed localStorage with a valid decided consent record. */
function seedDecidedConsent(analytics = false) {
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      decidedAt: new Date().toISOString(),
      categories: { essential: true, analytics },
    }),
  );
}

const renderBanner = () =>
  render(
    <MemoryRouter>
      <ConsentProvider>
        <CookieBanner />
      </ConsentProvider>
    </MemoryRouter>,
  );

describe("CookieBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    // Suppress gtag bridge calls in banner tests
    (window as typeof window & { gtag?: unknown }).gtag = jest.fn();
  });

  afterEach(() => {
    delete (window as typeof window & { gtag?: unknown }).gtag;
  });

  it("renders nothing when hasDecided is true", () => {
    seedDecidedConsent();
    renderBanner();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it('renders a region with role="region" and aria-label="Cookie consent" when undecided', () => {
    renderBanner();
    expect(
      screen.getByRole("region", { name: "Cookie consent" }),
    ).toBeInTheDocument();
  });

  it("calls accept({ essential:true, analytics:true }) when Accept all is clicked", () => {
    renderBanner();
    fireEvent.click(screen.getByText("Accept all"));
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "");
    expect(stored.categories).toEqual({ essential: true, analytics: true });
  });

  it("calls decline() (analytics:false) when Decline non-essential is clicked", () => {
    renderBanner();
    fireEvent.click(screen.getByText("Decline non-essential"));
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "");
    expect(stored.categories).toEqual({ essential: true, analytics: false });
  });

  it("opens the CustomizeModal when Customize is clicked", () => {
    renderBanner();
    expect(screen.queryByTestId("modal")).toBeNull();
    fireEvent.click(screen.getByText("Customize"));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  it("privacy link points to /privacy", () => {
    renderBanner();
    const link = screen.getByText("Privacy policy").closest("a");
    expect(link).toHaveAttribute("href", "/privacy");
  });

  it("banner body discloses Google Analytics 4 and Sentry as processors", () => {
    renderBanner();
    const region = screen.getByRole("region", { name: "Cookie consent" });
    expect(region.textContent).toMatch(/Google Analytics/i);
    expect(region.textContent).toMatch(/Sentry/i);
  });

  it("no silktide script or element exists in the rendered banner", () => {
    renderBanner();
    const silktideElements = document.querySelectorAll('[id*="silktide"], [class*="silktide"], [src*="silktide"]');
    expect(silktideElements.length).toBe(0);
  });

  it("only one consent region is rendered (no dual-banner state)", () => {
    renderBanner();
    const regions = screen.getAllByRole("region", { name: "Cookie consent" });
    expect(regions).toHaveLength(1);
  });

  it("focuses the Accept all button on initial mount", () => {
    renderBanner();
    const acceptBtn = screen.getByText("Accept all");
    expect(document.activeElement).toBe(acceptBtn);
  });
});
