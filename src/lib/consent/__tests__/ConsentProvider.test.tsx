import React from "react"; // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConsentProvider, useConsent } from "../ConsentProvider";
import { CONSENT_STORAGE_KEY } from "../storage";

/** Helper component that surfaces the consent context for assertions. */
function ConsentStatus() {
  const { hasDecided, categories, accept, decline, reset } = useConsent();
  return (
    <div>
      <span data-testid="decided">{hasDecided ? "yes" : "no"}</span>
      <span data-testid="analytics">{categories.analytics ? "on" : "off"}</span>
      <button onClick={() => accept({ analytics: true })}>acceptOn</button>
      <button onClick={() => accept({ analytics: false })}>acceptOff</button>
      <button onClick={() => decline()}>decline</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <ConsentProvider>
      <ConsentStatus />
    </ConsentProvider>,
  );

// ---------------------------------------------------------------------------
// GA4 consent bridge tests
// ---------------------------------------------------------------------------

describe("useGAConsentBridge (via ConsentProvider)", () => {
  let mockGtag: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
  });

  it("starts undecided when localStorage is empty", () => {
    renderProvider();
    expect(screen.getByTestId("decided")).toHaveTextContent("no");
    expect(screen.getByTestId("analytics")).toHaveTextContent("off");
  });

  it("reads an existing consent record from localStorage", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { essential: true, analytics: true },
      }),
    );
    renderProvider();
    expect(screen.getByTestId("decided")).toHaveTextContent("yes");
    expect(screen.getByTestId("analytics")).toHaveTextContent("on");
  });

  it("accept() with analytics:true persists decision and sets hasDecided", () => {
    renderProvider();
    fireEvent.click(screen.getByText("acceptOn"));
    expect(screen.getByTestId("decided")).toHaveTextContent("yes");
    expect(screen.getByTestId("analytics")).toHaveTextContent("on");
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "");
    expect(stored.categories).toEqual({ essential: true, analytics: true });
  });

  it("decline() persists decision with analytics:false", () => {
    renderProvider();
    fireEvent.click(screen.getByText("decline"));
    expect(screen.getByTestId("decided")).toHaveTextContent("yes");
    expect(screen.getByTestId("analytics")).toHaveTextContent("off");
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "");
    expect(stored.categories.analytics).toBe(false);
  });

  it("reset() reverts to undecided and removes localStorage entry", () => {
    renderProvider();
    fireEvent.click(screen.getByText("acceptOn"));
    expect(screen.getByTestId("decided")).toHaveTextContent("yes");

    fireEvent.click(screen.getByText("reset"));
    expect(screen.getByTestId("decided")).toHaveTextContent("no");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("treats a mismatched schema version as undecided", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 99, // wrong version
        decidedAt: new Date().toISOString(),
        categories: { essential: true, analytics: true },
      }),
    );
    renderProvider();
    expect(screen.getByTestId("decided")).toHaveTextContent("no");
  });

  it("treats corrupt JSON as undecided without throwing", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "not valid json{{{");
    renderProvider();
    expect(screen.getByTestId("decided")).toHaveTextContent("no");
  });
});
