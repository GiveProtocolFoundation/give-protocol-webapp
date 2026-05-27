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

import { SingleSignerFlow } from "./SingleSignerFlow";

const mockOnBack = jest.fn();
const mockOnComplete = jest.fn();
const CHARITY_ID = "charity-profile-001";

describe("SingleSignerFlow", () => {
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

  // Step 1: Risk acknowledgment
  it("shows risk acknowledgment modal as first step", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    expect(
      screen.getByText("Single-signer wallet: important risks"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/controlled by one private key/),
    ).toBeInTheDocument();
  });

  it("shows both risk action buttons", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    expect(
      screen.getByText("Use a multisig instead"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("I understand, proceed"),
    ).toBeInTheDocument();
  });

  it("calls onBack when Use a multisig instead is clicked", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("Use a multisig instead"));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("navigates to sign step when I understand is clicked", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    expect(screen.getByText("Connect and sign")).toBeInTheDocument();
  });

  // Step 2: Connect + sign
  it("shows connect button when wallet not connected on step 2", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
  });

  it("disables sign button when wallet is not connected", () => {
    render(
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    const signBtn = screen.getByText("Sign verification message");
    expect(signBtn.closest("button")).toBeDisabled();
  });

  it("shows connected address on step 2 when wallet is connected", () => {
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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    expect(screen.getByText(/0xABCD/)).toBeInTheDocument();
  });

  // Step 3: Confirm + register
  it("navigates to confirm step after signing", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");

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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    fireEvent.click(screen.getByText("Sign verification message"));

    await waitFor(() => {
      expect(screen.getByText("Final confirmation")).toBeInTheDocument();
    });
  });

  it("requires both checkboxes for register button", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");

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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    fireEvent.click(screen.getByText("Sign verification message"));

    await waitFor(() => {
      expect(screen.getByText("Final confirmation")).toBeInTheDocument();
    });

    const registerBtn = screen.getByText("Register wallet");
    expect(registerBtn.closest("button")).toBeDisabled();

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(registerBtn.closest("button")).toBeDisabled();

    fireEvent.click(checkboxes[1]);
    expect(registerBtn.closest("button")).not.toBeDisabled();
  });

  it("shows both checkbox labels with risk and authorization text", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");

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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    fireEvent.click(screen.getByText("Sign verification message"));

    await waitFor(() => {
      expect(
        screen.getByText(
          /single-signer wallet carries higher risk/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /authorized by my organization/,
        ),
      ).toBeInTheDocument();
    });
  });

  it("calls addVerifiedWallet with eoa type on register", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");
    const mockWallet = {
      id: "new-wallet",
      wallet_type: "eoa",
      wallet_address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    fireEvent.click(screen.getByText("Sign verification message"));

    await waitFor(() => {
      expect(screen.getByText("Final confirmation")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText("Register wallet"));

    await waitFor(() => {
      expect(mockAddVerifiedWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          charity_profile_id: CHARITY_ID,
          wallet_type: "eoa",
          wallet_address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockWallet);
    });
  });

  it("shows wallet address on confirm step", async () => {
    const mockSignMessage = jest.fn();
    mockSignMessage.mockResolvedValue("0xsignature123");

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
      <SingleSignerFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("I understand, proceed"));
    fireEvent.click(screen.getByText("Sign verification message"));

    await waitFor(() => {
      expect(
        screen.getByText("0xABCDEF1234567890abcdef1234567890ABCDEF12"),
      ).toBeInTheDocument();
    });
  });
});
