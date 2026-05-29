import React from "react";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/contexts/ToastContext.real";
import type { ShowToastFn } from "@/contexts/ToastContext.real";

describe("ToastContext", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function ShowToastButton({
    type,
    title,
    message,
  }: {
    type: "success" | "error" | "loading" | "info" | "warning";
    title: string;
    message?: string;
  }): React.ReactElement {
    const { showToast } = useToast();
    return (
      <button type="button" onClick={() => showToast(type, title, message)}>
        show
      </button>
    );
  }

  function renderWithProvider(child: React.ReactElement) {
    return render(<ToastProvider>{child}</ToastProvider>);
  }

  it("renders no toasts initially", () => {
    renderWithProvider(<div>child</div>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("displays a toast when showToast is called with positional args", () => {
    renderWithProvider(
      <ShowToastButton
        type="success"
        title="Saved"
        message="Profile updated"
      />,
    );
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Profile updated")).toBeInTheDocument();
  });

  it("displays a toast when showToast is called with options object", () => {
    function OptionsButton(): React.ReactElement {
      const { showToast } = useToast();
      const handleClick = React.useCallback(() => {
        (showToast as ShowToastFn)({
          type: "info",
          title: "Update",
          message: "New version available",
        });
      }, [showToast]);
      return (
        <button type="button" onClick={handleClick}>
          show-opts
        </button>
      );
    }

    renderWithProvider(<OptionsButton />);
    act(() => {
      screen.getByText("show-opts").click();
    });
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByText("New version available")).toBeInTheDocument();
  });

  it("auto-dismisses non-loading toasts after default 4000ms", () => {
    renderWithProvider(<ShowToastButton type="success" title="Saved" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4200);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("respects custom duration via options object", () => {
    function CustomDuration(): React.ReactElement {
      const { showToast } = useToast();
      const handleClick = React.useCallback(() => {
        (showToast as ShowToastFn)({
          type: "success",
          title: "Quick",
          duration: 1000,
        });
      }, [showToast]);
      return (
        <button type="button" onClick={handleClick}>
          quick
        </button>
      );
    }

    renderWithProvider(<CustomDuration />);
    act(() => {
      screen.getByText("quick").click();
    });
    expect(screen.getByText("Quick")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(screen.queryByText("Quick")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss loading toasts", () => {
    renderWithProvider(<ShowToastButton type="loading" title="Working..." />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Working...")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Working...")).toBeInTheDocument();
  });

  it("does not auto-dismiss persistent toasts", () => {
    function PersistentButton(): React.ReactElement {
      const { showToast } = useToast();
      const handleClick = React.useCallback(() => {
        (showToast as ShowToastFn)({
          type: "error",
          title: "Sticky",
          persistent: true,
        });
      }, [showToast]);
      return (
        <button type="button" onClick={handleClick}>
          persist
        </button>
      );
    }

    renderWithProvider(<PersistentButton />);
    act(() => {
      screen.getByText("persist").click();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Sticky")).toBeInTheDocument();
  });

  it("removes a toast when its dismiss button is clicked", () => {
    renderWithProvider(<ShowToastButton type="loading" title="Working..." />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Working...")).toBeInTheDocument();

    act(() => {
      screen.getByLabelText("Dismiss notification").click();
    });
    // Dismiss animation takes 200ms
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(screen.queryByText("Working...")).not.toBeInTheDocument();
  });

  it("supports multiple stacked toasts", () => {
    function MultiTrigger(): React.ReactElement {
      const { showToast } = useToast();
      return (
        <>
          <button type="button" onClick={() => showToast("success", "First")}>
            first
          </button>
          <button type="button" onClick={() => showToast("error", "Second")}>
            second
          </button>
        </>
      );
    }

    renderWithProvider(<MultiTrigger />);
    act(() => {
      screen.getByText("first").click();
    });
    act(() => {
      screen.getByText("second").click();
    });
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("limits visible toasts to max 3, queuing extras FIFO", () => {
    function ManyTrigger(): React.ReactElement {
      const { showToast } = useToast();
      const handleClick = React.useCallback(() => {
        (showToast as ShowToastFn)({ type: "info", title: "T1", persistent: true });
        (showToast as ShowToastFn)({ type: "info", title: "T2", persistent: true });
        (showToast as ShowToastFn)({ type: "info", title: "T3", persistent: true });
        (showToast as ShowToastFn)({ type: "info", title: "T4", persistent: true });
      }, [showToast]);
      return (
        <button type="button" onClick={handleClick}>
          many
        </button>
      );
    }

    renderWithProvider(<ManyTrigger />);
    act(() => {
      screen.getByText("many").click();
    });

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(3);
    // Newest on top: T4, T3, T2 visible. T1 queued.
    expect(screen.getByText("T4")).toBeInTheDocument();
    expect(screen.getByText("T3")).toBeInTheDocument();
    expect(screen.getByText("T2")).toBeInTheDocument();
    expect(screen.queryByText("T1")).not.toBeInTheDocument();
  });

  it("container has role=region and aria-label=Notifications", () => {
    renderWithProvider(<ShowToastButton type="success" title="Test" />);
    act(() => {
      screen.getByText("show").click();
    });
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("aria-label", "Notifications");
  });

  it("each toast has role=alert", () => {
    renderWithProvider(<ShowToastButton type="info" title="Note" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("error toasts have aria-live=assertive", () => {
    renderWithProvider(<ShowToastButton type="error" title="Err" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByRole("alert")).toHaveAttribute(
      "aria-live",
      "assertive",
    );
  });

  it("non-error toasts have aria-live=polite", () => {
    renderWithProvider(<ShowToastButton type="success" title="OK" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });

  it("shows progress bar for non-persistent toasts", () => {
    renderWithProvider(<ShowToastButton type="success" title="Bar" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByTestId("toast-progress-bar")).toBeInTheDocument();
  });

  it("hides progress bar for persistent toasts", () => {
    function PersistentButton(): React.ReactElement {
      const { showToast } = useToast();
      const handleClick = React.useCallback(() => {
        (showToast as ShowToastFn)({
          type: "error",
          title: "Sticky",
          persistent: true,
        });
      }, [showToast]);
      return (
        <button type="button" onClick={handleClick}>
          persist
        </button>
      );
    }

    renderWithProvider(<PersistentButton />);
    act(() => {
      screen.getByText("persist").click();
    });
    expect(screen.queryByTestId("toast-progress-bar")).not.toBeInTheDocument();
  });

  it("throws when useToast is called outside ToastProvider", () => {
    function Consumer(): React.ReactElement {
      useToast();
      return <span>unreachable</span>;
    }

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      expect(() => render(<Consumer />)).toThrow(
        /useToast must be used within ToastProvider/,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("warning variant renders correctly", () => {
    renderWithProvider(<ShowToastButton type="warning" title="Caution" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Caution")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });

  it("cleans up timer on manual dismiss (no leaks)", () => {
    renderWithProvider(<ShowToastButton type="success" title="Timer" />);
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Timer")).toBeInTheDocument();

    // Manually dismiss before auto-dismiss fires
    act(() => {
      screen.getByLabelText("Dismiss notification").click();
    });
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(screen.queryByText("Timer")).not.toBeInTheDocument();

    // Advancing past original duration should not error
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  });
});
