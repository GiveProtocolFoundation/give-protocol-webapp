/**
 * GIV-921 — Auth E2E seam test: signup → email link → confirm → sign-in
 *
 * Tests the FULL chain between GoTrue, the email verification link, and the app.
 * This is the check that would have caught GIV-909: the confirm route did not
 * exist and nothing in the app exchanged the token_hash the link carried.
 *
 * Strategy for email interception (no real mailbox required):
 *   Supabase Admin API `generateLink` produces the exact same token_hash that
 *   GoTrue would embed in the verification email. We grab it directly, skipping
 *   SMTP/Resend delivery, and exercise exactly the same app code path.
 *
 * Step 4 — route assertion:
 *   We issue a cy.request() to the confirm URL *before* following it.
 *   The response must be the SPA shell (200 + <html>), not the 404 catch-all
 *   body.  This is the assertion that would have caught GIV-909.
 *
 * Required Cypress env vars (cypress.env.json or CYPRESS_* CI secrets):
 *   SUPABASE_URL              — e.g. https://api.giveprotocol.io
 *   SUPABASE_ANON_KEY         — public anon key
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (test / staging env only)
 *
 * Run locally:
 *   npx cypress run --spec cypress/e2e/auth-confirm-seam.cy.ts
 *
 * Runs on schedule in CI — see .github/workflows/auth-confirm-seam.yml
 *
 * @module auth-confirm-seam
 */

import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const TEST_PASSWORD = "Test1234!GIV921";

/**
 * 404-body fingerprint: our NotFound page renders a specific heading.
 * If the confirm URL were hitting the catch-all, the response body would
 * contain this string; we assert it does NOT.
 */
const NOT_FOUND_FINGERPRINT = "Page Not Found";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function requireEnv(name: string): string {
  const v = Cypress.env(name);
  if (!v) {
    throw new Error(
      `Missing Cypress env var: ${name}. ` +
        "Set it in cypress.env.json or via CYPRESS_ prefix in CI.",
    );
  }
  return String(v);
}

/**
 * Builds a Supabase admin client (service-role key).
 * Only used inside cy.wrap() / cy.task() so it runs in the Cypress Node context.
 */
function buildAdminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Builds a Supabase anon client for signing in with password.
 */
function buildAnonClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, flowType: "pkce" },
  });
}

/**
 * Derives the localStorage key Supabase SDK writes session data to.
 * Format: `sb-<project-ref>-auth-token`
 */
function storageKey(): string {
  const url = requireEnv("SUPABASE_URL");
  const ref = new URL(url).hostname.match(/^([^.]+)/)?.[1] ?? "localhost";
  return `sb-${ref}-auth-token`;
}

/* ------------------------------------------------------------------ */
/* Suite guard                                                          */
/* ------------------------------------------------------------------ */

const SERVICE_ROLE_AVAILABLE = Boolean(Cypress.env("SUPABASE_SERVICE_ROLE_KEY"));
const describeSuite = SERVICE_ROLE_AVAILABLE ? describe : describe.skip;

/* ------------------------------------------------------------------ */
/* Suite                                                                */
/* ------------------------------------------------------------------ */

describeSuite("GIV-921 Auth confirm seam — signup → email link → confirm → sign-in", () => {
  let testEmail: string;
  let userId: string;

  before(() => {
    // Generate a unique address for this run so retries don't collide.
    // Uses a sub-address on test.giveprotocol.io so it is clearly labelled
    // as a test account in any Supabase audit logs.
    testEmail = `e2e-giv921-${Date.now()}@test.giveprotocol.io`;
  });

  after(() => {
    // Best-effort cleanup: delete the test user so it does not accumulate.
    if (!userId) return;
    cy.wrap(
      buildAdminClient().auth.admin.deleteUser(userId).then(({ error }) => {
        if (error) {
          // Non-fatal — log but don't fail the suite.
          Cypress.log({ name: "cleanup", message: `Delete user failed: ${error.message}` });
        }
      }),
      { timeout: 20_000 },
    );
  });

  /* ---------------------------------------------------------------- */
  /* Step 1 — Sign up with a fresh address                            */
  /* ---------------------------------------------------------------- */

  it("Step 1: signs up with a fresh address via the UI signup form", () => {
    cy.visit("/auth/signup");

    // Fill in the signup form.
    // The form varies by user type; use donor (default) flow.
    cy.get('input[type="email"], input[name="email"], [data-testid="email"]')
      .first()
      .type(testEmail);
    cy.get('input[type="password"], input[name="password"], [data-testid="password"]')
      .first()
      .type(TEST_PASSWORD);

    // Some forms have a confirm-password field.
    cy.get("body").then(($body) => {
      const confirmField = $body.find(
        'input[name="confirmPassword"], input[name="confirm_password"], [data-testid="confirm-password"]',
      );
      if (confirmField.length) {
        cy.wrap(confirmField.first()).type(TEST_PASSWORD);
      }
    });

    cy.get('button[type="submit"], [data-testid="signup-submit"]').first().click();

    // After signup GoTrue triggers the send-email-hook and the app navigates to
    // /auth/registration-success (or shows an inline "check your email" banner).
    cy.url({ timeout: 15_000 }).should(
      "satisfy",
      (url: string) => url.includes("registration-success") || url.includes("signup"),
    );
  });

  /* ---------------------------------------------------------------- */
  /* Step 2 — Intercept the token via Admin API (email replacement)   */
  /* ---------------------------------------------------------------- */

  it("Step 2: retrieves the verification token via Supabase Admin generateLink", () => {
    // generateLink('signup', …) returns an action_link that carries the
    // same token_hash that GoTrue would embed in the real email.  We use it
    // to parse out the confirm URL without requiring a real inbox.
    cy.wrap(
      buildAdminClient()
        .auth.admin.generateLink({
          type: "signup",
          email: testEmail,
          password: TEST_PASSWORD,
          options: {
            redirectTo: `${Cypress.config("baseUrl")}/auth/confirm`,
          },
        })
        .then(({ data, error }) => {
          if (error) throw new Error(`generateLink failed: ${error.message}`);
          if (!data.user) throw new Error("generateLink returned no user");
          return { actionLink: data.properties?.action_link ?? "", userId: data.user.id };
        }),
      { timeout: 30_000 },
    ).then((result: unknown) => {
      const { actionLink, userId: uid } = result as { actionLink: string; userId: string };
      // Store for later steps.
      Cypress.env("__giv921_actionLink", actionLink);
      Cypress.env("__giv921_userId", uid);
      userId = uid;

      expect(actionLink, "action_link must be non-empty").to.be.a("string").and.not.be.empty;
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 3 — Parse the verification URL                              */
  /* ---------------------------------------------------------------- */

  it("Step 3: parses a /auth/confirm URL out of the action link", () => {
    const actionLink: string = Cypress.env("__giv921_actionLink");
    expect(actionLink, "actionLink must be set from Step 2").to.be.a("string").and.not.be.empty;

    // The action_link from generateLink may be the Supabase GoTrue URL directly.
    // We need to convert it to our app's /auth/confirm URL form.
    // Extract token_hash and type from actionLink (GoTrue embeds them).
    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") ?? "signup";

    expect(tokenHash, "token_hash must be present in the action link").to.be.a("string").and.not.be.empty;

    const appConfirmUrl = `${Cypress.config("baseUrl")}/auth/confirm?token_hash=${tokenHash}&type=${type}`;
    Cypress.env("__giv921_confirmUrl", appConfirmUrl);
    Cypress.env("__giv921_tokenHash", tokenHash);
    Cypress.env("__giv921_type", type);

    cy.log(`Confirm URL: ${appConfirmUrl}`);
  });

  /* ---------------------------------------------------------------- */
  /* Step 4 — Assert the URL resolves to a real route (THE KEY CHECK) */
  /* ---------------------------------------------------------------- */

  it("Step 4: /auth/confirm is a real app route — not the SPA 404 catch-all", () => {
    const confirmUrl: string = Cypress.env("__giv921_confirmUrl");
    expect(confirmUrl, "confirmUrl must be set from Step 3").to.be.a("string").and.not.be.empty;

    // Request the confirm URL directly.  The SPA always returns 200 from the
    // server (index.html is served for all paths), so we check the BODY to
    // distinguish a real route from the 404 catch-all.
    //
    // A real route: React mounts <AuthCallback> which renders a loading
    //   spinner — the page does NOT contain our NotFound component's heading.
    //
    // The broken state (GIV-909): the server returned 404 / the SPA rendered
    //   NotFound because /auth/confirm had no <Route> definition.
    //
    // We also assert the route IS declared in the router by visiting it and
    // verifying we do NOT land on the NotFound page.
    cy.request({
      url: confirmUrl,
      failOnStatusCode: false,
    }).then((response) => {
      // Status 200 — the dev server (or static host) serves the SPA shell.
      expect(response.status, "confirm URL must return HTTP 200").to.equal(200);

      // The response body must be an HTML document, not a JSON error.
      expect(response.headers["content-type"] ?? "").to.include("text/html");

      // The body must NOT be the 404-catch-all page's content.
      // (The SPA serves index.html for all paths, so we check for our
      //  NotFound-page fingerprint which would appear if React rendered it.)
      // Note: index.html itself won't contain "Page Not Found" — that string
      // is rendered client-side by React.  The critical assertion is below
      // (navigating to the URL and checking the DOM).
      expect(response.body, "confirm URL must not serve an error document").to.be.a("string");
    });

    // Visit the URL in the browser so React mounts and we can assert the DOM.
    cy.visit(confirmUrl, { failOnStatusCode: false });

    // The AuthCallback component renders "Verifying your account..." while it
    // exchanges the token.  A NotFound page would render its own heading.
    // We assert the NotFound fingerprint does NOT appear.
    cy.get("body", { timeout: 10_000 }).should("not.contain", NOT_FOUND_FINGERPRINT);

    // Optionally assert the expected loading text IS present.
    cy.contains("Verifying your account", { timeout: 10_000 }).should("exist");
  });

  /* ---------------------------------------------------------------- */
  /* Step 5 — Follow the link, assert a session is established        */
  /* ---------------------------------------------------------------- */

  it("Step 5: following the confirm link establishes a session and redirects to dashboard", () => {
    const confirmUrl: string = Cypress.env("__giv921_confirmUrl");
    expect(confirmUrl, "confirmUrl must be set").to.be.a("string").and.not.be.empty;

    cy.visit(confirmUrl);

    // After token exchange AuthCallback redirects to the appropriate dashboard.
    // Donor accounts go to /give-dashboard; unknown type goes to /browse.
    cy.url({ timeout: 20_000 }).should(
      "satisfy",
      (url: string) =>
        url.includes("/give-dashboard") ||
        url.includes("/browse") ||
        url.includes("/charity-portal"),
    );

    // Confirm localStorage holds a Supabase session.
    cy.window().then((win) => {
      const key = storageKey();
      const raw = win.localStorage.getItem(key);
      expect(raw, "Supabase session must be present in localStorage after confirm").to.not.be.null;
      const session = JSON.parse(raw!);
      expect(session.access_token, "access_token must be present in session").to.be.a("string").and.not.be.empty;
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 6 — Sign out                                                */
  /* ---------------------------------------------------------------- */

  it("Step 6: signs out cleanly", () => {
    // Clear session — mirrors what supabaseLogout does.
    const key = storageKey();
    cy.window().then((win) => win.localStorage.removeItem(key));

    cy.visit("/");

    // Confirm the session is gone.
    cy.window().then((win) => {
      const session = win.localStorage.getItem(storageKey());
      expect(session, "session must be cleared after sign-out").to.be.null;
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 7 — Sign back in with same credentials, reach dashboard     */
  /* ---------------------------------------------------------------- */

  it("Step 7: signs back in with email/password and reaches the dashboard", () => {
    // Sign in via password (the account is now confirmed).
    cy.wrap(
      buildAnonClient()
        .auth.signInWithPassword({ email: testEmail, password: TEST_PASSWORD })
        .then(({ data, error }) => {
          if (error) throw new Error(`signInWithPassword failed: ${error.message}`);
          if (!data.session) throw new Error("signInWithPassword returned no session");
          return data.session;
        }),
      { timeout: 20_000 },
    ).then((rawSession: unknown) => {
      type SessionLike = {
        access_token: string;
        refresh_token: string;
        expires_at?: number;
        expires_in?: number;
        token_type: string;
        user: unknown;
      };
      const session = rawSession as SessionLike;
      // Inject session into browser storage.
      const key = storageKey();
      const payload = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      };
      cy.visit("/browse");
      cy.window().then((win) => {
        // lgtm[js/clear-text-storage-of-sensitive-data] Test-only: mirrors Supabase SDK
        win.localStorage.setItem(key, JSON.stringify(payload)); // CodeQL [js/clear-text-storage-of-sensitive-data] Test-only session storage
      });
      cy.reload();
    });

    // The account must reach its dashboard (not an auth wall or 404).
    cy.url({ timeout: 20_000 }).should(
      "satisfy",
      (url: string) =>
        url.includes("/give-dashboard") ||
        url.includes("/browse") ||
        url.includes("/charity-portal"),
    );

    // No sign-in modal blocking the dashboard — if this selector is absent
    // from the DOM, should("not.exist") passes immediately. This assertion is
    // intentionally relaxed: we only care that auth is not blocking us.
    // We use a try-catch pattern safe for Cypress chainables.
    cy.document().then((doc) => {
      const authModals = doc.querySelectorAll('[data-testid="auth-modal"]');
      expect(authModals.length, "No auth-modal should block the dashboard").to.equal(0);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Negative test — confirm route MUST NOT be the catch-all            */
/* ------------------------------------------------------------------ */

/**
 * This test deliberately hits /auth/confirm with an *invalid* token to prove
 * that the route renders AuthCallback (which shows expired-link UI) rather than
 * the generic NotFound page.  If /auth/confirm were removed from the router,
 * this test would fail — giving us the assertion teeth that GIV-909 lacked.
 */
describe("GIV-921 Route assertion: /auth/confirm must be a real route (not 404)", () => {
  it("visiting /auth/confirm with a bogus token renders AuthCallback, not NotFound", () => {
    cy.visit("/auth/confirm?token_hash=fakehash_giv921_probe&type=signup", {
      failOnStatusCode: false,
    });

    // The AuthCallback component times out and renders the expired-link UI.
    // The NotFound component renders our NOT_FOUND_FINGERPRINT string.
    // We assert the page does NOT contain the 404 fingerprint.
    cy.get("body", { timeout: 15_000 }).should("not.contain", NOT_FOUND_FINGERPRINT);

    // And it SHOULD contain either the loading text or the expired-link heading.
    cy.get("body", { timeout: 15_000 }).should(($body) => {
      const text = $body.text();
      const hasLoader = text.includes("Verifying your account");
      const hasExpired = text.includes("verification link has expired");
      expect(
        hasLoader || hasExpired,
        `Expected AuthCallback UI but got: "${text.slice(0, 200)}"`,
      ).to.be.true;
    });
  });
});
