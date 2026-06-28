import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { HoursVerificationTab } from "./HoursVerificationTab";

/* eslint-disable react/prop-types */
jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
/* eslint-enable react/prop-types */

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

jest.mock("@/utils/date", () => ({
  formatDate: (d: string) => d,
}));

jest.mock("@/components/charity/validation", () => ({
  ValidationQueueDashboard: () => null,
}));

const makeHours = (id: string) => ({
  id,
  volunteer_id: `vol-${id}`,
  volunteerName: `Volunteer ${id}`,
  hours: 3,
  date_performed: "2024-03-01",
  description: "Helped at event",
});

describe("HoursVerificationTab", () => {
  const baseProps = {
    profileId: "org-001",
    onVerify: jest.fn(),
    onReject: jest.fn(),
    onExport: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  it("renders pending hours", () => {
    render(
      <HoursVerificationTab
        {...baseProps}
        pendingHours={[makeHours("h1"), makeHours("h2")]}
      />,
    );
    expect(screen.getByText("Volunteer h1")).toBeTruthy();
    expect(screen.getByText("Volunteer h2")).toBeTruthy();
  });

  it("calls onVerify with hours id when Verify clicked", () => {
    const onVerify = jest.fn();
    render(
      <HoursVerificationTab
        {...baseProps}
        onVerify={onVerify}
        pendingHours={[makeHours("hrs-abc")]}
      />,
    );
    const verifyBtn = screen.getByText("Verify");
    fireEvent.click(verifyBtn);
    expect(onVerify).toHaveBeenCalledWith("hrs-abc");
  });

  it("calls onReject with hours id when Reject clicked", () => {
    const onReject = jest.fn();
    render(
      <HoursVerificationTab
        {...baseProps}
        onReject={onReject}
        pendingHours={[makeHours("hrs-xyz")]}
      />,
    );
    const rejectBtn = screen.getByText("Reject");
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledWith("hrs-xyz");
  });

  it("calls onExport when Export button clicked", () => {
    const onExport = jest.fn();
    render(
      <HoursVerificationTab
        {...baseProps}
        onExport={onExport}
        pendingHours={[]}
      />,
    );
    const exportBtn = screen.getByText("Export");
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no pending hours", () => {
    render(<HoursVerificationTab {...baseProps} pendingHours={[]} />);
    expect(screen.getByText("All caught up!")).toBeTruthy();
  });

  it("renders self-reported section heading in all view mode", () => {
    render(<HoursVerificationTab {...baseProps} pendingHours={[]} />);
    expect(screen.getByText("Self-Reported Hours")).toBeTruthy();
  });
});
