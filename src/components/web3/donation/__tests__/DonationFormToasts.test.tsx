/**
 * GIV-300: Toast call site tests for DonationForm (crypto donation path)
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DonationForm } from "../DonationForm";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDonation } from "@/hooks/web3/useDonation";
import { useTokenBalance } from "@/hooks/web3/useTokenBalance";
import { useToast } from "@/contexts/ToastContext";

// Web3Context, ToastContext, useDonation, useTokenBalance mocked via moduleNameMapper
jest.mock("@/config/tokens", () => ({
  getERC20TokensForChain: jest.fn(() => [
    {
      symbol: "USDC",
      address: "0xTokenAddress",
      decimals: 6,
      name: "USD Coin",
    },
  ]),
}));
jest.mock("@/config/contracts", () => ({
  CHAIN_IDS: { BASE: 8453, MOONBASE: 1287 },
  getContractAddress: jest.fn(() => "0xDonationContract"),
}));

const mockUseWeb3 = jest.mocked(useWeb3);
const mockUseDonation = jest.mocked(useDonation);
const mockUseTokenBalance = jest.mocked(useTokenBalance);
const mockUseToast = jest.mocked(useToast);

let mockShowToast: jest.Mock;
let mockDismissToast: jest.Mock;
let mockDonate: jest.Mock;

const defaultWeb3 = {
  isConnected: true,
  connect: jest.fn(),
  chainId: 8453,
  address: "0xDonorAddress",
  provider: null,
  signer: null,
  isConnecting: false,
  error: null,
  disconnect: jest.fn(),
  switchChain: jest.fn(),
} as ReturnType<typeof useWeb3>;

beforeEach(() => {
  mockShowToast = jest.fn(() => "mock-toast-id");
  mockDismissToast = jest.fn();
  mockUseToast.mockReturnValue({
    showToast: mockShowToast,
    dismissToast: mockDismissToast,
  });
  mockUseWeb3.mockReturnValue(defaultWeb3);
  mockDonate = jest.fn().mockResolvedValue(undefined);
  mockUseDonation.mockReturnValue({
    donate: mockDonate,
    withdraw: jest.fn(),
    loading: false,
    approving: false,
    error: null,
  });
  mockUseTokenBalance.mockReturnValue({ balance: 100, isLoading: false });
});

describe("DonationForm GIV-300 toast call sites", () => {
  it("shows persistent Transaction submitted toast on submit then dismisses and shows confirmed", async () => {
    // Simulate async donate that takes a moment
    mockDonate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    );

    render(<DonationForm charityAddress="0xCharity" />);

    // Set amount
    const amountInput = screen.getByRole("spinbutton");
    fireEvent.change(amountInput, { target: { value: "10" } });

    const submitButton = screen.getByRole("button", { name: /donate now/i });
    fireEvent.click(submitButton);

    // Persistent "submitted" toast shown immediately
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "info",
          title: "Transaction submitted",
          persistent: true,
        }),
      );
    });

    // After donate() resolves, confirmed toast + dismiss
    await waitFor(() => {
      expect(mockDismissToast).toHaveBeenCalledWith("mock-toast-id");
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          title: "Donation confirmed",
        }),
      );
    });
  });

  it("dismisses pending toast and shows error toast on donation failure", async () => {
    mockDonate.mockRejectedValue(new Error("Insufficient funds"));

    render(<DonationForm charityAddress="0xCharity" />);

    const amountInput = screen.getByRole("spinbutton");
    fireEvent.change(amountInput, { target: { value: "5" } });

    const submitButton = screen.getByRole("button", { name: /donate now/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDismissToast).toHaveBeenCalledWith("mock-toast-id");
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Donation failed",
          message: "Insufficient funds",
        }),
      );
    });
  });
});
