/**
 * Per-chain donation happy-path e2e matrix.
 *
 * Each entry exercises the full crypto-donation flow for a specific chain:
 *   1. window.ethereum is stubbed to report the target chain and intercept all JSON-RPC calls.
 *   2. Supabase REST calls are mocked via cy.intercept() so no real backend is needed.
 *   3. "Give Once" opens DonationModal; "Wallet" selects the crypto payment method.
 *   4. DonationModal's TrustSignals link is asserted to reference the expected contract.
 *   5. Connect Wallet → enter amount → accept Art.9 consent → Donate Now.
 *   6. eth_sendTransaction destination is asserted to match the donation contract.
 *   7. Modal success screen ("Thank You!" + charity name) is asserted.
 *
 * To add the next chain wave, append one row to CHAIN_MATRIX:
 *   { id: 10, hexId: "0xa", name: "Optimism", donationContract: "0x..." }
 *   (then Ethereum / Arbitrum / Polygon / Avalanche per GIV-785)
 *
 * CI requirement: the dev server (npm run dev) must be started with
 *   VITE_BASE_DONATION_ADDRESS=0x712461A7dFc0bf480023bbCB492F97F7c9d40A54
 * so DonationModal resolves the contract address without throwing.
 * Override the asserted address via cypress.env.json: BASE_DONATION_CONTRACT.
 */

declare global {
  interface Window {
    _capturedTxTo: string | null;
  }
}

interface ChainSpec {
  id: number;
  hexId: string;
  name: string;
  donationContract: string;
}

const CHAIN_MATRIX: ChainSpec[] = [
  {
    id: 8453,
    hexId: "0x2105",
    name: "Base",
    donationContract:
      (Cypress.env("BASE_DONATION_CONTRACT") as string | undefined) ||
      "0x712461A7dFc0bf480023bbCB492F97F7c9d40A54",
  },
];

const TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const FAKE_TX_HASH = `0x${"ab".repeat(32)}`;
const MAX_UINT256_HEX = `0x${"f".repeat(64)}`;

/** ABI-encodes an integer as a zero-padded 32-byte hex string */
function abiUint256(n: bigint | number): string {
  return `0x${BigInt(n).toString(16).padStart(64, "0")}`;
}

CHAIN_MATRIX.forEach(({ id: chainId, hexId, name, donationContract }) => {
  describe(`Donation — ${name} (${chainId}) happy path`, () => {
    beforeEach(() => {
      // — Supabase intercepts — //
      cy.intercept("GET", "**/rest/v1/donations**", {
        statusCode: 200,
        body: [
          {
            id: "e2e-donation-1",
            amount: "0.01",
            chain_id: chainId,
            charity_address: "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75",
            tx_hash: FAKE_TX_HASH,
            status: "completed",
            created_at: new Date().toISOString(),
            metadata: { organization: "Global Water Foundation" },
          },
        ],
      }).as("getDonations");

      cy.intercept("GET", "**/rest/v1/**", {
        statusCode: 200,
        body: [],
      }).as("supabaseGet");

      cy.intercept("POST", "**/rest/v1/**", {
        statusCode: 201,
        body: {},
      }).as("supabasePost");

      cy.intercept("GET", "**/auth/v1/**", {
        statusCode: 200,
        body: { user: null, session: null },
      }).as("supabaseAuthGet");

      cy.intercept("POST", "**/auth/v1/**", {
        statusCode: 200,
        body: { user: null, session: null },
      }).as("supabaseAuthPost");

      // — Visit with mocked window.ethereum — //
      cy.visit("/charity/global-water-foundation", {
        onBeforeLoad(win: Window & typeof globalThis) {
          win._capturedTxTo = null;

          const ethereum = {
            isMetaMask: true as const,
            chainId: hexId,
            selectedAddress: null as string | null,

            request(args: {
              method: string;
              params?: unknown[];
            }): Promise<unknown> {
              switch (args.method) {
                case "eth_requestAccounts":
                case "eth_accounts": {
                  ethereum.selectedAddress = TEST_WALLET;
                  return Promise.resolve([TEST_WALLET]);
                }

                case "eth_chainId":
                  return Promise.resolve(hexId);

                case "net_version":
                  return Promise.resolve(String(chainId));

                case "eth_blockNumber":
                  return Promise.resolve("0x1");

                case "eth_getBalance":
                  // 1 ETH
                  return Promise.resolve(
                    abiUint256(BigInt("1000000000000000000")),
                  );

                case "eth_getCode":
                  // Non-empty bytecode so contract is treated as deployed
                  return Promise.resolve("0x608060405234");

                case "eth_call": {
                  const callParams =
                    (args.params as Array<{ data?: string }>)[0] ?? {};
                  const data = callParams.data ?? "";

                  if (data.startsWith("0x70a08231")) {
                    // balanceOf(address) → 100 tokens (18 decimals)
                    return Promise.resolve(
                      abiUint256(BigInt("100000000000000000000")),
                    );
                  }
                  if (data.startsWith("0x313ce567")) {
                    // decimals() → 18
                    return Promise.resolve(abiUint256(18));
                  }
                  // allowance() and any other read → MaxUint256 (no approval needed)
                  return Promise.resolve(MAX_UINT256_HEX);
                }

                case "eth_estimateGas":
                  return Promise.resolve("0x5208");

                case "eth_gasPrice":
                case "eth_maxFeePerGas":
                case "eth_maxPriorityFeePerGas":
                  return Promise.resolve("0x3B9ACA00"); // 1 gwei

                case "eth_feeHistory":
                  return Promise.resolve(null);

                case "eth_getTransactionCount":
                  return Promise.resolve("0x0");

                case "eth_sendTransaction": {
                  const txParams =
                    (args.params as Array<{ to?: string }>)[0] ?? {};
                  if (txParams.to) {
                    win._capturedTxTo = txParams.to;
                  }
                  return Promise.resolve(FAKE_TX_HASH);
                }

                case "eth_getTransactionReceipt":
                  return Promise.resolve({
                    transactionHash: FAKE_TX_HASH,
                    blockNumber: "0x1",
                    blockHash: `0x${"0".repeat(64)}`,
                    status: "0x1",
                    gasUsed: "0x5208",
                    cumulativeGasUsed: "0x5208",
                    logs: [],
                    from: TEST_WALLET,
                    to: donationContract,
                    contractAddress: null,
                    logsBloom: `0x${"0".repeat(512)}`,
                    transactionIndex: "0x0",
                    type: "0x2",
                  });

                case "wallet_addEthereumChain":
                case "wallet_switchEthereumChain":
                  return Promise.resolve(null);

                default:
                  return Promise.resolve(null);
              }
            },

            on(_event: string, _listener: unknown): void {
              // intentional no-op for event subscriptions
            },

            removeListener(_event: string, _listener: unknown): void {
              // intentional no-op
            },
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (win as any).ethereum = ethereum;
        },
      });
    });

    it(`asserts ${name} DurationDonation contract in trust signals and completes donation`, () => {
      // Open the one-time donation modal
      cy.contains("button", /give once/i)
        .should("be.visible")
        .click();

      // Switch to Wallet (crypto) payment method
      cy.contains("button", /^wallet$/i).click();

      // TrustSignals in crypto mode shows a basescan link to the donation contract.
      // This asserts the app resolves the correct Base DurationDonation contract address.
      cy.get('a[href*="basescan.org/address/"]', { timeout: 10_000 })
        .should("exist")
        .invoke("attr", "href")
        .then((href) => {
          expect((href as string).toLowerCase()).to.include(
            donationContract.toLowerCase(),
          );
        });

      // Connect the mocked wallet
      cy.contains("button", /connect wallet/i).click();

      // Wait for donation form to be ready (wallet now connected)
      cy.contains("button", /donate now/i, { timeout: 10_000 }).should("exist");

      // Enter a 0.01 token amount (default WETH on Base — mocked balance 100)
      cy.get("input[type=number], input[inputmode=decimal]")
        .first()
        .clear()
        .type("0.01");

      // Accept Art.9(2)(a) donation data-processing consent
      cy.get("#art9-consent").check();

      // Submit
      cy.contains("button", /donate now/i)
        .should("not.be.disabled")
        .click();

      // Assert the transaction was sent to the Base DurationDonation contract
      cy.window({ timeout: 15_000 })
        .its("_capturedTxTo")
        .should("match", new RegExp(donationContract, "i"));

      // Assert modal success screen
      cy.contains(/thank you/i, { timeout: 15_000 }).should("be.visible");

      // Assert the success message names the charity (confirms the donation history entry)
      cy.contains(/global water foundation/i).should("be.visible");
    });
  });
});
