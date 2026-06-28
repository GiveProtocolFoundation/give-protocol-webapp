import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { SentryFallback } from "../SentryFallback";

describe("SentryFallback", () => {
  function renderFallback(
    error: unknown,
    resetError: () => void = jest.fn(),
  ): ReturnType<typeof render> {
    return render(
      <SentryFallback
        error={error}
        resetError={resetError}
        componentStack=""
        eventId=""
      />,
    );
  }

  it("renders the error message when an Error is provided", () => {
    renderFallback(new Error("kaboom"));
    expect(screen.getByText("kaboom")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("falls back to a generic message when error is not an Error instance", () => {
    renderFallback("plain string");
    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });

  it("uses the generic message for null / undefined errors", () => {
    renderFallback(null);
    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });

  it("invokes resetError when the Try Again button is clicked", () => {
    const resetError = jest.fn();
    renderFallback(new Error("oops"), resetError);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(resetError).toHaveBeenCalledTimes(1);
  });
});
