import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { useCharityWallets } from "@/hooks/useCharityWallets";
import { InstitutionalSetupFlow } from "./InstitutionalSetupFlow";

// useCharityWallets is mocked globally via moduleNameMapper → useCharityWalletsMock.js
const mockedUseCharityWallets = jest.mocked(useCharityWallets);
const mockAddInstitutionalWallet = jest.fn();

const mockOnBack = jest.fn();
const mockOnComplete = jest.fn();
const CHARITY_ID = "charity-profile-001";

describe("InstitutionalSetupFlow", () => {
  beforeEach(() => {
    mockAddInstitutionalWallet.mockReset();
    mockOnBack.mockReset();
    mockOnComplete.mockReset();
    mockedUseCharityWallets.mockReturnValue({
      wallets: [],
      loading: false,
      error: null,
      fetchWallets: jest.fn(),
      fetchPrimaryWallet: jest.fn(),
      addVerifiedWallet: jest.fn(),
      addInstitutionalWallet: mockAddInstitutionalWallet,
      setPrimary: jest.fn(),
      deleteWallet: jest.fn(),
    });
  });

  it("renders the form with all required fields", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    expect(
      screen.getByText("Register an institutional custody wallet"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Network")).toBeInTheDocument();
    expect(screen.getByLabelText("Wallet address")).toBeInTheDocument();
    expect(screen.getByLabelText("Custodian")).toBeInTheDocument();
    expect(screen.getByText("Attestation document")).toBeInTheDocument();
  });

  it("calls onBack when Back button is clicked", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByText("Back"));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("renders custodian dropdown with all options", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    expect(screen.getByText("Select custodian...")).toBeInTheDocument();
    expect(screen.getByText("Fireblocks")).toBeInTheDocument();
    expect(screen.getByText("Anchorage")).toBeInTheDocument();
    expect(screen.getByText("Coinbase Prime")).toBeInTheDocument();
    expect(screen.getByText("BitGo")).toBeInTheDocument();
  });

  it("disables submit when fields are empty", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const submitBtn = screen.getByText("Submit for review");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  it("shows file name after upload", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const file = new File(["test content"], "attestation.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByLabelText("Upload attestation file");
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("attestation.pdf")).toBeInTheDocument();
  });

  it("removes file when remove button is clicked", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const file = new File(["test content"], "attestation.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByLabelText("Upload attestation file");
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("attestation.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove file"));

    expect(screen.queryByText("attestation.pdf")).not.toBeInTheDocument();
  });

  it("rejects unsupported file types", () => {
    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const csvFile = new File(["data"], "data.csv", { type: "text/csv" });

    const fileInput = screen.getByLabelText("Upload attestation file");
    fireEvent.change(fileInput, { target: { files: [csvFile] } });

    expect(
      screen.getByText(/Please upload a PDF, JPEG, or PNG file/),
    ).toBeInTheDocument();
  });

  it("shows error for invalid address format on submit", async () => {
    const file = new File(["test"], "attestation.pdf", {
      type: "application/pdf",
    });

    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Wallet address"), {
      target: { value: "invalid-address" },
    });
    fireEvent.change(screen.getByLabelText("Custodian"), {
      target: { value: "Fireblocks" },
    });
    const fileInput = screen.getByLabelText("Upload attestation file");
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.submit(
      screen.getByText("Submit for review").closest("form") as HTMLFormElement,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid Ethereum address/),
      ).toBeInTheDocument();
    });
  });

  it("calls addInstitutionalWallet on valid submission", async () => {
    const mockWallet = {
      id: "new-wallet",
      wallet_type: "institutional",
      custodian_name: "Fireblocks",
    };
    mockAddInstitutionalWallet.mockResolvedValue(mockWallet);

    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const file = new File(["test"], "attestation.pdf", {
      type: "application/pdf",
    });

    await act(() => {
      fireEvent.change(screen.getByLabelText("Wallet address"), {
        target: { value: "0x1234567890123456789012345678901234567890" },
      });
      fireEvent.change(screen.getByLabelText("Custodian"), {
        target: { value: "Fireblocks" },
      });
      const fileInput = screen.getByLabelText("Upload attestation file");
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(() => {
      fireEvent.submit(
        screen
          .getByText("Submit for review")
          .closest("form") as HTMLFormElement,
      );
    });

    await waitFor(() => {
      expect(mockAddInstitutionalWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          charity_profile_id: CHARITY_ID,
          wallet_address: "0x1234567890123456789012345678901234567890",
          custodian_name: "Fireblocks",
        }),
      );
    });
  });

  it("shows confirmation screen after successful submission", async () => {
    const mockWallet = {
      id: "new-wallet",
      wallet_type: "institutional",
    };
    mockAddInstitutionalWallet.mockResolvedValue(mockWallet);

    render(
      <InstitutionalSetupFlow
        charityProfileId={CHARITY_ID}
        onBack={mockOnBack}
        onComplete={mockOnComplete}
      />,
    );

    const file = new File(["test"], "attestation.pdf", {
      type: "application/pdf",
    });

    await act(() => {
      fireEvent.change(screen.getByLabelText("Wallet address"), {
        target: { value: "0x1234567890123456789012345678901234567890" },
      });
      fireEvent.change(screen.getByLabelText("Custodian"), {
        target: { value: "Fireblocks" },
      });
      const fileInput = screen.getByLabelText("Upload attestation file");
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(() => {
      fireEvent.submit(
        screen
          .getByText("Submit for review")
          .closest("form") as HTMLFormElement,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Wallet submitted for review"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/email within 3 business days/),
      ).toBeInTheDocument();
    });
  });
});
