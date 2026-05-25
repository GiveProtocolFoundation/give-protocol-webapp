import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { VolunteerVerificationCard } from "./VolunteerVerificationCard";

const FULL_VERIFICATION = {
  id: "v-1",
  applicantName: "Jane Doe",
  opportunityTitle: "Beach Cleanup",
  charityName: "Ocean Alliance",
  acceptanceHash: "0xabc123",
  verificationHash: "0xdef456",
  acceptedAt: "2026-01-15T10:00:00Z",
  verifiedAt: "2026-01-20T14:00:00Z",
  blockchainReference: {
    network: "moonbase",
    transactionId: "0x1234567890abcdef1234567890abcdef",
    blockNumber: 42,
  },
};

describe("VolunteerVerificationCard", () => {
  it("should render verification title", () => {
    render(<VolunteerVerificationCard verification={{ id: "v-1" }} />);
    expect(
      screen.getByText("Volunteer Contribution Verification"),
    ).toBeTruthy();
  });

  it("should render applicant name when provided", () => {
    render(<VolunteerVerificationCard verification={FULL_VERIFICATION} />);
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("should render opportunity title when provided", () => {
    render(<VolunteerVerificationCard verification={FULL_VERIFICATION} />);
    expect(screen.getByText("Beach Cleanup")).toBeTruthy();
  });

  it("should render charity name when provided", () => {
    render(<VolunteerVerificationCard verification={FULL_VERIFICATION} />);
    expect(screen.getByText("Ocean Alliance")).toBeTruthy();
  });

  it("should render verification hashes", () => {
    render(<VolunteerVerificationCard verification={FULL_VERIFICATION} />);
    expect(screen.getByText("0xabc123")).toBeTruthy();
    expect(screen.getByText("0xdef456")).toBeTruthy();
  });

  it("should render blockchain reference with explorer link", () => {
    render(<VolunteerVerificationCard verification={FULL_VERIFICATION} />);
    expect(screen.getByText("Blockchain Reference")).toBeTruthy();
    const link = screen.getByText("0x12345678...").closest("a");
    expect(link?.getAttribute("href")).toContain("moonbase.moonscan.io");
  });

  it("should not render optional fields when missing", () => {
    render(<VolunteerVerificationCard verification={{ id: "v-2" }} />);
    expect(screen.queryByText("Volunteer")).toBeNull();
    expect(screen.queryByText("Opportunity")).toBeNull();
    expect(screen.queryByText("Organization")).toBeNull();
  });
});
