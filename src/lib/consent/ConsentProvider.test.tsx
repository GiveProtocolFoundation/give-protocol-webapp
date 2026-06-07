import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import { ConsentProvider, useConsent } from "./ConsentProvider.js";
import { CONSENT_STORAGE_KEY } from "./storage.js";

function TestConsumer() {
  const { categories, hasDecided, accept, decline, reset } = useConsent();

  return (
    <div>
      <span data-testid="hasDecided">{String(hasDecided)}</span>
      <span data-testid="analytics">{String(categories.analytics)}</span>
      <span data-testid="essential">{String(categories.essential)}</span>
      <button
        data-testid="accept-analytics"
        onClick={() => {
          accept({ analytics: true });
        }}
      >
        Accept
      </button>
      <button data-testid="decline" onClick={decline}>
        Decline
      </button>
      <button data-testid="reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
}

describe("ConsentProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns hasDecided:false on fresh localStorage", () => {
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    expect(screen.getByTestId("hasDecided").textContent).toBe("false");
    expect(screen.getByTestId("analytics").textContent).toBe("false");
    expect(screen.getByTestId("essential").textContent).toBe("true");
  });

  it("accept({ analytics: true }) sets hasDecided and analytics", () => {
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    act(() => {
      screen.getByTestId("accept-analytics").click();
    });

    expect(screen.getByTestId("hasDecided").textContent).toBe("true");
    expect(screen.getByTestId("analytics").textContent).toBe("true");
  });

  it("accept persists to localStorage and survives remount", () => {
    const { unmount } = render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    act(() => {
      screen.getByTestId("accept-analytics").click();
    });
    unmount();

    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    expect(screen.getByTestId("hasDecided").textContent).toBe("true");
    expect(screen.getByTestId("analytics").textContent).toBe("true");
  });

  it("decline sets analytics:false", () => {
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    act(() => {
      screen.getByTestId("decline").click();
    });

    expect(screen.getByTestId("hasDecided").textContent).toBe("true");
    expect(screen.getByTestId("analytics").textContent).toBe("false");
  });

  it("reset clears consent", () => {
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    act(() => {
      screen.getByTestId("accept-analytics").click();
    });
    expect(screen.getByTestId("hasDecided").textContent).toBe("true");

    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("hasDecided").textContent).toBe("false");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("version bump returns hasDecided:false", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        decidedAt: "2025-01-01T00:00:00.000Z",
        categories: { essential: true, analytics: true },
      }),
    );

    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>,
    );

    expect(screen.getByTestId("hasDecided").textContent).toBe("false");
  });

  it("corrupt JSON returns hasDecided:false without throwing", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "not-valid-json");

    expect(() => {
      render(
        <ConsentProvider>
          <TestConsumer />
        </ConsentProvider>,
      );
    }).not.toThrow();

    expect(screen.getByTestId("hasDecided").textContent).toBe("false");
  });

  it("throws when useConsent is used outside ConsentProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
      // Suppress React error boundary console output
    });

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useConsent must be used within a <ConsentProvider>");

    consoleSpy.mockRestore();
  });
});
