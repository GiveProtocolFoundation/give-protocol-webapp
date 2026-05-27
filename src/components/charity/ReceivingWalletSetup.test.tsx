import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
// Mock useCharityWallets
const mockFetchWallets = jest.fn();
const mockSetPrimary = jest.fn();
const mockDeleteWallet = jest.fn();

jest.mock("@/hooks/useCharityWallets", () => ({
  useCharityWallets: jest.fn(() => ({
    wallets: [],
    loading: false,
    error: null,
    fetchWallets: mockFetchWallets,
    fetchPrimaryWallet: jest.fn(),
    addVerifiedWallet: jest.fn(),
    addInstitutionalWallet: jest.fn(),
    setPrimary: mockSetPrimary,
    deleteWallet: mockDeleteWallet,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useCharityWallets } = require("@/hooks/useCharityWallets");

// Must import AFTER mocks are set up
import { ReceivingWalletSetup } from "./ReceivingWalletSetup";

const CHARITY_ID = "charity-profile-001";

const mockEoaWallet = {
  id: "wallet-001",
  charity_profile_id: CHARITY_ID,
  wallet_address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
  chain_id: 8453,
  wallet_type: "eoa" as const,
  signer_count: null,
  signer_threshold: null,
  custodian_name: null,
  custodian_attestation_doc_url: null,
  proof_of_control_signature: "0xsig",
  proof_of_control_message: "Verify wallet",
  proof_of_control_verified_at: "2026-05-27T00:00:00Z",
  risk_acknowledgment_at: "2026-05-27T00:00:00Z",
  risk_acknowledgment_user_id: "user-001",
  is_primary: true,
  created_at: "2026-05-27T00:00:00Z",
  updated_at: "2026-05-27T00:00:00Z",
};

const mockSafeWallet = {
  ...mockEoaWallet,
  id: "wallet-002",
  wallet_type: "safe" as const,
  signer_count: 3,
  signer_threshold: 2,
  is_primary: false,
  risk_acknowledgment_at: null,
  risk_acknowledgment_user_id: null,
};

describe("ReceivingWalletSetup", () => {
  beforeEach(() => {
    mockFetchWallets.mockReset();
    mockSetPrimary.mockReset();
    mockDeleteWallet.mockReset();
    mockFetchWallets.mockResolvedValue([]);
    useCharityWallets.mockReturnValue({
      wallets: [],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });
  });

  it("renders the chooser when no wallets exist", () => {
    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);

    expect(
      screen.getByText("Set up your receiving wallet"),
    ).toBeInTheDocument();
    expect(screen.getByText("Multisig Safe")).toBeInTheDocument();
    expect(screen.getByText("Institutional Custody")).toBeInTheDocument();
    expect(screen.getByText("Single Signer (EOA)")).toBeInTheDocument();
  });

  it("calls fetchWallets on mount", () => {
    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    expect(mockFetchWallets).toHaveBeenCalledWith(CHARITY_ID);
  });

  it("renders wallet cards when wallets exist", () => {
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet, mockSafeWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);

    expect(screen.getByText("Receiving wallets")).toBeInTheDocument();
    expect(screen.getByText("Single Signer (EOA)")).toBeInTheDocument();
    expect(screen.getByText("Multisig (Safe)")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Signers: 2/3")).toBeInTheDocument();
  });

  it("shows the three path chooser cards with correct labels", () => {
    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(
      screen.getByText(/Multiple signers required for every transaction/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Managed by a qualified custodian/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A standard wallet controlled by one private key/),
    ).toBeInTheDocument();
  });

  it("renders loading skeleton when loading with no wallets", () => {
    useCharityWallets.mockReturnValue({
      wallets: [],
      loading: true,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    const { container } = render(
      <ReceivingWalletSetup charityProfileId={CHARITY_ID} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows error message when error exists", () => {
    useCharityWallets.mockReturnValue({
      wallets: [],
      loading: false,
      error: "Something went wrong",
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows Add another button in wallet list view", () => {
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    expect(screen.getByText("Add another")).toBeInTheDocument();
  });

  it("does not show delete/primary buttons for primary wallet", () => {
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    expect(screen.queryByLabelText("Make primary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Remove wallet")).not.toBeInTheDocument();
  });

  it("shows delete and primary buttons for non-primary wallets", () => {
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet, mockSafeWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    expect(screen.getByLabelText("Make primary")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove wallet")).toBeInTheDocument();
  });

  it("calls setPrimary when Make primary is clicked", async () => {
    mockSetPrimary.mockResolvedValue(true);
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet, mockSafeWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    fireEvent.click(screen.getByLabelText("Make primary"));

    await waitFor(() => {
      expect(mockSetPrimary).toHaveBeenCalledWith("wallet-002");
    });
  });

  it("calls deleteWallet when Remove is clicked", async () => {
    mockDeleteWallet.mockResolvedValue(true);
    useCharityWallets.mockReturnValue({
      wallets: [mockEoaWallet, mockSafeWallet],
      loading: false,
      error: null,
      fetchWallets: mockFetchWallets,
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: jest.fn(),
      setPrimary: mockSetPrimary,
      deleteWallet: mockDeleteWallet,
    });

    render(<ReceivingWalletSetup charityProfileId={CHARITY_ID} />);
    fireEvent.click(screen.getByLabelText("Remove wallet"));

    await waitFor(() => {
      expect(mockDeleteWallet).toHaveBeenCalledWith("wallet-002");
    });
  });
});
