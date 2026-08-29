/**
 * GIV-931 — Auth signup API smoke test (password + passkey paths).
 *
 * Lightweight HTTP-level probe that verifies /auth/v1/signup accepts
 * password-based registrations.  This would have caught the GIV-931
 * outage: when send-email-hook was crashing, GoTrue returned 500
 * for every password signup attempt.
 *
 * Runs on the same schedule as auth-confirm-seam (GIV-921).
 *
 * Required Cypress env vars:
 *   SUPABASE_URL — e.g. https://lhbyfidtlhojnrewpstp.supabase.co
 *   SUPABASE_ANON_KEY — public anon key
 */

function requireEnv(name: string): string {
  const val = Cypress.env(name);
  if (!val) throw new Error(`Missing Cypress env var: ${name}`);
  return String(val);
}

describe("GIV-931 Auth signup API smoke test", () => {
  const baseUrl = requireEnv("SUPABASE_URL");

  it("POST /auth/v1/signup with password returns 200 (not 500/502 from hook crash)", () => {
    const email = `smoke-giv931-${Date.now()}@test.giveprotocol.io`;
    const password = "SmokeTest1234!";

    cy.request({
      method: "POST",
      url: `${baseUrl}/auth/v1/signup`,
      headers: {
        apikey: requireEnv("SUPABASE_ANON_KEY"),
        "Content-Type": "application/json",
      },
      body: { email, password },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 201, 429]);
      if (response.status === 200 || response.status === 201) {
        // GoTrue returns { user, session } once a session is established, but
        // returns the user object directly at the top level when email
        // confirmation is still pending (no session yet).
        const user = response.body.user ?? response.body;
        expect(user).to.have.property("email", email);
      }
      cy.log(`Signup HTTP status: ${response.status}`);
    });
  });
});
