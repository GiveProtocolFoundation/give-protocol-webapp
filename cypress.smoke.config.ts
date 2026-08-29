import { defineConfig } from "cypress";

// Used only by the "Auth signup smoke" CI job (.github/workflows/auth-confirm-seam.yml).
// That job never starts a dev server — the spec only calls cy.request() against
// Supabase directly — so this config omits baseUrl to skip Cypress's server
// availability check, which otherwise waits for http://localhost:5173 and fails.
export default defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
  },
});
