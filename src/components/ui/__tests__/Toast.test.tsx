import { render, screen, fireEvent, act } from "@testing-library/react";
import { jest } from "@jest/globals";
import { Toast } from "../Toast";
import type { ToastType } from "../Toast";

const defaultProps = {
  duration: 4000,
  persistent: false,
  onClose: jest.fn(),
};

describe("Toast", () => {
  it("renders title and message", () => {
    render(
      <Toast
        {...defaultProps}
        type="success"
        title="Saved"
        message="Your changes were saved"
      />,
    );

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved")).toBeInTheDocument();
  });

  it("renders without a message", () => {
    render(<Toast {...defaultProps} type="success" title="Done" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("calls onClose when dismiss button is clicked", () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <Toast {...defaultProps} type="error" title="Oops" onClose={onClose} />,
    );

    act(() => {
      fireEvent.click(screen.getByLabelText("Dismiss notification"));
    });
    // Dismiss has a 200ms animation delay
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("uses alert role and assertive live region for errors", () => {
    render(<Toast {...defaultProps} type="error" title="Failed" />);

    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
  });

  it("uses polite live region for non-errors", () => {
    render(<Toast {...defaultProps} type="success" title="OK" />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });

  it.each<ToastType>(["success", "error", "warning", "info", "loading"])(
    "renders an icon for type %s",
    (type) => {
      const { container } = render(
        <Toast {...defaultProps} type={type} title="Title" />,
      );

      const svgs = container.querySelectorAll("svg");
      // Variant icon + dismiss X icon = at least 2
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    },
  );

  it("applies the spinner animation only for loading", () => {
    const { container, rerender } = render(
      <Toast {...defaultProps} type="loading" title="Loading" persistent />,
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();

    rerender(<Toast {...defaultProps} type="info" title="Info" />);
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("shows progress bar for non-persistent toasts", () => {
    render(<Toast {...defaultProps} type="success" title="Bar" />);
    expect(screen.getByTestId("toast-progress-bar")).toBeInTheDocument();
  });

  it("hides progress bar for persistent toasts", () => {
    render(<Toast {...defaultProps} type="error" title="Sticky" persistent />);
    expect(screen.queryByTestId("toast-progress-bar")).not.toBeInTheDocument();
  });

  it("has brand-aligned left accent border", () => {
    render(<Toast {...defaultProps} type="success" title="Green" />);
    const el = screen.getByRole("alert");
    expect(el.className).toContain("border-l-4");
    expect(el.className).toContain("border-l-emerald-500");
  });

  it("has correct border color for each variant", () => {
    const variants: Array<[ToastType, string]> = [
      ["success", "border-l-emerald-500"],
      ["error", "border-l-red-500"],
      ["warning", "border-l-amber-500"],
      ["info", "border-l-blue-500"],
    ];

    for (const [type, expected] of variants) {
      const { unmount } = render(
        <Toast {...defaultProps} type={type} title={type} />,
      );
      expect(screen.getByRole("alert").className).toContain(expected);
      unmount();
    }
  });

  it("starts with enter animation classes", () => {
    render(<Toast {...defaultProps} type="info" title="Anim" />);
    // Before the 10ms useEffect fires, the toast should have opacity-0 translate-y-2
    const el = screen.getByRole("alert");
    expect(el.className).toContain("transition-all");
  });
});
