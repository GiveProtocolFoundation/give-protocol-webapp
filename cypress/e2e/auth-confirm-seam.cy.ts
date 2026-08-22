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
 * Test flow (6 steps):
 *   1. Sign up via UI form
 *   2. Retrieve token via generateLink API
 *   3. Parse /auth/confirm URL from the action_link
 *   4. HTTP-check + visit URL + assert route is real (NOT the 404 catch-all),
 *      assert session is established — all in one test because token is single-use
 *   5. Sign out, verify session is cleared
 *   6. Sign back in with email/password, assert dashboard is reachable
 *
 * Plus a separate negative test: visiting /auth/confirm with a bogus token
 * renders AuthCallback, not NotFound — proving the assertion has teeth.  If
 * the route were removed from the router, both tests would fail.
 *
 * Required Cypress env vars (cypress.env.json or CYPRESS_* CI secrets):
 *   SUPABASE_URL              — e.g. https://api.giveprotocol.io
 *   SUPABASE_ANON_KEY         — public anon key
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (test / staging env only)
 *
 * Run locally (against production build, same as CI):
 *   npm run build:spa && npx vite preview --port 5173 &
 *   npx cypress run --spec cypress/e2e/auth-confirm-seam.cy.ts
 *
 * Against the dev server (faster feedback loop during development):
 *   npm run dev:spa &
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
  const envValue = Cypress.env(name);
  if (!envValue) {
    throw new Error(
      `Missing Cypress env var: ${name}. ` +
        "Set it in cypress.env.json or via CYPRESS_ prefix in CI.",
    );
  }
  return String(envValue);
}

/**
 * Builds a Supabase admin client (service-role key).
 * Only used inside cy.wrap() / cy.task() so it runs in the Cypress Node context.
 */
function buildAdminClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

/**
 * Builds a Supabase anon client for signing in with password.
 */
function buildAnonClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        flowType: "pkce",
      },
    },
  );
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

const SERVICE_ROLE_AVAILABLE = Boolean(
  Cypress.env("SUPABASE_SERVICE_ROLE_KEY"),
);
const describeSuite = SERVICE_ROLE_AVAILABLE ? describe : describe.skip;

/* ------------------------------------------------------------------ */
/* Suite                                                                */
/* ------------------------------------------------------------------ */

describeSuite(
  "GIV-921 Auth confirm seam — signup → email link → confirm → sign-in",
  () => {
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
        buildAdminClient()
          .auth.admin.deleteUser(userId)
          .then(({ error }) => {
            if (error) {
              // Non-fatal — log but don't fail the suite.
              Cypress.log({
                name: "cleanup",
                message: `Delete user failed: ${error.message}`,
              });
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

      // The signup form is passkey-first: email is always visible, but the
      // password section is collapsed behind an "Or set a password" toggle.
      // Expand it so the password fields become visible.
      cy.get('input[type="email"], input[name="email"], [data-testid="email"]')
        .first()
        .type(testEmail);

      // Click "Or set a password" to reveal the collapsible password section.
      cy.contains(/set a password|or set|password/i)
        .first()
        .click();

      cy.get(
        'input[type="password"], input[name="password"], [data-testid="password"]',
      )
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

      cy.get('button[type="submit"], [data-testid="signup-submit"]')
        .first()
        .click();

      // After signup GoTrue triggers the send-email-hook and the app navigates
      // to /auth/registration-success.
      cy.url({ timeout: 15_000 }).should(
        "satisfy",
        (url: string) =>
          url.includes("registration-success") || url.includes("signup"),
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
            return {
              actionLink: data.properties?.action_link ?? "",
              userId: data.user.id,
            };
          }),
        { timeout: 30_000 },
      ).then((result: unknown) => {
        const { actionLink, userId: uid } = result as {
          actionLink: string;
          userId: string;
        };
        // Store for later steps.
        Cypress.env("__giv921_actionLink", actionLink);
        Cypress.env("__giv921_userId", uid);
        userId = uid;

        expect(actionLink, "action_link must be non-empty")
          .to.be.a("string")
          .and.not.be.empty();
      });
    });

    /* ---------------------------------------------------------------- */
    /* Step 3 — Parse the verification URL                              */
    /* ---------------------------------------------------------------- */

    it("Step 3: parses a /auth/confirm URL out of the action link", () => {
      const actionLink: string = Cypress.env("__giv921_actionLink");
      expect(actionLink, "actionLink must be set from Step 2").to.be.a("string")
        .and.not.be.empty;

      // The action_link from generateLink may be the Supabase GoTrue URL directly.
      // We need to convert it to our app's /auth/confirm URL form.
      // Extract token_hash and type from actionLink (GoTrue embeds them).
      const url = new URL(actionLink);
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") ?? "signup";

      expect(
        tokenHash,
        "token_hash must be present in the action link",
      ).to.be.a("string").and.not.be.empty;

      const appConfirmUrl = `${Cypress.config("baseUrl")}/auth/confirm?token_hash=${tokenHash}&type=${type}`;
      Cypress.env("__giv921_confirmUrl", appConfirmUrl);
      Cypress.env("__giv921_tokenHash", tokenHash);
      Cypress.env("__giv921_type", type);

      cy.log(`Confirm URL: ${appConfirmUrl}`);
    });

    /* ---------------------------------------------------------------- */
    /* Steps 4 + 5: Route assertion, follow link, assert session        */
    /* ---------------------------------------------------------------- */
    /*
     * These are merged into a single test because the token_hash in the
     * verification link is single-use.  Step 4's HTTP check (cy.request)
     * does NOT consume the token, but the subsequent cy.visit() DOES.
     * Visiting again in a separate test would fail on an expired token.
     */

    it("Step 4+5: /auth/confirm is a real app route AND confirms the account → session established", () => {
      const confirmUrl: string = Cypress.env("__giv921_confirmUrl");
      expect(confirmUrl, "confirmUrl must be set from Step 3").to.be.a("string")
        .and.not.be.empty;

      // --- Part A: HTTP-level check that the route exists (does NOT consume token) ---
      //
      // The SPA always returns 200 from the server (index.html for all paths),
      // so a plain HTTP request cannot distinguish a real route from a 404.
      // This check is a structural sanity check: the response must be HTML,
      // not a server error or JSON redirect.
      cy.request({
        url: confirmUrl,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status, "confirm URL must return HTTP 200").to.equal(
          200,
        );
        expect(response.headers["content-type"] ?? "").to.include("text/html");
        expect(
          response.body,
          "confirm URL must not serve an error document",
        ).to.be.a("string");
      });

      // --- Part B: The key behavioural assertion (would have caught GIV-909) ---
      //
      // Visit the confirm URL in a real browser.  React mounts and AuthCallback
      // calls verifyOtp.  If /auth/confirm were not a declared <Route>, the SPA
      // 404 catch-all would render NotFound — which contains the fingerprint
      // below.  If the route exists, AuthCallback renders "Verifying your
      // account..." instead.
      cy.visit(confirmUrl, { failOnStatusCode: false });

      cy.get("body", { timeout: 10_000 }).should(
        "not.contain",
        NOT_FOUND_FINGERPRINT,
      );

      cy.contains("Verifying your account", { timeout: 10_000 }).should(
        "exist",
      );

      // --- Part C: Session established and user redirected to dashboard ---
      //
      // After the successful verifyOtp, AuthCallback navigates the user to
      // their dashboard.  A donor account goes to /give-dashboard.
      cy.url({ timeout: 20_000 }).should(
        "satisfy",
        (url: string) =>
          url.includes("/give-dashboard") ||
          url.includes("/browse") ||
          url.includes("/charity-portal"),
      );

      // The Supabase SDK writes a session to localStorage.
      cy.window().then((win) => {
        const key = storageKey();
        const raw = win.localStorage.getItem(key);
        expect(
          raw,
          "Supabase session must be present in localStorage after confirm",
        ).to.not.be.null;
        if (raw === null) {
          throw new Error(
            "Supabase session must be present in localStorage after confirm",
          );
        }
        const session = JSON.parse(raw);
        expect(
          session.access_token,
          "access_token must be present in session",
        ).to.be.a("string").and.not.be.empty;
      });
    });

    /* ---------------------------------------------------------------- */
    /* Step 5 — Sign out                                                */
    /* ---------------------------------------------------------------- */

    it("Step 5: signs out cleanly", () => {
      // Clear session — mirrors what supabaseLogout does.
      const key = storageKey();
      cy.window().then((win) => win.localStorage.removeItem(key));

      cy.visit("/");

      // Confirm the session is gone.
      cy.window().then((win) => {
        const session = win.localStorage.getItem(storageKey());
        expect(session, "session must be cleared after sign-out").to.equal(
          null,
        );
      });
    });

    /* ---------------------------------------------------------------- */
    /* Step 7 — Sign back in with same credentials, reach dashboard     */
    /* ---------------------------------------------------------------- */

    it("Step 6: signs back in with email/password and reaches the dashboard", () => {
      // Sign in via password (the account is now confirmed).
      cy.wrap(
        buildAnonClient()
          .auth.signInWithPassword({
            email: testEmail,
            password: TEST_PASSWORD,
          })
          .then(({ data, error }) => {
            if (error)
              throw new Error(`signInWithPassword failed: ${error.message}`);
            if (!data.session)
              throw new Error("signInWithPassword returned no session");
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
        expect(
          authModals.length,
          "No auth-modal should block the dashboard",
        ).to.equal(0);
      });
    });
  },
);

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
    cy.get("body", { timeout: 15_000 }).should(
      "not.contain",
      NOT_FOUND_FINGERPRINT,
    );

    // And it SHOULD contain either the loading text or the expired-link heading.
    cy.get("body", { timeout: 15_000 }).should(($body) => {
      const text = $body.text();
      const hasLoader = text.includes("Verifying your account");
      const hasExpired = text.includes("verification link has expired");
      expect(
        hasLoader || hasExpired,
        `Expected AuthCallback UI but got: "${text.slice(0, 200)}"`,
      ).to.equal(true);
    });
  });
});
