import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharityProfilePage from "./CharityProfilePage";
import { getCharityProfileByEin } from "@/services/charityProfileService";
import { getCharityRecordByEin } from "@/services/charityDataService";
import type { CharityProfile } from "@/types/charityProfile";
import type { CharityRecord } from "@/services/charityDataService";

jest.mock("@/services/charityProfileService", () => ({
  getCharityProfileByEin: jest.fn(),
}));

jest.mock("@/services/charityDataService", () => ({
  getCharityRecordByEin: jest.fn(),
  submitCharityRequest: jest.fn().mockResolvedValue(true),
  hasUserRequestedCharity: jest.fn().mockResolvedValue(false),
}));

const mockGetProfile = getCharityProfileByEin as jest.MockedFunction<
  typeof getCharityProfileByEin
>;
const mockGetRecord = getCharityRecordByEin as jest.MockedFunction<
  typeof getCharityRecordByEin
>;

const EIN = "99-1230003";

function makeProfile(overrides?: Partial<CharityProfile>): CharityProfile {
  return {
    id: "5eed0003-0000-0000-0000-000000000003",
    ein: EIN,
    name: "Green Earth Conservation Network",
    mission: null,
    location: "Portland, OR",
    website: null,
    logo_url: null,
    photo_urls: [],
    ntee_code: "C30",
    founded: "2001",
    irs_status: "Active",
    employees: 19,
    status: "verified",
    nominations_count: 445,
    interested_donors_count: 2103,
    authorized_signer_name: null,
    authorized_signer_title: null,
    authorized_signer_email: null,
    authorized_signer_phone: null,
    public_contact_email: null,
    public_contact_phone: null,
    claimed_by: null,
    wallet_address: null,
    wallet_type: null,
    wallet_designation_status: "unset",
    payment_processor: null,
    claimed_at: null,
    verified_at: "2024-01-25T16:00:00Z",
    created_at: "2024-01-05T06:00:00Z",
    updated_at: "2024-01-05T06:00:00Z",
    banner_image_url: null,
    photo_1_url: null,
    photo_2_url: null,
    description: null,
    mission_statement: null,
    contact_email: null,
    claimed_by_user_id: null,
    ...overrides,
  };
}

const record: CharityRecord = {
  ein: EIN,
  name: "Green Earth Conservation Network",
  ico: null,
  street: null,
  city: "Portland",
  state: "OR",
  zip: "97201",
  group_exemption: null,
  subsection: "03",
  affiliation: null,
  classification: null,
  ruling: "200101",
  deductibility: "1",
  foundation: "15",
  activity: "000000000",
  organization: null,
  status: null,
  ntee_cd: "C30",
  sort_name: null,
  is_on_platform: true,
};

function renderPage(ein = EIN) {
  return render(
    <MemoryRouter initialEntries={[`/charity/${ein}`]}>
      <Routes>
        <Route path="/charity/:ein" element={<CharityProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CharityProfilePage — verified-but-unclaimed charity (GIV-986)", () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    mockGetRecord.mockReset();
    mockGetRecord.mockResolvedValue(record);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the IRS-verified pill, not the donation-ready Verified pill", async () => {
    mockGetProfile.mockResolvedValue(makeProfile());

    renderPage();

    expect(
      await screen.findByText("IRS-verified nonprofit"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Verified nonprofit")).not.toBeInTheDocument();
  });

  it("routes to the request widget + claim banner, not the donate widget", async () => {
    mockGetProfile.mockResolvedValue(makeProfile());

    renderPage();

    expect(
      await screen.findByTestId("request-charity-widget"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("donate-widget")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("unclaimed-profile-banner"),
    ).toBeInTheDocument();
  });
});

describe("CharityProfilePage — claimed charity", () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    mockGetRecord.mockReset();
    mockGetRecord.mockResolvedValue(record);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the Verified nonprofit pill and donate widget when claimed", async () => {
    mockGetProfile.mockResolvedValue(
      makeProfile({
        claimed_by: "user-1",
        claimed_by_user_id: "user-1",
      }),
    );

    renderPage();

    expect(await screen.findByText("Verified nonprofit")).toBeInTheDocument();
    expect(
      screen.queryByText("IRS-verified nonprofit"),
    ).not.toBeInTheDocument();
    expect(await screen.findByTestId("donate-widget")).toBeInTheDocument();
    expect(
      screen.queryByTestId("request-charity-widget"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("unclaimed-profile-banner"),
    ).not.toBeInTheDocument();
  });
});

describe("CharityProfilePage — status=unclaimed charity", () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    mockGetRecord.mockReset();
    mockGetRecord.mockResolvedValue(record);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the unclaimed registry pill and request widget", async () => {
    mockGetProfile.mockResolvedValue(makeProfile({ status: "unclaimed" }));

    renderPage();

    expect(
      await screen.findByText("Unclaimed — public registry data only"),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId("request-charity-widget"),
    ).toBeInTheDocument();
  });
});
