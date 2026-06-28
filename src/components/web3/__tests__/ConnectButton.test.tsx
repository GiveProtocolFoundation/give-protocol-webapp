import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConnectButton } from "../ConnectButton";
import { useWeb3 } from "@/contexts/Web3Context";
import { useMultiChainContext } from "@/contexts/MultiChainContext";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useUnifiedWallets } from "@/hooks/useWallet";
import { AuthProvider } from "@/contexts/AuthContext";
import { testAddresses } from "@/test-utils/mockSetup";

// Web3Context, MultiChainContext, useWallet, useWalletAlias, utils/web3,
// utils/logger, WalletModal, config/contracts, and config/chains are all
// mocked via moduleNameMapper. AuthContext uses real AuthProvider with
// supabase mocked — user starts as null.

const mockUseWeb3 = jest.mocked(useWeb3);
const mockUseMultiChainContext = jest.mocked(useMultiChainContext);
const mockUseWalletAlias = jest.mocked(useWalletAlias);
const mockUseUnifiedWallets = jest.mocked(useUnifiedWallets);

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockSwitchChain = jest.fn();
const mockMultiChainConnect = jest.fn();
const mockMultiChainDisconnect = jest.fn();

const defaultWeb3Mock = {
  provider: null,
  signer: null,
  address: null,
  chainId: 1287,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: mockConnect,
  disconnect: mockDisconnect,
  switchChain: mockSwitchChain,
} as ReturnType<typeof useWeb3>;

const defaultMultiChainMock = {
  wallet: null,
  accounts: [],
  activeAccount: null,
  activeChainType: "evm" as const,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: mockMultiChainConnect,
  disconnect: mockMultiChainDisconnect,
  switchAccount: jest.fn(),
  switchChainType: jest.fn(),
  switchChain: jest.fn(),
  clearError: jest.fn(),
} as ReturnType<typeof useMultiChainContext>;

const defaultWalletAliasMock = {
  alias: null,
  setAlias: jest.fn(),
  isLoading: false,
} as ReturnType<typeof useWalletAlias>;

const defaultUnifiedWalletsMock = {
  wallets: [
    {
      name: "Phantom",
      icon: "phantom",
      category: "multichain" as const,
      supportedChainTypes: ["evm" as const, "solana" as const],
      isInstalled: () => true,
    },
    {
      name: "MetaMask",
      icon: "metamask",
      category: "browser" as const,
      supportedChainTypes: ["evm" as const],
      isInstalled: () => true,
    },
  ],
  isLoading: false,
} as ReturnType<typeof useUnifiedWallets>;

const renderConnectButton = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <ConnectButton />
      </MemoryRouter>
    </AuthProvider>,
  );

describe("ConnectButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeb3.mockReturnValue(defaultWeb3Mock);
    mockUseMultiChainContext.mockReturnValue(defaultMultiChainMock);
    mockUseWalletAlias.mockReturnValue(defaultWalletAliasMock);
    mockUseUnifiedWallets.mockReturnValue(defaultUnifiedWalletsMock);
  });

  describe("when wallet is not connected", () => {
    it("renders connect button", () => {
      renderConnectButton();
      expect(screen.getByText("Connect")).toBeInTheDocument();
    });

    it("shows wallet modal when connect button is clicked", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText("Connect"));
      await waitFor(() => {
        expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
      });
    });

    it("shows chain type tabs in modal", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText("Connect"));
      await waitFor(() => {
        expect(screen.getAllByText("EVM").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Solana").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Polkadot").length).toBeGreaterThanOrEqual(
          1,
        );
      });
    });
  });

  describe("when wallet is connected", () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        address: testAddresses.mainWallet,
        chainId: 1287,
        isConnected: true,
      });
      mockUseMultiChainContext.mockReturnValue({
        ...defaultMultiChainMock,
        isConnected: true,
        activeAccount: {
          id: "test-account",
          address: testAddresses.mainWallet,
          chainType: "evm" as const,
          chainId: 1287,
          chainName: "Moonbase Alpha",
          source: "MetaMask",
        },
      });
    });

    it("renders wallet address button", () => {
      renderConnectButton();
      expect(screen.getByText(testAddresses.shortAddress)).toBeInTheDocument();
    });

    it("shows account menu when wallet button is clicked", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText(testAddresses.shortAddress));

      await waitFor(() => {
        expect(screen.getByText("Set Wallet Alias")).toBeInTheDocument();
        expect(screen.getByText("Disconnect")).toBeInTheDocument();
      });
    });

    it("shows chain name in account dropdown", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText(testAddresses.shortAddress));

      await waitFor(() => {
        expect(screen.getByText("Moonbase Alpha")).toBeInTheDocument();
      });
    });

    it("calls disconnect when disconnect is clicked", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText(testAddresses.shortAddress));

      await waitFor(() => {
        expect(screen.getByText("Disconnect")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Disconnect"));

      await waitFor(() => {
        expect(mockMultiChainDisconnect).toHaveBeenCalled();
      });
    });
  });

  describe("with wallet alias", () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        address: testAddresses.mainWallet,
        chainId: 1287,
        isConnected: true,
      });
      mockUseMultiChainContext.mockReturnValue({
        ...defaultMultiChainMock,
        isConnected: true,
        activeAccount: {
          id: "test-account",
          address: testAddresses.mainWallet,
          chainType: "evm" as const,
          chainId: 1287,
          chainName: "Moonbase Alpha",
          source: "MetaMask",
        },
      });
      mockUseWalletAlias.mockReturnValue({
        alias: "My Wallet",
        setAlias: jest.fn(),
        isLoading: false,
      });
    });

    it("renders wallet alias instead of address", () => {
      renderConnectButton();
      expect(screen.getByText("My Wallet")).toBeInTheDocument();
    });

    it("shows change alias option in menu", async () => {
      renderConnectButton();

      fireEvent.click(screen.getByText("My Wallet"));

      await waitFor(() => {
        expect(screen.getByText("Change Wallet Alias")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error button when connection error occurs", () => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        error: new Error("Connection failed"),
      });

      renderConnectButton();

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("shows error message on larger screens", () => {
      mockUseMultiChainContext.mockReturnValue({
        ...defaultMultiChainMock,
        error: new Error("User rejected connection"),
      });

      renderConnectButton();

      expect(screen.getByText(/User rejected connection/)).toBeInTheDocument();
    });
  });

  describe("connecting state", () => {
    it("shows connecting text when connecting", () => {
      mockUseWeb3.mockReturnValue({
        ...defaultWeb3Mock,
        isConnecting: true,
      });

      renderConnectButton();

      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("disables button when connecting", () => {
      mockUseMultiChainContext.mockReturnValue({
        ...defaultMultiChainMock,
        isConnecting: true,
      });

      renderConnectButton();

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });
});
