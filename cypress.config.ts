import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    env: {
      // Base DurationDonation contract asserted in donation-base.cy.ts.
      // Override in cypress.env.json if the address changes.
      BASE_DONATION_CONTRACT: "0x712461A7dFc0bf480023bbCB492F97F7c9d40A54",
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
