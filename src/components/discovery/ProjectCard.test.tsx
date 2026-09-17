import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCard } from "./ProjectCard";
import type { CharityOrganization } from "@/types/charityOrganization";

const BASE_ORG: CharityOrganization = {
  ein: "12-3456789",
  name: "Test Charity Foundation",
  city: "San Francisco",
  state: "CA",
  zip: "94105",
  is_on_platform: false,
} as CharityOrganization;

describe("ProjectCard", () => {
  it("renders the organization name as a link", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    const link = screen.getByText("Test Charity Foundation");
    expect(link.closest("a")).toHaveAttribute("href", "/charity/12-3456789");
  });

  it("renders the Tax ID", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Tax ID: 12-3456789")).toBeInTheDocument();
  });

  it("renders the location", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.getByText("San Francisco, CA, 94105")).toBeInTheDocument();
  });

  it("renders Donate link with action param for claimed charities (GIV-1012)", () => {
    const claimedOrg = { ...BASE_ORG, is_claimed: true };
    render(
      <MemoryRouter>
        <ProjectCard organization={claimedOrg} />
      </MemoryRouter>,
    );
    const donateLink = screen.getByText("Donate").closest("a");
    expect(donateLink).toHaveAttribute(
      "href",
      "/charity/12-3456789?action=donate",
    );
    expect(donateLink?.className).toContain("bg-emerald-600");
    expect(screen.queryByText("View profile")).not.toBeInTheDocument();
  });

  it("renders View profile link instead of Donate for unclaimed charities (GIV-1012)", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    const viewLink = screen.getByText("View profile").closest("a");
    expect(viewLink).toHaveAttribute("href", "/charity/12-3456789");
    expect(screen.queryByText("Donate")).not.toBeInTheDocument();
  });

  it("de-emphasizes the View profile CTA for unclaimed charities (GIV-1012)", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    const viewLink = screen.getByText("View profile").closest("a");
    expect(viewLink?.className).not.toContain("bg-emerald-600");
    expect(viewLink?.className).toContain("border");
  });

  it("shows IRS-verified badge when on platform (GIV-986)", () => {
    const onPlatformOrg = { ...BASE_ORG, is_on_platform: true };
    render(
      <MemoryRouter>
        <ProjectCard organization={onPlatformOrg} />
      </MemoryRouter>,
    );
    expect(screen.getByText("IRS-verified")).toBeInTheDocument();
  });

  it("does not show IRS-verified badge when not on platform", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("IRS-verified")).not.toBeInTheDocument();
  });
});
