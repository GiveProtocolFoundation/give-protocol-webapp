import React from "react"; // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { render, fireEvent, screen } from "@testing-library/react";
import { ConsentProvider, useConsent } from "../ConsentProvider";
import { useGA4Loader } from "../useGA4Loader";

/** Test harness that wires the loader and exposes consent actions. */
function Harness() {
  const consent = useConsent();
  useGA4Loader();
  return (
    <div>
      <button onClick={() => consent.accept({ analytics: true })}>
        acceptOn
      </button>
      <button onClick={() => consent.decline()}>decline</button>
    </div>
  );
}

const renderHarness = () =>
  render(
    <ConsentProvider>
      <Harness />
    </ConsentProvider>,
  );

describe("useGA4Loader", () => {
  let appendChildSpy: jest.SpiedFunction<typeof document.head.appendChild>;

  beforeEach(() => {
    localStorage.clear();
    appendChildSpy = jest.spyOn(document.head, "appendChild");
  });

  afterEach(() => {
    appendChildSpy.mockRestore();
    // Clean up any injected scripts
    document
      .querySelectorAll('script[src*="googletagmanager"]')
      .forEach((el) => el.remove());
  });

  it("does not inject a script tag when consent is undecided", () => {
    renderHarness();
    const scriptCalls = appendChildSpy.mock.calls.filter(
      (call) =>
        call[0] instanceof HTMLScriptElement &&
        (call[0] as HTMLScriptElement).src.includes("googletagmanager"),
    );
    expect(scriptCalls).toHaveLength(0);
  });

  it("does not inject a script tag when analytics is declined", () => {
    renderHarness();
    fireEvent.click(screen.getByText("decline"));
    const scriptCalls = appendChildSpy.mock.calls.filter(
      (call) =>
        call[0] instanceof HTMLScriptElement &&
        (call[0] as HTMLScriptElement).src.includes("googletagmanager"),
    );
    expect(scriptCalls).toHaveLength(0);
  });

  it("injects the GA4 script tag when analytics consent is granted", () => {
    renderHarness();
    fireEvent.click(screen.getByText("acceptOn"));
    const scriptCalls = appendChildSpy.mock.calls.filter(
      (call) =>
        call[0] instanceof HTMLScriptElement &&
        (call[0] as HTMLScriptElement).src.includes("googletagmanager"),
    );
    expect(scriptCalls).toHaveLength(1);
    const script = scriptCalls[0][0] as HTMLScriptElement;
    expect(script.async).toBe(true);
    expect(script.src).toContain("G-CBQHKLHD8T");
  });

  it("only injects the script once even if consent toggles multiple times", () => {
    renderHarness();
    fireEvent.click(screen.getByText("acceptOn"));
    // Re-render cycle shouldn't inject again
    fireEvent.click(screen.getByText("decline"));
    fireEvent.click(screen.getByText("acceptOn"));
    const scriptCalls = appendChildSpy.mock.calls.filter(
      (call) =>
        call[0] instanceof HTMLScriptElement &&
        (call[0] as HTMLScriptElement).src.includes("googletagmanager"),
    );
    expect(scriptCalls).toHaveLength(1);
  });
});
