import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletButton } from "../WalletButton";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import type { WalletButtonProps } from "../types";

// useWalletBalance, Web3Context, logger, and env are all mocked via
// moduleNameMapper. The component under test is imported via relative
// path so the real WalletButton implementation is exercised.

const mockUseWalletBalance = jest.mocked(useWalletBalance);

const mockDisconnect = jest.fn();
const mockSwitchAccount = jest.fn();
const mockNetworkChange = jest.fn();

const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const defaultProps: WalletButtonProps = {
  address: TEST_ADDRESS,
  provider: "metamask",
  network: "moonbase",
  onDisconnect: mockDisconnect,
  onSwitchAccount: mockSwitchAccount,
  onNetworkChange: mockNetworkChange,
};

const renderWalletButton = (overrides: Partial<WalletButtonProps> = {}) =>
  render(
    <MemoryRouter>
      <WalletButton {...defaultProps} {...overrides} />
    </MemoryRouter>,
  );

describe("WalletButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWalletBalance.mockReturnValue({
      native: "1.5000",
      nativeSymbol: "DEV",
      usdValue: "$3.00",
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe("rendering", () => {
    it("renders the wallet button with truncated address", () => {
      renderWalletButton();

      // formatAddress('short') renders both desktop and mobile, so expect 2
      const addressElements = screen.getAllByText("0x1234...5678");
      expect(addressElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the wallet menu button with correct aria attributes", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-haspopup", "true");
    });

    it("renders Main Wallet label text", () => {
      renderWalletButton();

      expect(screen.getByText("Main Wallet")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = renderWalletButton({ className: "custom-class" });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-class");
    });
  });

  describe("pending transactions badge", () => {
    it("does not show badge when pendingTxCount is 0", () => {
      renderWalletButton({ pendingTxCount: 0 });

      // TxBadge renders nothing for count <= 0
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });

    it("shows badge with count when pending transactions exist", () => {
      renderWalletButton({ pendingTxCount: 3 });

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows 9+ when pending transactions exceed 9", () => {
      renderWalletButton({ pendingTxCount: 15 });

      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  describe("dropdown toggle", () => {
    it("opens dropdown when button is clicked", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("closes dropdown when button is clicked again", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("closes dropdown on Escape key", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("dropdown content", () => {
    it("shows provider name in dropdown", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);

      expect(screen.getByText("MetaMask")).toBeInTheDocument();
    });

    it("shows medium-format address in dropdown", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);

      // formatAddress('medium') produces "0x123456...345678"
      expect(screen.getByText("0x123456...345678")).toBeInTheDocument();
    });

    it("shows Disconnect menu item", () => {
      renderWalletButton();

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    it("shows Account Settings menu item", () => {
      renderWalletButton();

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("Account Settings")).toBeInTheDocument();
    });

    it("shows Switch Account option when hasMultipleAccounts is true", () => {
      renderWalletButton({ hasMultipleAccounts: true });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("Switch Account")).toBeInTheDocument();
    });

    it("does not show Switch Account when hasMultipleAccounts is false", () => {
      renderWalletButton({ hasMultipleAccounts: false });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.queryByText("Switch Account")).not.toBeInTheDocument();
    });

    it("hides Account Settings and shows Sign In when isGuest is true", () => {
      renderWalletButton({ isGuest: true });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.queryByText("Account Settings")).not.toBeInTheDocument();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
      // Disconnect remains available
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    it("shows 'Guest' label on the wallet button when isGuest is true", () => {
      renderWalletButton({ isGuest: true });
      expect(screen.getByText("Guest")).toBeInTheDocument();
      expect(screen.queryByText("Main Wallet")).not.toBeInTheDocument();
    });

    it("shows 'Main Wallet' label by default (signed in)", () => {
      renderWalletButton();
      expect(screen.getByText("Main Wallet")).toBeInTheDocument();
      expect(screen.queryByText("Guest")).not.toBeInTheDocument();
    });
  });

  describe("dropdown actions", () => {
    it("calls onDisconnect and closes dropdown when Disconnect is clicked", () => {
      renderWalletButton();

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));
      fireEvent.click(screen.getByText("Disconnect"));

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      // Dropdown should close after disconnect
      expect(
        screen.getByRole("button", { name: "Wallet menu" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("calls onSwitchAccount and closes dropdown when Switch Account is clicked", () => {
      renderWalletButton({ hasMultipleAccounts: true });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));
      fireEvent.click(screen.getByText("Switch Account"));

      expect(mockSwitchAccount).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "Wallet menu" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("copies address and shows confirmation", async () => {
      // Mock clipboard API
      const writeText = jest.fn<() => Promise<void>>();
      writeText.mockResolvedValue();
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      renderWalletButton();

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      const copyButton = screen.getByRole("button", {
        name: "Copy address",
      });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      expect(writeText).toHaveBeenCalledWith(TEST_ADDRESS);
    });
  });

  describe("balances", () => {
    it("uses fetched balances when no external balances provided", () => {
      mockUseWalletBalance.mockReturnValue({
        native: "2.5000",
        nativeSymbol: "DEV",
        usdValue: "$5.00",
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWalletButton();

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("DEV")).toBeInTheDocument();
    });

    it("uses external balances when provided", () => {
      renderWalletButton({
        balances: {
          native: "10.0000",
          usdValue: "25.00",
          isLoading: false,
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("10.0000")).toBeInTheDocument();
    });

    it("shows loading state when balance is loading", () => {
      renderWalletButton({
        balances: {
          isLoading: true,
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("click outside", () => {
    it("closes dropdown when clicking outside the container", () => {
      renderWalletButton();

      const button = screen.getByRole("button", { name: "Wallet menu" });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      // Simulate clicking outside
      fireEvent.mouseDown(document.body);

      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });
});
