import React from "react"; // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ConsentProvider, useConsent } from "../ConsentProvider";
import { CONSENT_STORAGE_KEY } from "../storage";

/** Helper component that surfaces the consent context for assertions. */
function ConsentStatus() {
  const { hasDecided, categories, accept, decline, reset } = useConsent();
  return (
    <div>
      <span data-testid="decided">{hasDecided ? "yes" : "no"}</span>
      <span data-testid="analytics">
        {categories.analytics ? "on" : "off"}
      </span>
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

describe("ConsentProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure the URL has no _consentReset param between tests.
    window.history.replaceState(null, "", "/");
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
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!);
    expect(stored.categories).toEqual({ essential: true, analytics: true });
  });

  it("decline() persists decision with analytics:false", () => {
    renderProvider();
    fireEvent.click(screen.getByText("decline"));
    expect(screen.getByTestId("decided")).toHaveTextContent("yes");
    expect(screen.getByTestId("analytics")).toHaveTextContent("off");
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!);
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

  describe("?_consentReset=1 dev guard", () => {
    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("clears an existing consent record when ?_consentReset=1 is in the URL (non-production env)", async () => {
      // Seed localStorage with an already-decided record.
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          decidedAt: new Date().toISOString(),
          categories: { essential: true, analytics: true },
        }),
      );

      // Set the reset query param before mounting.
      // In Jest, process.env.NODE_ENV is 'test' (not 'production'), so the
      // guard runs and clears consent when the param is present.
      window.history.replaceState(null, "", "/?_consentReset=1");

      await act(async () => {
        renderProvider();
      });

      // Despite localStorage having a decided record, the provider should
      // have reset to undecided.
      expect(screen.getByTestId("decided")).toHaveTextContent("no");
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    });

    it("does NOT clear consent when ?_consentReset=1 is absent", async () => {
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          decidedAt: new Date().toISOString(),
          categories: { essential: true, analytics: false },
        }),
      );

      // No reset param — consent record should survive.
      await act(async () => {
        renderProvider();
      });

      expect(screen.getByTestId("decided")).toHaveTextContent("yes");
    });
  });
});
