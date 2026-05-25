import React from "react";
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import {
  CurrencyProvider,
  useCurrencyContext,
} from "@/contexts/CurrencyContext.real";

// Logger and priceFeed are auto-mocked via moduleNameMapper

function TestConsumer() {
  const {
    selectedCurrency,
    isLoading,
    convertToFiat,
    convertFromFiat,
  } = useCurrencyContext();

  return (
    <div>
      <span data-testid="currency">{selectedCurrency.code}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="convert-missing">
        {convertToFiat(1, "nonexistent")}
      </span>
      <span data-testid="convert-from-missing">
        {convertFromFiat(3000, "nonexistent")}
      </span>
    </div>
  );
}

describe("CurrencyContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should provide default currency", () => {
    render(
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>,
    );

    expect(screen.getByTestId("currency").textContent).toBe("USD");
  });

  it("should show loading state initially", () => {
    render(
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");
  });

  it("should return 0 for missing token price in convertToFiat", () => {
    render(
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>,
    );

    expect(screen.getByTestId("convert-missing").textContent).toBe("0");
  });

  it("should return 0 for missing token price in convertFromFiat", () => {
    render(
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>,
    );

    expect(screen.getByTestId("convert-from-missing").textContent).toBe("0");
  });

  it("should handle invalid localStorage currency gracefully", () => {
    localStorage.setItem("preferredCurrency", "invalid{json");

    render(
      <CurrencyProvider>
        <TestConsumer />
      </CurrencyProvider>,
    );

    expect(screen.getByTestId("currency").textContent).toBe("USD");
  });

  it("should throw when useCurrencyContext is used outside provider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
      // Suppress React error boundary output
    });

    expect(() => render(<TestConsumer />)).toThrow(
      "useCurrencyContext must be used within CurrencyProvider",
    );

    consoleSpy.mockRestore();
  });
});
