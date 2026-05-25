import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ValidationResponseModal } from "./ValidationResponseModal";
import { ActivityType } from "@/types/selfReportedHours";

describe("ValidationResponseModal", () => {
  const mockItem = {
    id: "req-123",
    volunteerName: "Jane Smith",
    volunteerEmail: "jane@example.com",
    activityDate: "2024-03-15",
    hours: 4,
    activityType: ActivityType.DIRECT_SERVICE,
    description: "Helped organize community event",
    location: "Downtown Center",
    createdAt: "2024-03-16T10:00:00Z",
    daysRemaining: 5,
    isResubmission: false,
  };

  const defaultProps = {
    item: mockItem,
    isOpen: true,
    onClose: jest.fn(),
    onApprove: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    onReject: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when not open", () => {
    const { container } = render(
      <ValidationResponseModal {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders volunteer info", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders activity details", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    expect(screen.getByText("4 hours")).toBeInTheDocument();
    expect(screen.getByText("Direct Service")).toBeInTheDocument();
    expect(screen.getByText("Downtown Center")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    expect(
      screen.getByText("Helped organize community event"),
    ).toBeInTheDocument();
  });

  it("shows days remaining", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    expect(
      screen.getByText(/5 days remaining to validate/),
    ).toBeInTheDocument();
  });

  it("shows resubmission notice when applicable", () => {
    render(
      <ValidationResponseModal
        {...defaultProps}
        item={{ ...mockItem, isResubmission: true }}
      />,
    );
    expect(screen.getByText(/appeal\/resubmission/)).toBeInTheDocument();
  });

  it("calls onApprove when Approve button is clicked", async () => {
    render(<ValidationResponseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => {
      expect(defaultProps.onApprove).toHaveBeenCalledWith("req-123");
    });
  });

  it("switches to reject mode when Reject button is clicked", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Reject"));
    expect(screen.getByText("Reject Validation Request")).toBeInTheDocument();
    expect(screen.getByLabelText(/Rejection Reason/)).toBeInTheDocument();
  });

  it("goes back from reject mode when Back button is clicked", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Reject"));
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Review Validation Request")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    const overlay = screen.getByRole("dialog").parentElement;
    expect(overlay).toBeTruthy();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    render(<ValidationResponseModal {...defaultProps} />);
    const overlay = screen.getByRole("dialog").parentElement;
    expect(overlay).toBeTruthy();
    if (!overlay) {
      throw new Error("Overlay element not found");
    }
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
