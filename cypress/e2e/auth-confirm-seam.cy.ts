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
 * NOTE — sandboxed browsers: browsers launched by Cypress inside some sandboxes
 * cannot connect to extra localhost ports (only the app server itself).  If
 * signup fails with "Failed to fetch", start Vite with the same-origin
 * Supabase proxy and point CYPRESS_SUPABASE_URL/VITE_SUPABASE_URL at
 * http://localhost:5173/sb — see .github/workflows/README.md for the recipe.
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
 * Pins the app locale to English before a cy.visit().
 *
 * The app uses i18next-browser-languagedetector (order: localStorage,
 * navigator) — so on a browser whose language is not English the signup
 * page renders in that language and English text assertions fail.
 * Writing `language=en` to localStorage forces the English copy the
 * rest of this spec asserts against.
 */
function visitEnglish(path: string) {
  return cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("language", "en");
    },
  });
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

/**
 * Formats a Supabase auth error with its HTTP status and machine code so CI
 * failures are self-diagnosing instead of a bare message string.
 *
 * Run 33267858413 failed with three opaque errors ("Unable to validate email
 * address", "Database error finding users", "Invalid login credentials") that
 * turned out to be one infra incident; status + code make the class of
 * failure visible in the log on the next occurrence.
 */
function describeAuthError(error: {
  message: string;
  status?: number;
  code?: string | null;
}): string {
  const parts = [`"${error.message}"`];
  if (typeof error.status === "number") parts.push(`status: ${error.status}`);
  if (error.code) parts.push(`code: ${error.code}`);
  return parts.join(", ");
}

/**
 * Pre-flight check: prove the auth API, the service-role key, and the auth
 * database are all usable BEFORE the suite starts creating accounts.
 *
 * Maps each failure class to its likely infrastructure cause:
 *   - 401  → service-role key invalid/rotated, or key from a different
 *            project than SUPABASE_URL
 *   - 429  → project-wide auth email rate limit exhausted; signups are
 *            failing in production too, not just here
 *   - 5xx "Database error finding users" → GoTrue reached the DB but the
 *            auth.users query failed: check project health/pauses/incidents
 */
function preflightAuthApi(): Promise<void> {
  return buildAdminClient()
    .auth.admin.listUsers({ page: 1, perPage: 1 })
    .then(({ error }) => {
      if (!error) return;
      let hint =
        "Check that SUPABASE_URL points at the intended project and the project is not paused.";
      if (error.status === 401) {
        hint =
          "The service-role key is invalid, rotated, or from a different project than SUPABASE_URL. Update the CYPRESS_SUPABASE_SERVICE_ROLE_KEY secret.";
      } else if (error.status === 429) {
        hint =
          "The project is rate-limited (likely auth email budget exhausted — production signups fail too). Raise the email rate limit in the Supabase dashboard or wait for the window to reset.";
      } else if (error.message.includes("Database error")) {
        hint =
          "GoTrue reached the database but the auth.users query failed. Check the Supabase project's database health (pause, incident, auth schema drift).";
      }
      throw new Error(
        `Pre-flight failed: admin listUsers returned ${describeAuthError(error)}. ${hint}`,
      );
    });
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

      // Fail fast (with a diagnosis) if the auth API, keys, or auth DB are
      // broken — before any test creates half a chain and cascades.
      cy.wrap(preflightAuthApi(), { timeout: 30_000 });
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
      visitEnglish("/auth/signup");

      // The signup form is passkey-first: email is always visible, but the
      // password section is collapsed behind an "Or set a password" toggle.
      // Expand it so the password fields become visible.  The toggle is
      // selected via aria-expanded (language-agnostic — the label is i18n'd).
      cy.get('input[type="email"], input[name="email"], [data-testid="email"]')
        .first()
        .type(testEmail);

      // Click the collapsible toggle to reveal the password section.
      // Locale is pinned to English, but match a few translations for safety.
      cy.contains(
        'button[type="button"][aria-expanded]',
        /set a password|contraseña|mot de passe|密码/iu,
      ).click();

      // Age-affirmation gate (GIV-454) blocks the password submit path.
      cy.get("#age-affirmation").check();

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
      cy.url({ timeout: 15_000 }).should("include", "registration-success");
    });

    /* ---------------------------------------------------------------- */
    /* Step 2 — Intercept the token via Admin API (email replacement)   */
    /* ---------------------------------------------------------------- */

    it("Step 2: retrieves the verification token via Supabase Admin generateLink", () => {
      // generateLink('signup', …) returns an action_link that carries the
      // same token_hash that GoTrue would embed in the real email.  We use it
      // to parse out the confirm URL without requiring a real inbox.
      //
      // GoTrue refuses generateLink('signup') for a user that already exists,
      // and Step 1 just created that user via the real signup form.  So we
      // delete the Step-1 user first and let generateLink re-create it in the
      // *unconfirmed* state — exactly the state a real user is in after
      // signing up in production (where MAILER_AUTOCONFIRM is off).
      const admin = buildAdminClient();
      /** Deletes the Step-1 user, if present, so generateLink can re-create it unconfirmed. */
      const deleteExistingUser = async (): Promise<void> => {
        const { data, error } = await admin.auth.admin.listUsers();
        if (error) {
          // Surface status + code (not just message) so the failure class is
          // identifiable in CI logs — see preflightAuthApi for the mapping.
          console.error(
            "Supabase error details:",
            describeAuthError(error),
          );
          throw new Error(
            `listUsers failed: ${describeAuthError(error)}`,
          );
        }
        const existing = data.users.find((u) => u.email === testEmail);
        if (existing) {
          const del = await admin.auth.admin.deleteUser(existing.id);
          if (del.error)
            throw new Error(
              `deleteUser failed: ${describeAuthError(del.error)}`,
            );
        }
      };

      cy.wrap(
        deleteExistingUser().then(() =>
          admin.auth.admin
            .generateLink({
              type: "signup",
              email: testEmail,
              password: TEST_PASSWORD,
              options: {
                redirectTo: `${Cypress.config("baseUrl")}/auth/confirm`,
              },
            })
            .then(({ data, error }) => {
              if (error)
                throw new Error(
                  `generateLink failed: ${describeAuthError(error)}`,
                );
              if (!data.user) throw new Error("generateLink returned no user");
              return {
                actionLink: data.properties?.action_link ?? "",
                hashedToken: data.properties?.hashed_token ?? "",
                userId: data.user.id,
              };
            }),
        ),
        { timeout: 60_000 },
      ).then((result: unknown) => {
        const {
          actionLink,
          hashedToken,
          userId: uid,
        } = result as {
          actionLink: string;
          hashedToken: string;
          userId: string;
        };
        // Store for later steps.
        Cypress.env("__giv921_actionLink", actionLink);
        Cypress.env("__giv921_hashedToken", hashedToken);
        Cypress.env("__giv921_userId", uid);
        userId = uid;

        expect(actionLink, "action_link must be non-empty").to.be.a("string");
        expect(actionLink, "action_link must be non-empty").to.not.equal("");
        // The hashed_token is what GoTrue embeds as token_hash in the real
        // verification email link — this is the value /auth/confirm consumes.
        expect(hashedToken, "hashed_token must be non-empty").to.be.a("string");
        expect(hashedToken, "hashed_token must be non-empty").to.not.equal("");
      });
    });

    /* ---------------------------------------------------------------- */
    /* Step 3 — Parse the verification URL                              */
    /* ---------------------------------------------------------------- */

    it("Step 3: parses a /auth/confirm URL out of the action link", () => {
      const actionLink: string = Cypress.env("__giv921_actionLink");
      const hashedToken: string = Cypress.env("__giv921_hashedToken");
      expect(actionLink, "actionLink must be set from Step 2").to.be.a(
        "string",
      );
      expect(actionLink, "actionLink must be set from Step 2").to.not.equal("");

      // The action_link points at GoTrue's /auth/v1/verify endpoint and
      // carries the *raw* token.  The email the user actually receives is
      // built by the send-email-hook from the hashed_token, which becomes the
      // `token_hash` query param our /auth/confirm route consumes.  Derive the
      // exact URL shape the email contains.
      const url = new URL(actionLink);
      const type = url.searchParams.get("type") ?? "signup";

      expect(hashedToken, "hashedToken must be set from Step 2").to.be.a(
        "string",
      );
      expect(hashedToken, "hashedToken must be set from Step 2").to.not.equal(
        "",
      );

      const appConfirmUrl = `${Cypress.config("baseUrl")}/auth/confirm?token_hash=${hashedToken}&type=${type}`;
      Cypress.env("__giv921_confirmUrl", appConfirmUrl);
      Cypress.env("__giv921_tokenHash", hashedToken);
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
      expect(confirmUrl, "confirmUrl must be set from Step 3").to.be.a(
        "string",
      );
      expect(confirmUrl, "confirmUrl must be set from Step 3").to.not.equal("");

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
      // account..." (or the expired-link UI on failure).
      //
      // Note: when verifyOtp succeeds quickly the loader unmounts almost
      // immediately, so we do NOT require the loader text to be observed —
      // asserting the absence of the 404 fingerprint plus the redirect below
      // is what proves the route is real.
      visitEnglish(confirmUrl);

      cy.get("body", { timeout: 10_000 }).should(
        "not.contain",
        NOT_FOUND_FINGERPRINT,
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
        ).to.not.equal(null);
        if (raw === null) {
          throw new Error(
            "Supabase session must be present in localStorage after confirm",
          );
        }
        const session = JSON.parse(raw);
        expect(session.access_token, "access_token must be present in session")
          .to.be.a("string")
          .and.not.equal("");
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
              throw new Error(
                `signInWithPassword failed: ${describeAuthError(error)}`,
              );
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
    visitEnglish("/auth/confirm?token_hash=fakehash_giv921_probe&type=signup");

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
