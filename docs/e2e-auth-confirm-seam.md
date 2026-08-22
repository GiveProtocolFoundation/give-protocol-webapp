# Auth Confirm Seam — E2E Harness (GIV-921)

An automated end-to-end check that walks the **real** auth chain and fails loudly
when any link breaks:

signup → email link → `/auth/confirm` route → token exchange → session →
sign-out → sign-in → dashboard.

This exists because [GIV-909] turned out to be a broken confirmation link (the
email pointed at `/auth/confirm`, a route that did not exist). Every unit test
passed the whole time — this spec covers the seam between GoTrue, the email,
and the app, which is exactly where it broke.

## The spec

`cypress/e2e/auth-confirm-seam.cy.ts`

It has two parts:

1. **The full-chain suite** (Steps 1–7). Runs only when
   `CYPRESS_SUPABASE_SERVICE_ROLE_KEY` is available; otherwise the suite is
   skipped (`describe.skip`) so local runs without secrets stay green.
   - Signs up through the real UI with a fresh `e2e-giv921-<timestamp>@test.giveprotocol.io` address
   - Retrieves the verification token via the Supabase Admin `generateLink`
     API — this returns the same `token_hash` GoTrue embeds in the real email,
     so the check does not depend on a live mailbox (less brittle in CI than
     a disposable-inbox API)
   - Parses the verification URL out of the action link
   - **Asserts the URL resolves to a real route** — this is the check that
     would have caught GIV-909
   - Follows it and asserts a Supabase session lands in `localStorage`
   - Signs out, signs back in with the same credentials, asserts the account
     reaches its dashboard
   - Cleans up the test user via the Admin API

2. **The route-teeth test** (no secrets required). Visits
   `/auth/confirm?token_hash=<bogus>&type=signup` and asserts the page renders
   the AuthCallback UI ("Verifying your account…" / expired-link message), not
   the SPA 404 catch-all. If `/auth/confirm` is ever removed from
   `src/routes/index.tsx`, this test fails.

The teeth are proven: temporarily renaming the route in `src/routes/index.tsx`
made the route test fail with `AssertionError: Expected AuthCallback UI but
got: <NotFound page>`; restoring it made it pass again.

## Required environment

| Variable                            | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `CYPRESS_SUPABASE_URL`              | Supabase project URL                         |
| `CYPRESS_SUPABASE_ANON_KEY`         | Public anon key                              |
| `CYPRESS_SUPABASE_SERVICE_ROLE_KEY` | Service-role key (**test/staging env only**) |

## Run locally

```bash
# Route-teeth test only (no secrets needed — the full suite is skipped)
npx cypress run --spec cypress/e2e/auth-confirm-seam.cy.ts

# Full chain — set the env vars first (e.g. against a staging Supabase project)
CYPRESS_SUPABASE_URL=… \
CYPRESS_SUPABASE_ANON_KEY=… \
CYPRESS_SUPABASE_SERVICE_ROLE_KEY=… \
npx cypress run --spec cypress/e2e/auth-confirm-seam.cy.ts
```

The app must be running at the `baseUrl` configured in `cypress.config.ts`
(`npm run dev` or `npx vite preview`).

## Where it runs in CI

`.github/workflows/auth-confirm-seam.yml`

- **Schedule:** nightly at 06:00 and 12:00 UTC — the failures that hit us came
  from config drift, not code changes, so PR triggers alone are not enough
- **Pull requests** touching auth pages, the router, the `send-email-hook`
  Supabase function, or the spec itself
- **Manual** via `workflow_dispatch`

CI builds the SPA (`npm run build:spa`), serves it with `vite preview`, and
runs the spec against it. Secrets are read from the repo's
`CYPRESS_SUPABASE_URL` / `CYPRESS_SUPABASE_ANON_KEY` /
`CYPRESS_SUPABASE_SERVICE_ROLE_KEY` secrets.

If a **scheduled** run fails, the workflow automatically opens a GitHub issue
tagged `bug`/`auth`/`e2e` with a link to the failed run, so drift cannot fail
silently.

## Notes

- Test accounts use clearly-labelled `@test.giveprotocol.io` addresses and are
  deleted after the run via the Admin API.
- The full-chain suite runs against whichever Supabase project the secrets
  point at — point them at a non-prod project when one is available.
