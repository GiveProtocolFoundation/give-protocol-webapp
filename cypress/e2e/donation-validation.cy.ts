/**
 * GIV-984 — donation form hardening e2e coverage.
 *
 * 1. Live amount validation on the crypto path: Donate button disabled for
 *    $0, negatives, and amounts > 1,000,000, with live inline errors.
 * 2. Negative input renders an explicit error and is never silently
 *    rewritten to a positive amount.
 * 3. Fiat path enforces the same 0 < amount <= 1,000,000 bound. Uses the
 *    EUR (PayPal) route so the submit button can become ready without the
 *    Helcim script.
 * 4. Helcim card iframe: a real error + retry path after the ~20s watchdog
 *    instead of an infinite "Loading secure payment form...".
 *
 * CI requirement (same as donation-base.cy.ts): the dev server must be
 * started with VITE_BASE_DONATION_ADDRESS=0x712461A7dFc0bf480023bbCB492F97F7c9d40A54.
 */

const TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const CHAIN_ID = 8453;
const HEX_ID = "0x2105";

/** ABI-encodes an integer as a zero-padded 32-byte hex string */
function abiUint256(n: bigint | number): string {
  return `0x${BigInt(n).toString(16).padStart(64, "0")}`;
}

/** Stubs window.ethereum (Base chain) so the crypto path can connect. */
function stubEthereum(win: Window & typeof globalThis): void {
  const ethereum = {
    isMetaMask: true as const,
    chainId: HEX_ID,
    selectedAddress: null as string | null,

    request(args: {
      method: string;
      params?: unknown[];
    }): Promise<unknown> {
      switch (args.method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return Promise.resolve([TEST_WALLET]);

        case "eth_chainId":
          return Promise.resolve(HEX_ID);

        case "net_version":
          return Promise.resolve(String(CHAIN_ID));

        case "eth_getBalance":
          return Promise.resolve(abiUint256(BigInt("1000000000000000000")));

        case "eth_getCode":
          return Promise.resolve("0x608060405234");

        case "eth_call": {
          const callParams =
            (args.params as Array<{ data?: string }>)[0] ?? {};
          const data = callParams.data ?? "";
          if (data.startsWith("0x70a08231")) {
            // balanceOf(address) → 2,000,000 tokens (18 decimals) so the
            // 1,000,000 cap boundary stays under the mocked balance
            return Promise.resolve(
              abiUint256(BigInt("2000000000000000000000000")),
            );
          }
          if (data.startsWith("0x313ce567")) {
            // decimals() → 18
            return Promise.resolve(abiUint256(18));
          }
          return Promise.resolve(`0x${"f".repeat(64)}`);
        }

        case "eth_estimateGas":
          return Promise.resolve("0x5208");

        case "eth_gasPrice":
        case "eth_maxFeePerGas":
        case "eth_maxPriorityFeePerGas":
          return Promise.resolve("0x3B9ACA00");

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
}

/** Mocks Supabase REST/auth so no real backend is needed. */
function stubSupabase(): void {
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
}

describe("Donation form validation (GIV-984)", () => {
  describe("crypto path — live validation (AC1 + AC2)", () => {
    beforeEach(() => {
      stubSupabase();
      cy.visit("/charity/global-water-foundation", {
        onBeforeLoad: stubEthereum,
      });
    });

    it("disables Donate and shows live inline errors for 0, negative, and over-cap amounts", () => {
      cy.contains("button", /give once/i).click();
      cy.contains("button", /^wallet$/i).click();
      cy.contains("button", /connect wallet/i).click();

      cy.contains("button", /donate now/i, { timeout: 10_000 }).should(
        "exist",
      );

      // Accept Art.9 consent so only the amount gates the button
      cy.get("#art9-consent").check();

      const amountInput = () => cy.get("#donation-amount-input");
      const donateButton = () => cy.contains("button", /donate now/i);
      const amountError = () =>
        cy.get('[data-testid="donation-amount-error"]');

      // $0 — live error + disabled Donate
      amountInput().clear().type("0");
      amountError().should("be.visible").and("contain", "greater than 0");
      donateButton().should("be.disabled");

      // -5 — explicit error; the field keeps the raw negative value
      amountInput().clear().type("-5");
      amountError().should("be.visible").and("contain", "greater than 0");
      amountInput().should("have.value", "-5");
      donateButton().should("be.disabled");

      // 1,000,001 — upper-bound error + disabled Donate
      amountInput().clear().type("1000001");
      amountError()
        .should("be.visible")
        .and("contain", "Maximum donation amount");
      donateButton().should("be.disabled");

      // 1,000,000 — exactly at the cap is valid
      amountInput().clear().type("1000000");
      amountError().should("not.exist");
      donateButton().should("not.be.disabled");

      // valid small amount — error clears, Donate enabled
      amountInput().clear().type("0.01");
      amountError().should("not.exist");
      donateButton().should("not.be.disabled");
    });
  });

  describe("fiat path — same 0 < amount <= 1,000,000 bound (AC3)", () => {
    beforeEach(() => {
      stubSupabase();
      cy.visit("/charity/global-water-foundation");
    });

    it("shows live inline errors and gates the pay button (EUR/PayPal route)", () => {
      cy.contains("button", /give once/i).click();
      cy.contains("button", /^card$/i).click();

      // EUR routes to PayPal so the submit button can be ready without Helcim
      cy.get("#fiat-currency-select").select("EUR");

      const customInput = () =>
        cy.get('input[aria-label^="Custom donation amount"]');
      const amountError = () =>
        cy.get('[data-testid="donation-amount-error"]');
      const payButton = () => cy.get("form").contains("button", /^Donate/);

      // $0 — live error
      customInput().clear().type("0");
      amountError().should("be.visible").and("contain", "greater than 0");
      payButton().should("be.disabled");

      // -5 — explicit error; the field keeps the raw negative value
      customInput().clear().type("-5");
      amountError().should("be.visible").and("contain", "greater than 0");
      customInput().should("have.value", "-5");
      payButton().should("be.disabled");

      // 1,000,001 — upper-bound error + disabled pay button
      customInput().clear().type("1000001");
      amountError()
        .should("be.visible")
        .and("contain", "Maximum donation amount");
      payButton().should("be.disabled");

      // Valid amount with consents — error clears and the button enables
      cy.get("#age-affirmation").check();
      cy.get("#art9-consent").check();
      customInput().clear().type("50");
      amountError().should("not.exist");
      payButton().should("not.be.disabled");
    });
  });

  describe("Helcim iframe — graceful failure after watchdog timeout (AC4)", () => {
    it("shows a real error and a retry path after ~20s instead of infinite loading", () => {
      // Hang the HelcimPay.js script so neither onload nor onerror fires
      // within the test window (mirrors the missing HELCIM_API_TOKEN hang)
      cy.intercept("GET", "**/helcim-pay/**", {
        statusCode: 200,
        body: "",
        delay: 60_000,
      }).as("helcimScript");

      stubSupabase();
      cy.visit("/charity/global-water-foundation");

      cy.contains("button", /give once/i).click();
      cy.contains("button", /^card$/i).click();

      // Loading state shows first, with no error. The status block can sit
      // below the fold of the scrollable modal, so scroll it into view.
      cy.contains(/loading secure payment form/i, { timeout: 10_000 })
        .scrollIntoView()
        .should("be.visible");
      cy.get('[data-testid="fiat-script-error"]').should("not.exist");

      // Wait out the real 20s watchdog
      cy.wait(21_000);

      // Real error + retry, not an infinite spinner
      cy.get('[data-testid="fiat-script-error"]')
        .scrollIntoView()
        .should("be.visible")
        .and("contain", "taking too long");
      cy.contains("button", /retry payment setup/i)
        .scrollIntoView()
        .should("be.visible");
      cy.contains(/loading secure payment form/i).should("not.exist");
    });
  });
});
