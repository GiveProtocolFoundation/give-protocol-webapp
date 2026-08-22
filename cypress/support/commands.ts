interface EthereumRequestArgs {
  method: string;
  params?: unknown[];
}

interface MockEthereum {
  isMetaMask: boolean;
  request: (args: EthereumRequestArgs) => Promise<unknown>;
  on: () => void;
  removeListener: () => void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress requires this namespace declaration pattern for custom commands
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      connectWallet(): Chainable<void>;
    }
  }

  interface Window {
    ethereum?: MockEthereum;
  }
}

Cypress.Commands.add(
  "login",
  (email = "test@example.com", password = "password") => {
    cy.session([email, password], () => {
      cy.request({
        method: "POST",
        url: "/auth/login",
        body: { email, password },
      }).then((response) => {
        window.localStorage.setItem(
          "supabase.auth.token",
          JSON.stringify(response.body),
        );
      });
    });
  },
);

Cypress.Commands.add("connectWallet", () => {
  cy.window().then((win) => {
    win.ethereum = {
      isMetaMask: true,
      request: (args: EthereumRequestArgs) => {
        if (args.method === "eth_requestAccounts") {
          // skipcq: SCT-A000 - This is a placeholder test Ethereum address for Cypress testing, not a real secret
          return Promise.resolve([
            "0x1234567890123456789012345678901234567890",
          ]);
        }
        return Promise.resolve();
      },
      on: () => {
        // Empty mock method for test purposes
      },
      removeListener: () => {
        // Empty mock method for test purposes
      },
    };
  });

  cy.get('[data-testid="connect-wallet"]').click();
});

export {};
