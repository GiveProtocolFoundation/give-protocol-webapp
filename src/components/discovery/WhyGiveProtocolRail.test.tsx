import { render, screen } from "@testing-library/react";
import { WhyGiveProtocolRail } from "./WhyGiveProtocolRail";

describe("WhyGiveProtocolRail", () => {
  it("renders the heading", () => {
    render(<WhyGiveProtocolRail />);
    expect(screen.getByText("Why Give Protocol")).toBeInTheDocument();
  });

  it("renders three explainer items", () => {
    render(<WhyGiveProtocolRail />);
    expect(screen.getByText("Verified nonprofits")).toBeInTheDocument();
    expect(screen.getByText("On-chain transparency")).toBeInTheDocument();
    expect(screen.getByText("Give time, not just money")).toBeInTheDocument();
  });

  it("renders body text for each item", () => {
    render(<WhyGiveProtocolRail />);
    expect(
      screen.getByText(/Every organization is matched/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Donations are recorded on the blockchain/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Volunteer hours are verified/),
    ).toBeInTheDocument();
  });
});
