import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { RequestCharityWidget } from "./RequestCharityWidget";

jest.mock("@/services/charityDataService", () => ({
  submitCharityRequest: jest.fn().mockResolvedValue(true),
  hasUserRequestedCharity: jest.fn().mockResolvedValue(false),
}));

describe("RequestCharityWidget", () => {
  it("explains the claim + wallet setup gate without blaming verification", () => {
    render(<RequestCharityWidget ein="991230003" charityName="Green Earth" />);

    expect(
      screen.getByText(
        "This organization has not yet claimed their profile on Give Protocol. Donations become available once the organization claims its profile and completes wallet setup.",
      ),
    ).toBeInTheDocument();
  });

  it("no longer renders the contradictory 'until the charity is verified' copy (GIV-986)", () => {
    render(<RequestCharityWidget ein="991230003" charityName="Green Earth" />);

    expect(
      screen.queryByText(/until the charity is verified/i),
    ).not.toBeInTheDocument();
  });

  it("still renders the interest CTA paragraph and request button", () => {
    render(<RequestCharityWidget ein="991230003" charityName="Green Earth" />);

    expect(
      screen.getByText(
        "Let us know you're interested and we'll reach out to them on your behalf.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request this charity/i }),
    ).toBeInTheDocument();
  });
});
