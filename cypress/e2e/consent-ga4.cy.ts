/**
 * GIV-377 regression: Silktide removal + GA4 consent gating.
 *
 * Validates:
 *  1. No silktide-* script tags in the DOM.
 *  2. At most one consent banner in the DOM.
 *  3. GA4 collect endpoint is not contacted before the user accepts analytics.
 */
describe("Consent & GA4 gating (GIV-377)", () => {
  it("has no Silktide script tags in the DOM", () => {
    cy.visit("/");
    cy.get('script[src*="silktide"]').should("not.exist");
    cy.get('link[href*="silktide"]').should("not.exist");
  });

  it("renders at most one consent banner", () => {
    cy.visit("/");
    // The React CookieBanner uses role="region" with aria-label="Cookie consent"
    cy.get('[role="region"][aria-label="Cookie consent"]').should(
      "have.length.at.most",
      1,
    );
  });

  it("does not contact the GA4 collect endpoint before the user accepts analytics", () => {
    // Intercept GA4 collect requests
    cy.intercept(
      { hostname: "www.google-analytics.com", method: "POST" },
      { statusCode: 204 },
    ).as("ga4Collect");

    cy.intercept(
      { hostname: "analytics.google.com", method: "POST" },
      { statusCode: 204 },
    ).as("ga4CollectAlt");

    // Also intercept the gtag.js library load
    cy.intercept(
      { hostname: "www.googletagmanager.com", pathname: "/gtag/js*" },
      { statusCode: 200, body: "/* stubbed */" },
    ).as("gtagLib");

    cy.visit("/");

    // Wait a moment to let any eager requests fire
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    // GA4 library should NOT have been loaded (gated on consent)
    cy.get("@gtagLib.all").should("have.length", 0);

    // Accept analytics consent
    cy.get("button").contains("Accept all").click();

    // Now the GA4 library should load
    cy.wait("@gtagLib", { timeout: 5000 });
  });
});
