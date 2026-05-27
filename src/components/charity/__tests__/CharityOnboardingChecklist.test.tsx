import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CharityOnboardingChecklist } from "../CharityOnboardingChecklist";
import { supabase } from "@/lib/supabase";
import { getDesignationState } from "@/services/walletDesignationService";

// Override the moduleNameMapper supabase mock with a testable jest.fn()
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// getDesignationState is mocked via moduleNameMapper → walletDesignationServiceMock.js
const mockGetDesignationState = getDesignationState as unknown as jest.Mock;

// Typed reference to the from mock for per-test control
interface MockResult {
  data: Record<string, unknown> | null;
  error: null;
}

interface MockChain {
  select: ReturnType<typeof jest.fn>;
  update: ReturnType<typeof jest.fn>;
  eq: ReturnType<typeof jest.fn>;
  single: ReturnType<typeof jest.fn>;
}

interface MockFromFn {
  mockImplementation: (impl: (table: string) => MockChain) => void;
  mock: { calls: string[][] };
}

const fromMock = supabase.from as unknown as MockFromFn;

function makeChain(result: MockResult): MockChain {
  const chain: MockChain = {
    select: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(() => Promise.resolve(result)),
  };
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

const PROFILE_ID = "test-profile-123";
const DEFAULT_RESULT: MockResult = { data: null, error: null };

describe("CharityOnboardingChecklist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fromMock.mockImplementation(() => makeChain(DEFAULT_RESULT));
    mockGetDesignationState.mockResolvedValue(null);
  });

  const renderChecklist = (
    props: {
      onNavigateTab?: (tab: string) => void;
      walletAddress?: string | null;
      logoUrl?: string | null;
      bannerImageUrl?: string | null;
    } = {},
  ) => render(<CharityOnboardingChecklist profileId={PROFILE_ID} {...props} />);

  it("renders the Getting Started heading after data loads", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });
  });

  it("renders all 5 checklist item labels", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(
        screen.getByText("Complete organization profile"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Upload logo or banner image"),
      ).toBeInTheDocument();
      expect(screen.getByText("Set up receiving wallet")).toBeInTheDocument();
      expect(
        screen.getByText("Set up bank details for fiat off-ramp"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Review and accept terms of service"),
      ).toBeInTheDocument();
    });
  });

  it("shows 0 of 5 steps complete by default", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("0 of 5 steps complete")).toBeInTheDocument();
    });
  });

  it("does not render when dismissed flag is set in persisted data", async () => {
    fromMock.mockImplementation(() =>
      makeChain({
        data: {
          meta: {
            onboarding_checklist: { dismissed: true, completedItems: [] },
          },
        },
        error: null,
      }),
    );
    renderChecklist();
    await waitFor(() => {
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
    });
  });

  it("shows correct completion count from persisted completed items", async () => {
    fromMock.mockImplementation(() =>
      makeChain({
        data: {
          meta: {
            onboarding_checklist: {
              dismissed: false,
              completedItems: ["complete_profile", "upload_logo"],
            },
          },
        },
        error: null,
      }),
    );
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("2 of 5 steps complete")).toBeInTheDocument();
    });
  });

  it("auto-marks connect_wallet complete when designation status is 'active'", async () => {
    mockGetDesignationState.mockResolvedValue({
      status: "active",
      walletAddress: "0xAbCd1234567890AbCd1234567890AbCd12345678",
      walletKind: "eoa",
      designatedAt: "2026-05-17T12:00:00Z",
    });
    renderChecklist();
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /uncheck set up receiving wallet/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("does not auto-mark connect_wallet complete when designation status is 'pending_email_confirmation'", async () => {
    mockGetDesignationState.mockResolvedValue({
      status: "pending_email_confirmation",
      walletAddress: null,
      walletKind: "eoa",
      designatedAt: null,
    });
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("0 of 5 steps complete")).toBeInTheDocument();
    });
  });

  it("does not auto-mark connect_wallet complete when designation status is 'unset'", async () => {
    mockGetDesignationState.mockResolvedValue({
      status: "unset",
      walletAddress: null,
      walletKind: null,
      designatedAt: null,
    });
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("0 of 5 steps complete")).toBeInTheDocument();
    });
  });

  it("collapses the list when collapse button is clicked", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(
        screen.getByText("Complete organization profile"),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /collapse checklist/i }),
    );
    expect(
      screen.queryByText("Complete organization profile"),
    ).not.toBeInTheDocument();
  });

  it("expands the list after collapse when expand button is clicked", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /collapse checklist/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /expand checklist/i }));
    expect(
      screen.getByText("Complete organization profile"),
    ).toBeInTheDocument();
  });

  it("shows dismiss button when all items are complete", async () => {
    fromMock.mockImplementation(() =>
      makeChain({
        data: {
          meta: {
            onboarding_checklist: {
              dismissed: false,
              completedItems: [
                "complete_profile",
                "upload_logo",
                "connect_wallet",
                "bank_details",
                "accept_terms",
              ],
            },
          },
        },
        error: null,
      }),
    );
    renderChecklist();
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /dismiss onboarding checklist/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("does not show dismiss button when checklist is not fully complete", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /dismiss onboarding checklist/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onNavigateTab with the tab id when action button is clicked", async () => {
    const mockNavigate = jest.fn();
    renderChecklist({ onNavigateTab: mockNavigate });
    await waitFor(() => {
      expect(screen.getAllByText("Go to Organization").length).toBeGreaterThan(
        0,
      );
    });
    fireEvent.click(screen.getAllByText("Go to Organization")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("organization");
  });

  it("calls Supabase from when toggling a checklist item", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(
        screen.getByText("Complete organization profile"),
      ).toBeInTheDocument();
    });
    const callsBefore = fromMock.mock.calls.length;
    fireEvent.click(
      screen.getByRole("button", {
        name: /check complete organization profile/i,
      }),
    );
    await waitFor(() => {
      expect(fromMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it("auto-marks upload_logo complete when logoUrl prop is provided", async () => {
    renderChecklist({ logoUrl: "https://example.com/logo.png" });
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /uncheck upload logo or banner image/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("auto-marks upload_logo complete when bannerImageUrl prop is provided", async () => {
    renderChecklist({ bannerImageUrl: "https://example.com/banner.png" });
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /uncheck upload logo or banner image/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("does not auto-mark upload_logo complete when neither logoUrl nor bannerImageUrl is provided", async () => {
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText("0 of 5 steps complete")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", {
        name: /uncheck upload logo or banner image/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("counts upload_logo in completion total when logoUrl is provided", async () => {
    renderChecklist({ logoUrl: "https://example.com/logo.png" });
    await waitFor(() => {
      expect(screen.getByText("1 of 5 steps complete")).toBeInTheDocument();
    });
  });
});
