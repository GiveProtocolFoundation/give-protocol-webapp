import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharityProfilePage from "../CharityProfilePage";

// charityProfileService, charityDataService, Card, Button, Skeleton,
// CharityHeroBanner, UnclaimedProfileBanner, OrgDetailsCard, PhotosCard,
// DonateWidget, RequestCharityWidget, and DonationModal are all mocked
// via moduleNameMapper in jest.config.mjs.

import { getCharityProfileByEin } from "@/services/charityProfileService";
import { getCharityRecordByEin } from "@/services/charityDataService";
import type { CharityProfile } from "@/types/charityProfile";
import type { CharityRecord } from "@/services/charityDataService";

const mockGetProfile = jest.mocked(getCharityProfileByEin);
const mockGetRecord = jest.mocked(getCharityRecordByEin);

const mockCharityRecord: CharityRecord = {
  ein: "12-3456789",
  name: "Test Charity Foundation",
  ico: null,
  street: "123 Main St",
  city: "New York",
  state: "NY",
  zip: "10001",
  group_exemption: null,
  subsection: "03",
  affiliation: "3",
  classification: "1",
  ruling: "200601",
  deductibility: "1",
  foundation: "15",
  activity: "000000000",
  organization: "1",
  status: "01",
  ntee_cd: "B20",
  sort_name: "TEST CHARITY FOUNDATION",
  is_on_platform: true,
};

const mockProfile: CharityProfile = {
  id: "profile-1",
  ein: "123456789",
  name: "Test Charity Foundation",
  mission: "Helping communities through education",
  location: "New York, NY",
  website: "https://testcharity.org",
  logo_url: null,
  photo_urls: [],
  ntee_code: "B20",
  founded: "2006",
  irs_status: "active",
  employees: 50,
  status: "verified",
  nominations_count: 10,
  interested_donors_count: 25,
  authorized_signer_name: "Jane Doe",
  authorized_signer_title: "Executive Director",
  authorized_signer_email: "jane@testcharity.org",
  authorized_signer_phone: "555-0100",
  claimed_by: "user-1",
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
  wallet_type: "existing_evm",
  payment_processor: null,
  claimed_at: "2024-01-15T00:00:00Z",
  verified_at: "2024-02-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-03-01T00:00:00Z",
};

const renderWithRoute = (ein = "123456789") =>
  render(
    <MemoryRouter initialEntries={[`/charity/${ein}`]}>
      <Routes>
        <Route path="/charity/:ein" element={<CharityProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("CharityProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetRecord.mockResolvedValue(mockCharityRecord);
  });

  describe("Loading state", () => {
    it("shows skeleton loader while data is loading", () => {
      mockGetProfile.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          }),
      );
      mockGetRecord.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          }),
      );
      renderWithRoute();
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  describe("Not found state", () => {
    it("shows not found message when no profile or record exists", async () => {
      mockGetProfile.mockResolvedValue(null);
      mockGetRecord.mockResolvedValue(null);
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByText(/couldn.t find a charity with this tax ID/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Charity info display", () => {
    it("renders the charity name after loading", async () => {
      renderWithRoute();
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders the Tax ID", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText(/Tax ID 12-3456789/)).toBeInTheDocument();
      });
    });

    it("renders the location", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("New York, NY")).toBeInTheDocument();
      });
    });

    it("renders the hero banner", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId("charity-hero-banner")).toBeInTheDocument();
      });
    });

    it("renders the photos card", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId("photos-card")).toBeInTheDocument();
      });
    });

    it("renders the org details card when charity record exists", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId("org-details-card")).toBeInTheDocument();
      });
    });
  });

  describe("Verified profile", () => {
    it("shows Verified nonprofit status pill for verified profiles", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText(/Verified nonprofit/)).toBeInTheDocument();
      });
    });

    it("renders the donate widget for claimed profiles", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId("donate-widget")).toBeInTheDocument();
      });
    });

    it("does not render unclaimed profile banner for verified profiles", async () => {
      renderWithRoute();
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
      expect(
        screen.queryByTestId("unclaimed-profile-banner"),
      ).not.toBeInTheDocument();
    });

    it("renders the About section with mission text", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("About")).toBeInTheDocument();
      });
    });

    it("renders contact card when email or website is available", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Contact")).toBeInTheDocument();
      });
    });
  });

  describe("Unclaimed profile", () => {
    const unclaimedProfile: CharityProfile = {
      ...mockProfile,
      status: "unclaimed",
      claimed_by: null,
      wallet_address: null,
      claimed_at: null,
      verified_at: null,
    };

    beforeEach(() => {
      mockGetProfile.mockResolvedValue(unclaimedProfile);
    });

    it("shows unclaimed status pill", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByText(/Unclaimed \u2014 public registry data only/u),
        ).toBeInTheDocument();
      });
    });

    it("renders unclaimed profile banner", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByTestId("unclaimed-profile-banner"),
        ).toBeInTheDocument();
      });
    });

    it("renders request charity widget instead of donate widget", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByTestId("request-charity-widget"),
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("donate-widget")).not.toBeInTheDocument();
    });

    it("does not render the donate widget for unclaimed profiles", async () => {
      renderWithRoute();
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.queryByTestId("donate-widget")).not.toBeInTheDocument();
    });
  });

  describe("Claimed-pending profile", () => {
    const claimedPendingProfile: CharityProfile = {
      ...mockProfile,
      status: "claimed-pending",
      verified_at: null,
    };

    it("shows Claimed status pill for claimed-pending profiles", async () => {
      mockGetProfile.mockResolvedValue(claimedPendingProfile);
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Claimed")).toBeInTheDocument();
      });
    });
  });

  describe("Public registry record only (no profile)", () => {
    beforeEach(() => {
      mockGetProfile.mockResolvedValue(null);
    });

    it("renders charity name from registry record when no profile exists", async () => {
      renderWithRoute();
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("derives location from registry record fields", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("New York, NY")).toBeInTheDocument();
      });
    });

    it("renders unclaimed profile banner when only registry record exists", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByTestId("unclaimed-profile-banner"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Registered nonprofit badge", () => {
    it("renders nonprofit badge when subsection is 03", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Registered nonprofit")).toBeInTheDocument();
      });
    });

    it("does not render nonprofit badge when subsection is not 03", async () => {
      const modifiedRecord = { ...mockCharityRecord, subsection: "05" };
      mockGetRecord.mockResolvedValue(modifiedRecord);
      renderWithRoute();
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.queryByText("Registered nonprofit")).not.toBeInTheDocument();
    });
  });

  describe("Registry public record", () => {
    it("renders Registry Public Record section", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Registry Public Record")).toBeInTheDocument();
      });
    });

    it("expands the registry record when clicked", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Registry Public Record")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Registry Public Record"));
      await waitFor(() => {
        expect(
          screen.getByText("Data sourced from official charity registry."),
        ).toBeInTheDocument();
      });
    });

    it("shows Tax ID in expanded registry record", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Registry Public Record")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Registry Public Record"));
      await waitFor(() => {
        expect(screen.getByText("Tax ID")).toBeInTheDocument();
      });
    });

    it("collapses the registry record when clicked again", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Registry Public Record")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Registry Public Record"));
      await waitFor(() => {
        expect(
          screen.getByText("Data sourced from official charity registry."),
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Registry Public Record"));
      await waitFor(() => {
        expect(
          screen.queryByText("Data sourced from official charity registry."),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Share button", () => {
    it("renders the share button", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByLabelText("Share")).toBeInTheDocument();
      });
    });
  });

  describe("Sector category", () => {
    it("renders the sector category tag", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("Education")).toBeInTheDocument();
      });
    });
  });

  describe("About card content", () => {
    it("renders mission text when profile has a mission", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByText("Helping communities through education"),
        ).toBeInTheDocument();
      });
    });

    it("shows fallback text when no description or mission", async () => {
      const noMissionProfile: CharityProfile = {
        ...mockProfile,
        mission: null,
        status: "unclaimed",
        claimed_by: null,
      };
      mockGetProfile.mockResolvedValue(noMissionProfile);
      const noActivityRecord = { ...mockCharityRecord, activity: "000000000" };
      mockGetRecord.mockResolvedValue(noActivityRecord);
      renderWithRoute();
      await waitFor(() => {
        expect(
          screen.getByText(/No description available/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Registration year display", () => {
    it("renders the registration year when available", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText(/Registered \d{4}/)).toBeInTheDocument();
      });
    });
  });

  describe("Tax ID format handling", () => {
    it("passes raw tax ID to service functions without stripping hyphens", async () => {
      const hyphenatedEin = "99-1230001";
      render(
        <MemoryRouter initialEntries={[`/charity/${hyphenatedEin}`]}>
          <Routes>
            <Route path="/charity/:ein" element={<CharityProfilePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith("99-1230001");
        expect(mockGetRecord).toHaveBeenCalledWith("99-1230001");
      });
    });

    it("loads the profile for a tax ID stored with hyphens", async () => {
      const hyphenatedEin = "99-1230001";
      render(
        <MemoryRouter initialEntries={[`/charity/${hyphenatedEin}`]}>
          <Routes>
            <Route path="/charity/:ein" element={<CharityProfilePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        const matches = screen.getAllByText("Test Charity Foundation");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
      expect(
        screen.queryByText(/couldn.t find a charity with this tax ID/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Logo avatar", () => {
    it("renders logo image when logo_url is provided", async () => {
      const profileWithLogo: CharityProfile = {
        ...mockProfile,
        logo_url: "https://example.com/logo.png",
      };
      mockGetProfile.mockResolvedValue(profileWithLogo);
      renderWithRoute();
      await waitFor(() => {
        const logo = screen.getByAltText("Test Charity Foundation logo");
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
      });
    });

    it("renders initials avatar when logo_url is null", async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText("TC")).toBeInTheDocument();
      });
    });
  });
});
