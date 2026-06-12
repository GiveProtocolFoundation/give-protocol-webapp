/**
 * Cypress Supabase auth helper — service-role session bootstrap.
 *
 * Creates real Supabase PKCE sessions for headless e2e testing by using
 * the Admin API (service-role key) to provision test users and sign them in.
 *
 * Required env vars (set in cypress.env.json or CI secrets):
 *   CYPRESS_SUPABASE_URL          — Supabase project URL
 *   CYPRESS_SUPABASE_ANON_KEY     — Supabase anon/public key
 *   CYPRESS_SUPABASE_SERVICE_ROLE_KEY — Supabase service-role key (test env only)
 *
 * @module cypress/support/supabase-auth
 */

import { createClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";

/* ---------- env helpers ---------- */

function requireEnv(name: string): string {
  const value = Cypress.env(name);
  if (!value) {
    throw new Error(
      `Missing Cypress env var: ${name}. ` +
        "Set it in cypress.env.json or via CYPRESS_ prefix.",
    );
  }
  return String(value);
}

/* ---------- admin client (lazy singleton) ---------- */

let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient(): ReturnType<typeof createClient> {
  if (_adminClient) return _adminClient;
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _adminClient;
}

/* ---------- anon client (lazy singleton) ---------- */

let _anonClient: ReturnType<typeof createClient> | null = null;

function getAnonClient(): ReturnType<typeof createClient> {
  if (_anonClient) return _anonClient;
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  _anonClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      flowType: "pkce",
    },
  });
  return _anonClient;
}

/* ---------- storage-key helper ---------- */

/**
 * Derives the localStorage key that the in-app Supabase client writes
 * its session to.  Format: `sb-<project-ref>-auth-token`.
 */
function getStorageKey(): string {
  const url = requireEnv("SUPABASE_URL");
  // URL is typically https://<project-ref>.supabase.co
  const match = new URL(url).hostname.match(/^([^.]+)/);
  const ref = match ? match[1] : "localhost";
  return `sb-${ref}-auth-token`;
}

/* ---------- public API ---------- */

interface TestUserOptions {
  email?: string;
  password?: string;
  /** User metadata to attach (e.g. { type: "donor" }) */
  metadata?: Record<string, unknown>;
  /**
   * If true, also set `age_affirmed_at` on the profile so the user is
   * treated as having already completed the age-gate.
   */
  ageAffirmed?: boolean;
}

interface TestSession {
  user: User;
  session: Session;
}

/**
 * Provisions a test user via the Admin API and returns a valid session.
 *
 * 1. Creates the user (or reuses if the email already exists).
 * 2. Signs in with password using the anon client to get a PKCE session.
 * 3. Optionally stamps `age_affirmed_at` on the profile.
 */
async function createTestSession(
  opts: TestUserOptions = {},
): Promise<TestSession> {
  const admin = getAdminClient();
  const anon = getAnonClient();

  const email = opts.email ?? `e2e-${Date.now()}@test.giveprotocol.io`;
  const password = opts.password ?? "Test1234!e2e";

  // 1. Create or retrieve user via admin
  let user: User;
  const { data: createData, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: opts.metadata ?? { type: "donor" },
    });

  if (createErr) {
    // User may already exist — try to look them up
    if (
      createErr.message?.includes("already been registered") ||
      createErr.message?.includes("already exists")
    ) {
      const { data: listData } = await admin.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === email);
      if (!existing) throw createErr;
      // Reset password so we can sign in
      await admin.auth.admin.updateUserById(existing.id, { password });
      user = existing;
    } else {
      throw createErr;
    }
  } else {
    user = createData.user;
  }

  // 2. Sign in with password to get a PKCE-compatible session
  const { data: signInData, error: signInErr } =
    await anon.auth.signInWithPassword({ email, password });

  if (signInErr || !signInData.session) {
    throw signInErr ?? new Error("signInWithPassword returned no session");
  }

  // 3. Optionally stamp age_affirmed_at
  if (opts.ageAffirmed) {
    await admin
      .from("profiles")
      .update({ age_affirmed_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return { user, session: signInData.session };
}

/**
 * Injects a Supabase session into the browser's localStorage so the
 * in-app Supabase client picks it up on next page load.
 */
function injectSession(session: Session): void {
  const key = getStorageKey();
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
}

/* ---------- Cypress commands ---------- */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress requires this namespace declaration pattern for custom commands
  namespace Cypress {
    interface Chainable {
      /**
       * Creates a test user via Supabase Admin API and injects a valid
       * session into localStorage.  Requires service-role env vars.
       */
      supabaseLogin(opts?: TestUserOptions): Chainable<TestSession>;

      /**
       * Clears the Supabase session from localStorage so the app sees
       * the user as signed out.
       */
      supabaseLogout(): Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  "supabaseLogin",
  (opts: TestUserOptions = {}): Cypress.Chainable<TestSession> => {
    return cy.wrap(
      createTestSession(opts).then((result) => {
        injectSession(result.session);
        return result;
      }),
      { timeout: 30_000 },
    );
  },
);

Cypress.Commands.add("supabaseLogout", () => {
  const key = getStorageKey();
  window.localStorage.removeItem(key);
});

export type { TestUserOptions, TestSession };
