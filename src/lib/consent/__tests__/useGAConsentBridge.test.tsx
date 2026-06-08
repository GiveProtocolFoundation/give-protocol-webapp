import React from "react"; // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, fireEvent, screen } from "@testing-library/react";
import { ConsentProvider, useConsent } from "../ConsentProvider";
import { useGAConsentBridge } from "../useGAConsentBridge";
import { CONSENT_STORAGE_KEY } from "../storage";

/** Test harness that wires the bridge and exposes consent actions. */
function Harness() {
  const consent = useConsent();
  useGAConsentBridge();
  return (
    <div>
      <span data-testid="decided">{consent.hasDecided ? "yes" : "no"}</span>
      <button onClick={() => consent.accept({ analytics: true })}>
        acceptOn
      </button>
      <button onClick={() => consent.accept({ analytics: false })}>
        acceptOff
      </button>
      <button onClick={() => consent.decline()}>decline</button>
      <button onClick={() => consent.reset()}>reset</button>
    </div>
  );
}

const renderHarness = () =>
  render(
    <ConsentProvider>
      <Harness />
    </ConsentProvider>,
  );

describe("useGAConsentBridge", () => {
  let gtagMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    gtagMock = jest.fn();
    (window as Record<string, unknown>).gtag = gtagMock;
  });

  afterEach(() => {
    delete (window as Record<string, unknown>).gtag;
  });

  it("calls gtag consent update with 'denied' on mount when undecided", () => {
    renderHarness();
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("calls gtag consent update with 'granted' after accept({ analytics: true })", () => {
    renderHarness();
    gtagMock.mockClear();
    fireEvent.click(screen.getByText("acceptOn"));
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
    });
  });

  it("calls gtag consent update with 'denied' after decline()", () => {
    renderHarness();
    gtagMock.mockClear();
    fireEvent.click(screen.getByText("decline"));
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("calls gtag consent update with 'denied' after accept({ analytics: false })", () => {
    renderHarness();
    gtagMock.mockClear();
    fireEvent.click(screen.getByText("acceptOff"));
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("calls gtag consent update with 'denied' after reset()", () => {
    renderHarness();
    // First accept so there's a decision to reset
    fireEvent.click(screen.getByText("acceptOn"));
    gtagMock.mockClear();
    fireEvent.click(screen.getByText("reset"));
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("replays stored consent on mount for returning visitors", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { essential: true, analytics: true },
      }),
    );
    renderHarness();
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
    });
  });

  it("does not throw when window.gtag is undefined", () => {
    delete (window as Record<string, unknown>).gtag;
    expect(() => renderHarness()).not.toThrow();
  });
});
