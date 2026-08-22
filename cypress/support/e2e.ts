import "./commands";
import "./supabase-auth";

beforeEach(() => {
  // Reset application state
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });

  // Session state is persisted by the app in localStorage, not cookies, so no
  // cookie preservation is needed here (preserveOnce was removed in Cypress 12).
});

// Log failed test screenshots to console
Cypress.on("test:after:run", (test, runnable) => {
  if (test.state === "failed") {
    const screenshotFileName = `${runnable.parent.title} -- ${test.title} (failed).png`;
    console.log(`Screenshot: ${screenshotFileName}`);
  }
});

// Handle uncaught exceptions
Cypress.on("uncaught:exception", (err) => {
  console.error("Uncaught exception:", err);
  return false;
});
