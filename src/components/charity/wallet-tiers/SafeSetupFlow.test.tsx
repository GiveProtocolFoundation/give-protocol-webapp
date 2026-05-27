import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useWeb3 } from "@/contexts/Web3Context";

// Mock useCharityWallets
const mockAddVerifiedWallet = jest.fn();

jest.mock("@/hooks/useCharityWallets", () => ({
  useCharityWallets: jest.fn(() => ({
    wallets: [],
    loading: false,
    error: null,
    fetchWallets: jest.fn(),
    fetchPrimaryWallet: jest.fn(),
    addVerifiedWallet: mockAddVerifiedWallet,
    addInstitutionalWallet: jest.fn(),
    setPrimary: jest.fn(),
    deleteWallet: jest.fn(),
  })),
}));

import { SafeSetupFlow } from "./SafeSetupFlow";

const mockOnBack = jest.fn();
const mockOnComplete = jest.fn();
const CHARITY_ID = "charity-profile-001";

describe("SafeSetupFlow", () => {
  beforeEach(() => {
    mockAddVerifiedWallet.mockReset();
    mockOnBack.mockReset();
    mockOnComplete.mockReset();
    (useWeb3 as jest.Mock).mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: 8453,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });
  });

  it("renders step 1 with two source options", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    expect(
      screen.getByText("Set up a Safe multisig wallet"),
    ).toBeInTheDocument();
    expect(screen.getByText("Create a new Safe")).toBeInTheDocument();
    expect(screen.getByText("I already have a Safe")).toBeInTheDocument();
  });

  it("links to app.safe.global for creating a new Safe", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const link = screen.getByText("Create a new Safe").closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://app.safe.global/new-safe/create",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("navigates to step 2 when I already have a Safe is clicked", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    expect(screen.getByText("Verify Safe ownership")).toBeInTheDocument();
    expect(screen.getByLabelText("Network")).toBeInTheDocument();
    expect(screen.getByLabelText("Safe address")).toBeInTheDocument();
  });

  it("calls onBack when Back button is clicked", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("Back"));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("shows connect button when wallet not connected", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    expect(
      screen.getByText("Connect signer wallet"),
    ).toBeInTheDocument();
  });

  it("shows connected address when wallet is connected", () => {
    (useWeb3 as jest.Mock).mockReturnValue({
      provider: {},
      signer: { signMessage: jest.fn() },
      address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
      chainId: 8453,
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });

    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    expect(screen.getByText(/0xABCD/)).toBeInTheDocument();
  });

  it("disables verify button when address is empty", () => {
    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    const verifyBtn = screen.getByText("Sign to verify control");
    expect(verifyBtn.closest("button")).toBeDisabled();
  });

  it("shows error for invalid address format", async () => {
    (useWeb3 as jest.Mock).mockReturnValue({
      provider: {},
      signer: { signMessage: jest.fn() },
      address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
      chainId: 8453,
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });

    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    fireEvent.change(screen.getByLabelText("Safe address"), {
      target: { value: "not-valid" },
    });
    fireEvent.click(screen.getByText("Sign to verify control"));

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid Ethereum address/),
      ).toBeInTheDocument();
    });
  });

  it("calls addVerifiedWallet with safe type on successful sign", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");
    const mockWallet = {
      id: "new-wallet",
      wallet_type: "safe",
      wallet_address: "0x1234567890123456789012345678901234567890",
    };
    mockAddVerifiedWallet.mockResolvedValue(mockWallet);

    (useWeb3 as jest.Mock).mockReturnValue({
      provider: {},
      signer: { signMessage: mockSignMessage },
      address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
      chainId: 8453,
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });

    render(
      <SafeSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I already have a Safe"));
    fireEvent.change(screen.getByLabelText("Safe address"), {
      target: { value: "0x1234567890123456789012345678901234567890" },
    });
    fireEvent.click(screen.getByText("Sign to verify control"));

    await waitFor(() => {
      expect(mockAddVerifiedWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          charity_profile_id: CHARITY_ID,
          wallet_address: "0x1234567890123456789012345678901234567890",
          wallet_type: "safe",
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockWallet);
    });
  });
});
