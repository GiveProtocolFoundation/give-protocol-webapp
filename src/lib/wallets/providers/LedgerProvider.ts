/**
 * Ledger Hardware Wallet Provider
 * Direct integration via Ledger Device Management Kit (DMK)
 * Supports both USB and Bluetooth connections
 */

import { Logger } from "@/utils/logger";
import type {
  ChainType,
  UnifiedAccount,
  UnifiedWalletProvider,
  UnifiedTransactionRequest,
  WalletCategory,
} from "@/types/wallet";
import {
  getEVMChainConfig,
  DEFAULT_EVM_CHAIN_ID,
  type EVMChainId,
} from "@/config/chains";

/**
 * Ledger DMK types (simplified)
 */
interface LedgerDevice {
  id: string;
  name: string;
  modelId: string;
  connected: boolean;
}

interface DeviceManagementKit {
  startDiscovery: () => Promise<LedgerDevice>;
  stopDiscovery: () => void;
}

interface EthereumSignerKit {
  getAddress: (_opts: {
    derivationPath: string;
    displayOnDevice?: boolean;
  }) => Promise<{ address: string }>;
  signTransaction: (_tx: unknown) => Promise<{ signature: string }>;
  signMessage: (_message: string) => Promise<{ signature: string }>;
}

/**
 * Derivation path constants
 */
const DERIVATION_PATHS = {
  ETHEREUM: "44'/60'/0'/0/0",
  ETHEREUM_LEDGER_LIVE: "44'/60'/0'/0",
  SOLANA: "44'/501'/0'/0'",
} as const;

/**
 * Connection transport types
 */
type TransportType = "usb" | "bluetooth";

/**
 * LedgerProvider - Hardware wallet integration via DMK
 * Provides secure key management with on-device signing
 */
export class LedgerProvider implements UnifiedWalletProvider {
  readonly name = "Ledger";
  readonly icon = "ledger";
  readonly category: WalletCategory = "hardware";
  readonly supportedChainTypes: ChainType[] = ["evm", "solana"];

  private dmk: DeviceManagementKit | null = null;
  private device: LedgerDevice | null = null;
  private evmSigner: EthereumSignerKit | null = null;
  private currentChainId: number = DEFAULT_EVM_CHAIN_ID;
  private connectedAddress: string | null = null;
  private transportType: TransportType = "usb";

  /**
   * Get underlying provider objects
   */
  get providers() {
    return {
      evm: this.evmSigner,
    };
  }

  /**
   * Check if Ledger is available
   * Ledger requires WebUSB or WebBluetooth support
   * @returns True if browser supports required APIs
   */
  isInstalled(): boolean {
    if (this.supportedChainTypes.length === 0) return false;
    if (typeof window === "undefined") return false;

    // Check for WebUSB support
    const hasWebUSB = "usb" in navigator;

    // Check for WebBluetooth support
    const hasWebBluetooth = "bluetooth" in navigator;

    return hasWebUSB || hasWebBluetooth;
  }

  /**
   * Set the transport type for connection
   * @param transport - "usb" or "bluetooth"
   */
  setTransport(transport: TransportType): void {
    this.transportType = transport;
  }

  /**
   * Connect to Ledger device
   * @param chainType - Chain type to connect (defaults to EVM)
   * @returns Array of connected accounts
   */
  async connect(chainType: ChainType = "evm"): Promise<UnifiedAccount[]> {
    if (!this.isInstalled()) {
      throw new Error("Browser does not support WebUSB or WebBluetooth");
    }

    try {
      // Initialize DMK
      const { DeviceManagementKit } =
        await import("@ledgerhq/device-management-kit");
      this.dmk = new DeviceManagementKit() as unknown as DeviceManagementKit;

      // Start device discovery
      Logger.info("Starting Ledger device discovery", {
        transport: this.transportType,
      });
      this.device = await this.discoverDevice();

      if (!this.device) {
        throw new Error("No Ledger device found");
      }

      Logger.info("Ledger device connected", {
        id: this.device.id,
        model: this.device.modelId,
      });

      // Connect based on chain type
      if (chainType === "evm") {
        return this.connectEVM();
      } else if (chainType === "solana") {
        return LedgerProvider.connectSolana();
      }

      throw new Error(`Unsupported chain type: ${chainType}`);
    } catch (error) {
      Logger.error("Ledger connection failed", { error });
      throw error;
    }
  }

  /**
   * Discover and connect to a Ledger device
   * @returns Connected device
   */
  private async discoverDevice(): Promise<LedgerDevice> {
    if (!this.dmk) {
      throw new Error("DMK not initialized");
    }

    try {
      const device = await this.dmk.startDiscovery();
      return device;
    } catch (error) {
      Logger.error("Device discovery failed", { error });
      throw new Error(
        "Could not find Ledger device. Make sure it's connected and unlocked.",
      );
    }
  }

  /**
   * Connect to Ledger for EVM chains
   * @returns Array of EVM accounts
   */
  private async connectEVM(): Promise<UnifiedAccount[]> {
    if (!this.device) {
      throw new Error("No device connected");
    }

    try {
      // Initialize Ethereum signer
      const { EthereumSignerKit } =
        await import("@ledgerhq/device-signer-kit-ethereum");

      this.evmSigner = new EthereumSignerKit(
        this.dmk,
        this.device.id,
      ) as unknown as EthereumSignerKit;

      // Get address with on-device verification
      const { address } = await this.evmSigner.getAddress({
        derivationPath: DERIVATION_PATHS.ETHEREUM,
        displayOnDevice: true,
      });

      this.connectedAddress = address;

      Logger.info("Ledger EVM connected", { address });

      return this.toUnifiedAccounts([address], "evm");
    } catch (error) {
      Logger.error("Ledger EVM connection failed", { error });
      throw error;
    }
  }

  /**
   * Connect to Ledger for Solana
   * @returns Array of Solana accounts
   */
  private static connectSolana(): Promise<UnifiedAccount[]> {
    // Solana support would require @ledgerhq/hw-app-solana
    throw new Error("Ledger Solana support coming soon");
  }

  /**
   * Disconnect from Ledger
   */
  disconnect(): Promise<void> {
    if (this.dmk) {
      this.dmk.stopDiscovery();
    }

    this.dmk = null;
    this.device = null;
    this.evmSigner = null;
    this.connectedAddress = null;

    Logger.info("Ledger disconnected");
    return Promise.resolve();
  }

  /**
   * Get accounts from Ledger
   * @param chainType - Optional chain type filter
   * @returns Array of accounts
   */
  getAccounts(chainType: ChainType = "evm"): Promise<UnifiedAccount[]> {
    if (!this.connectedAddress) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      this.toUnifiedAccounts([this.connectedAddress], chainType),
    );
  }

  /**
   * Switch chain
   * @param chainId - Target chain ID
   * @param chainType - Chain type
   */
  switchChain(chainId: number | string, chainType: ChainType): Promise<void> {
    if (chainType !== "evm") {
      throw new Error("Ledger chain switching only supported for EVM");
    }

    this.currentChainId = chainId as number;
    Logger.info("Ledger chain switched", { chainId });
    return Promise.resolve();
  }

  /**
   * Sign a transaction on Ledger
   * Transaction details are shown on device for verification
   * @param tx - Transaction request
   * @returns Transaction signature
   */
  async signTransaction(tx: UnifiedTransactionRequest): Promise<string> {
    if (tx.chainType !== "evm") {
      throw new Error("Ledger only supports EVM transaction signing currently");
    }

    if (!this.evmSigner) {
      throw new Error("Ledger not connected");
    }

    try {
      Logger.info("Signing transaction on Ledger device...");

      const { signature } = await this.evmSigner.signTransaction({
        to: tx.to,
        value: tx.value || "0",
        data: tx.data || "0x",
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        chainId: tx.chainId,
      });

      Logger.info("Ledger transaction signed");
      return signature;
    } catch (error) {
      Logger.error("Ledger transaction signing failed", { error });
      throw error;
    }
  }

  /**
   * Sign a message on Ledger
   * Message is shown on device for verification
   * @param message - Message to sign
   * @param chainType - Chain type
   * @returns Signature
   */
  async signMessage(
    message: string | Uint8Array,
    chainType: ChainType,
  ): Promise<string> {
    if (chainType !== "evm") {
      throw new Error("Ledger only supports EVM message signing currently");
    }

    if (!this.evmSigner) {
      throw new Error("Ledger not connected");
    }

    try {
      Logger.info("Signing message on Ledger device...");

      const messageStr =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);

      const { signature } = await this.evmSigner.signMessage(messageStr);

      Logger.info("Ledger message signed");
      return signature;
    } catch (error) {
      Logger.error("Ledger message signing failed", { error });
      throw error;
    }
  }

  /**
   * Get connected device info
   * @returns Device info or null
   */
  getDeviceInfo(): LedgerDevice | null {
    return this.device;
  }

  /**
   * Check if device is connected
   * @returns True if device is connected
   */
  isDeviceConnected(): boolean {
    return this.device?.connected ?? false;
  }

  /**
   * Convert addresses to unified accounts
   * @param addresses - Array of addresses
   * @param chainType - Chain type
   * @returns Array of unified accounts
   */
  private toUnifiedAccounts(
    addresses: string[],
    chainType: ChainType,
  ): UnifiedAccount[] {
    const chainConfig =
      chainType === "evm"
        ? getEVMChainConfig(this.currentChainId as EVMChainId)
        : null;

    return addresses.map((address, index) => ({
      id: `ledger-${chainType}-${this.currentChainId}-${address}`,
      address,
      chainType,
      chainId: this.currentChainId,
      chainName: chainConfig?.name || "Unknown",
      source: "Ledger",
      name:
        index === 0
          ? `Ledger ${this.device?.name || "Device"}`
          : `Ledger Account ${index + 1}`,
    }));
  }
}

/**
 * Create a Ledger provider instance
 * @returns LedgerProvider if browser supports required APIs, null otherwise
 */
export function createLedgerProvider(): LedgerProvider | null {
  const provider = new LedgerProvider();
  return provider.isInstalled() ? provider : null;
}

/**
 * Check if browser supports Ledger connection
 * @returns True if WebUSB or WebBluetooth is available
 */
export function supportsLedgerConnection(): boolean {
  if (typeof window === "undefined") return false;
  return "usb" in navigator || "bluetooth" in navigator;
}
