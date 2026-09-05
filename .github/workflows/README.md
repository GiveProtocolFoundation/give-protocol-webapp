# GitHub Actions Workflows

This directory contains automated workflows for code quality, testing, and analysis.

## Workflows

### 0. Auth Confirm Seam E2E (`auth-confirm-seam.yml`) — GIV-921

- **Triggers**: Scheduled (06:00 & 12:00 UTC), PRs touching auth files, Manual
- **Purpose**: End-to-end auth chain test: signup → email → confirm → sign-in
- **Features**:
  - Runs `cypress/e2e/auth-confirm-seam.cy.ts` against a real Supabase project
  - Uses service-role key to generate verification links (no real inbox required)
  - Creates a GitHub issue automatically on scheduled-run failures
  - Guards against config drift that unit tests cannot detect
- **Required Secrets**:
  - `CYPRESS_SUPABASE_URL`
  - `CYPRESS_SUPABASE_ANON_KEY`
  - `CYPRESS_SUPABASE_SERVICE_ROLE_KEY`
- **Running locally**:
  ```bash
  # Start the app with Supabase proxied through the dev server (same-origin,
  # which avoids sandboxed-browser restrictions on extra localhost ports):
  E2E_SUPABASE_PROXY_TARGET=http://127.0.0.1:54321 \
  VITE_SUPABASE_URL=http://localhost:5173/sb \
  VITE_SUPABASE_ANON_KEY=<anon-key> \
  npx vite --port 5173 &

  CYPRESS_SUPABASE_URL=http://localhost:5173/sb \
  CYPRESS_SUPABASE_ANON_KEY=<anon-key> \
  CYPRESS_SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  npx cypress run --spec "cypress/e2e/auth-confirm-seam.cy.ts" --browser chrome --headless
  ```
  Against a cloud project, point `CYPRESS_SUPABASE_URL` / `VITE_SUPABASE_URL`
  directly at the project URL (e.g. `https://api.giveprotocol.io`) — no proxy
  needed. Use a test/staging project for the service-role key.

### 1. SonarCloud Analysis (`sonarcloud.yml`)

- **Triggers**: Push to main/develop, Pull requests, Manual trigger
- **Purpose**: Runs SonarCloud analysis for code quality metrics
- **Features**:
  - Runs tests with coverage
  - Generates ESLint reports
  - Submits results to SonarCloud
  - Comments on PRs with results

### 2. Code Quality & Analysis (`code-quality.yml`)

- **Triggers**: Push to main/develop/feature/fix branches, PRs, Daily schedule, Manual
- **Purpose**: Comprehensive code quality checks
- **Features**:
  - TypeScript compilation check
  - Linting with report generation
  - Test execution with coverage
  - Security scanning with Trivy
  - Artifacts upload for debugging
  - GitHub summary generation

### 3. New Code Analysis (`new-code-analysis.yml`)

- **Triggers**: Pull requests, Push to main
- **Purpose**: Focused analysis on changed code only
- **Features**:
  - Detects changed files
  - Runs tests only for modified code
  - SonarCloud analysis focused on new code
  - Efficient CI/CD for large codebases

## Required Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository:

1. **SONAR_TOKEN**: Your SonarCloud authentication token
   - Get it from: https://sonarcloud.io/account/security
   - Add in: Settings → Secrets and variables → Actions

2. **Auth Confirm Seam secrets** (required for `auth-confirm-seam.yml`):
   - `CYPRESS_SUPABASE_URL` — e.g. `https://api.giveprotocol.io`
   - `CYPRESS_SUPABASE_ANON_KEY` — public anon key
   - `CYPRESS_SUPABASE_SERVICE_ROLE_KEY` — service-role key (test/staging env only)

3. **GITHUB_TOKEN**: Automatically provided by GitHub Actions (no setup needed)

## Setup Instructions

1. **Enable GitHub Actions**:
   - Go to Settings → Actions → General
   - Select "Allow all actions and reusable workflows"

2. **Configure SonarCloud**:
   - Go to https://sonarcloud.io
   - Import your project if not already done
   - Get your SONAR_TOKEN from account security settings
   - Add the token to GitHub secrets

3. **First Run**:
   - The workflows will run automatically on your next push or PR
   - You can also trigger manually from Actions tab

## Manual Triggering

To manually trigger a workflow:

1. Go to Actions tab
2. Select the workflow
3. Click "Run workflow"
4. Select branch and options
5. Click "Run workflow" button

## Monitoring

- **GitHub Actions**: Check the Actions tab for workflow runs
- **SonarCloud Dashboard**: https://sonarcloud.io/project/overview?id=GiveProtocol_give-protocol-webapp
- **Pull Request Checks**: Automated comments and status checks on PRs

## Troubleshooting

### Cypress Installation Failures

**Problem**: `npm ci` fails with "The Cypress App could not be downloaded" or "Response code: 500"

**Solution**: All workflows now skip Cypress binary installation during `npm ci` by setting `CYPRESS_INSTALL_BINARY=0`. This is safe because:

- Cypress is only needed for E2E tests (`npm run test:e2e`)
- Unit tests and builds don't require Cypress
- Cypress binary is cached and installed separately when needed

**Technical Details**:

- Environment variable `CYPRESS_INSTALL_BINARY=0` prevents automatic Cypress download
- Cypress binary cache path: `~/.cache/Cypress`
- Cache key based on `package-lock.json` hash for automatic invalidation
- For E2E tests, add a separate workflow step to install Cypress explicitly

### SonarCloud not running?

1. Check if SONAR_TOKEN is set correctly
2. Verify project exists in SonarCloud
3. Check workflow logs for errors

### Tests failing in CI but passing locally?

1. Check Node.js version matches
2. Ensure all dependencies are in package.json
3. Check for environment-specific issues

### Coverage not showing?

1. Ensure tests generate lcov reports
2. Check coverage file paths match configuration
3. Verify SonarCloud project settings

## Best Practices

1. **Keep workflows fast**: Use caching and parallel jobs
2. **Fail fast**: Put quick checks first
3. **Use artifacts**: Upload logs and reports for debugging
4. **Monitor costs**: GitHub Actions has usage limits
5. **Regular updates**: Keep actions versions current

### 4. Scheduled Schema Drift Check (`schema-drift-check.yml`) — GIV-935

- **Triggers**: Scheduled daily, Manual trigger
- **Purpose**: Detect "history says applied, schema says missing" class of migration drift by comparing expected schema against the actual database dump.
- **Features**:
  - Parses expected tables directly from `CREATE TABLE` and `CREATE TABLE IF NOT EXISTS` statements in `supabase/migrations/`
  - Runs `supabase db dump --linked --schema public` to get the actual tables.
  - Fails if there's any discrepancy (drift) and provides a clear `diff` output.
  - Checks both production and staging projects. (To configure staging, add the project ID to the workflow file's matrix configuration or set a variable).
  - No auto-repair—manual triage is required to maintain a clear audit trail.
- **Required Secrets**:
  - `SUPABASE_ACCESS_TOKEN` - To authenticate the Supabase CLI and allow `db dump` to execute.

### 5. Database Deploy (`database-deploy.yml`) — GIV-937

- **Triggers**: Manual dispatch only
- **Purpose**: Apply Supabase migrations and seed data to a hosted project. Nothing else in CI writes to a database — merging to `main` never mutates one.
- **Safety model**:
  - `workflow_dispatch` only, gated on a GitHub Environment so a reviewer approves each run
  - **Defaults to a dry run** — `dry_run` must be unchecked deliberately to write anything
  - A migration-history preflight (`scripts/ci/migration-preflight.sh`) runs first and aborts unless the remote history is *in-sync* or cleanly *ahead*. It refuses when history is empty, has gaps, or records migrations absent from the repo — the cases where `supabase db push` would replay old migrations against a live schema
  - `concurrency` serialises runs per environment and never cancels one midway
  - The dry run prints every `INSERT`/`DELETE`/`DDL` statement the chosen seed contains, so a reviewer sees destructive statements before approving
  - After applying, it verifies `causes` and `portfolio_funds` are non-empty and fails the job if a seed silently wrote nothing
- **Inputs**:
  - `environment` — `staging` or `production`
  - `dry_run` — report without writing (default **true**)
  - `apply_migrations` — run `supabase db push` (default true)
  - `seed` — `none` (default), `causes-and-funds`, or `full-charity-seed`
  - `allow_full_replay` — override the empty-history refusal. Only correct for a genuinely fresh project
- **Seed options**:
  - `causes-and-funds` → `supabase/seed_causes_and_funds.sql`. Additive: writes only `causes` and `portfolio_funds`, joins charities by EIN, safe against a database that already holds charity data. This is what populates `/browse?tab=causes` and `?tab=funds`.
  - `full-charity-seed` → `supabase/seed.sql`. **Destructive**: DELETEs and recreates `charity_profiles` / `charity_organizations` rows with EIN like `99-123%` under fixed UUIDs, discarding their existing ids and any `claimed_by` / `verified_at` state. Fresh or disposable projects only.
- **Required Secrets** (scoped per GitHub Environment, not repo-wide):
  - `SUPABASE_DB_URL` — Postgres connection string for that project, percent-encoded. Dashboard → Project Settings → Database → Connection string → URI. Use the **direct (non-pooler)** URI; the session pooler cannot run DDL transactions.
- **First run**: dispatch against `staging` with the defaults (dry run, `seed: none`) to read the preflight's report of the remote migration state before changing anything.
