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

  it("renders Donate link with action param", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    const donateLink = screen.getByText("Donate").closest("a");
    expect(donateLink).toHaveAttribute(
      "href",
      "/charity/12-3456789?action=donate",
    );
  });

  it("shows Verified badge when on platform", () => {
    const onPlatformOrg = { ...BASE_ORG, is_on_platform: true };
    render(
      <MemoryRouter>
        <ProjectCard organization={onPlatformOrg} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("does not show Verified badge when not on platform", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });
});
