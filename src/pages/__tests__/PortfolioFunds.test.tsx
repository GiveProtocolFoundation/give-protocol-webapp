import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { usePortfolioFunds } from "@/hooks/web3/usePortfolioFunds";
import type { PortfolioFund } from "@/hooks/web3/usePortfolioFunds";
import PortfolioFunds from "../PortfolioFunds";

// Card, Button, useToast, useTranslation, and usePortfolioFunds are mocked via moduleNameMapper

const mockUsePortfolioFunds = jest.mocked(usePortfolioFunds);

const mockFund: PortfolioFund = {
  id: "fund-1",
  name: "Education Fund",
  description: "Supporting education",
  active: true,
  charities: ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"],
  ratios: [50, 50],
  totalRaised: "10.0",
  totalDistributed: "5.0",
};

const mockFundTwo: PortfolioFund = {
  id: "fund-2",
  name: "Health Fund",
  description: "Improving healthcare access",
  active: true,
  charities: ["0x3333333333333333333333333333333333333333"],
  ratios: [100],
  totalRaised: "20.0",
  totalDistributed: "8.0",
};

const renderPage = () => render(<PortfolioFunds />);

describe("PortfolioFunds", () => {
  const mockGetAllFunds = jest.fn<() => Promise<PortfolioFund[]>>();
  const mockDonateToFund = jest.fn();
  const mockDonateNativeToFund = jest.fn();
  const mockGetPlatformFee = jest.fn(() => Promise.resolve(100));

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllFunds.mockResolvedValue([mockFund]);
    mockUsePortfolioFunds.mockReturnValue({
      donateToFund: mockDonateToFund,
      donateNativeToFund: mockDonateNativeToFund,
      claimFunds: jest.fn(),
      getAllFunds: mockGetAllFunds,
      getFundDetails: jest.fn(() => Promise.resolve(null)),
      getCharityClaimableAmount: jest.fn(() => Promise.resolve("0")),
      getCharityInfo: jest.fn(() => Promise.resolve(null)),
      getPlatformFee: mockGetPlatformFee,
      loading: false,
      error: null,
      contract: null,
    });
  });

  describe("Loading state", () => {
    it("shows loading skeleton before data loads", () => {
      mockGetAllFunds.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );
      renderPage();
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Page title", () => {
    it("renders Portfolio Funds title after loading", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Portfolio Funds")).toBeInTheDocument();
      });
    });
  });

  describe("Fund cards", () => {
    it("renders fund card with name", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Education Fund")).toBeInTheDocument();
      });
    });

    it("renders fund card with description", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Supporting education")).toBeInTheDocument();
      });
    });

    it("renders fund charity count", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("2 Verified Charities")).toBeInTheDocument();
      });
    });

    it("renders multiple fund cards", async () => {
      mockGetAllFunds.mockResolvedValue([mockFund, mockFundTwo]);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Education Fund")).toBeInTheDocument();
      });
      expect(screen.getByText("Health Fund")).toBeInTheDocument();
    });

    it("shows donate button on fund card", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Donate to Fund")).toBeInTheDocument();
      });
    });
  });

  describe("Donation modal", () => {
    it("opens donation modal on donate click", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Donate to Fund")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Donate to Fund"));
      await waitFor(() => {
        expect(
          screen.getByText("Donate to Education Fund"),
        ).toBeInTheDocument();
      });
    });

    it("shows cancel button in donation modal", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Donate to Fund")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Donate to Fund"));
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });

    it("shows donate button in donation modal", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Donate to Fund")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Donate to Fund"));
      await waitFor(() => {
        expect(screen.getByText("Donate")).toBeInTheDocument();
      });
    });

    it("shows amount input in donation modal", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Donate to Fund")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Donate to Fund"));
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
      });
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no funds available", async () => {
      mockGetAllFunds.mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText("No portfolio funds available"),
        ).toBeInTheDocument();
      });
    });

    it("shows check back later message in empty state", async () => {
      mockGetAllFunds.mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText("Check back later for new funding opportunities"),
        ).toBeInTheDocument();
      });
    });
  });
});
