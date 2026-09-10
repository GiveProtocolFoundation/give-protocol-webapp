import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useFiatDonation } from "../useFiatDonation";
// Alias import resolves to the moduleNameMapper mock (helcimServiceMock.js),
// so the script loader can be stubbed per-test in ESM mode (GIV-984).
import {
  loadHelcimScript,
  resetHelcimScriptState,
} from "@/services/helcimService";

const mockedLoadHelcimScript = loadHelcimScript as jest.MockedFunction<
  typeof loadHelcimScript
>;
const mockedReset = resetHelcimScriptState as jest.MockedFunction<
  typeof resetHelcimScriptState
>;

describe("useFiatDonation script-load watchdog (GIV-984)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("surfaces an error after ~20s when the script never becomes ready", () => {
    // Simulate the hang: the load promise never settles, like a missing
    // HELCIM_API_TOKEN in prod.
    mockedLoadHelcimScript.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useFiatDonation());

    expect(result.current.error).toBeNull();

    act(() => {
      jest.advanceTimersByTime(19_999);
    });
    expect(result.current.error).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.error).toBe(
      "The payment form is taking too long to load. Please retry, or use crypto payment instead.",
    );
    expect(result.current.scriptReady).toBe(false);
  });

  it("does not fire the watchdog when the script becomes ready", async () => {
    mockedLoadHelcimScript.mockImplementation(() => Promise.resolve());

    const { result } = renderHook(() => useFiatDonation());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.scriptReady).toBe(true);

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(result.current.error).toBeNull();
  });

  it("keeps a real load failure error instead of the watchdog message", async () => {
    mockedLoadHelcimScript.mockRejectedValue(
      new Error("Failed to load payment processor"),
    );

    const { result } = renderHook(() => useFiatDonation());

    // Drain all 4 attempts (initial + 3 retries) with their backoff delays
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.error).toBe("Failed to load payment processor");

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    // Watchdog must not overwrite the concrete error
    expect(result.current.error).toBe("Failed to load payment processor");
  });

  it("re-arms the watchdog after a user-initiated retry", () => {
    mockedLoadHelcimScript.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useFiatDonation());

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(result.current.error).toContain("taking too long");

    // Retry: error clears, watchdog timer restarts
    act(() => {
      result.current.retryInitialization();
    });
    expect(result.current.error).toBeNull();
    expect(mockedReset).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(19_999);
    });
    expect(result.current.error).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.error).toContain("taking too long");
  });
});
