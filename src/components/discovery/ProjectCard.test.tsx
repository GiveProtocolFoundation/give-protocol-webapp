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
  registry_source: "IRS_BMF",
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

  it("names the registry the record came from (GIV-986)", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.getByText("IRS-registered")).toBeInTheDocument();
  });

  it("does not claim IRS registration for non-IRS records", () => {
    const mxOrg = {
      ...BASE_ORG,
      ein: "MX-0001",
      registry_source: "SAT_MX",
      country: "MX",
    } as CharityOrganization;
    render(
      <MemoryRouter>
        <ProjectCard organization={mxOrg} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/IRS/)).not.toBeInTheDocument();
    expect(screen.getByText("SAT MX-registered")).toBeInTheDocument();
    expect(screen.getByText("Registry ID: MX-0001")).toBeInTheDocument();
    expect(screen.queryByText(/Tax ID/)).not.toBeInTheDocument();
  });

  it("shows no registry badge when the registry is unknown", () => {
    const unknownOrg = { ...BASE_ORG, registry_source: null };
    render(
      <MemoryRouter>
        <ProjectCard organization={unknownOrg} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/registered/)).not.toBeInTheDocument();
  });

  it("shows an On Platform pill only for on-platform organizations", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ProjectCard organization={BASE_ORG} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("On Platform")).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <ProjectCard organization={{ ...BASE_ORG, is_on_platform: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("On Platform")).toBeInTheDocument();
  });

  it("shows the translated sector category from the NTEE code", () => {
    render(
      <MemoryRouter>
        <ProjectCard organization={{ ...BASE_ORG, ntee_cd: "B20" }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Education")).toBeInTheDocument();
  });
});
