# Contributing to Give Protocol Web App

Thank you for your interest in contributing. Give Protocol is in **testnet / pre-launch phase** — the platform is under active development and no contracts have been deployed to mainnet.

## Setting up locally

Follow the **Prerequisites**, **Installation**, and **Environment Configuration** sections in [README.md](README.md). Once your `.env` is configured, run:

```bash
npm run dev    # start the dev server at http://localhost:5173
```

## Branch and PR expectations

- Fork the repository and create a feature branch from `main`.
- Keep branches focused: one logical change per PR.
- Provide a clear description of what the PR does and why.
- Link any related GitHub issue.

## Pre-commit checklist

Before pushing, run the checks documented in [CLAUDE.md](CLAUDE.md):

```bash
npm run lint             # fix all ESLint errors
npm test -- --coverage   # ensure new code has test coverage
```

PRs that fail lint or drop coverage will not be merged.

## GDPR Art. 3(2) targeting-trigger gate

If your PR touches **i18n/locales, currency/payments, domains, or charity-onboarding scope**, you must answer the targeting-trigger question in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md):

> *Does this introduce a Tier-1 Art. 3(2) targeting trigger? If yes → STOP, escalate for Art. 27 reassessment.*

A Tier-1 trigger means the platform would be *directing* its service at EU data subjects (e.g., shipping an EU-member-state official language, displaying EUR, acquiring an EU domain, or onboarding EU charities), which engages the GDPR/UK GDPR Art. 27 representative obligation. The full trigger list, legal rationale, and the pre-launch gate for `giveprotocol.io` / `pacioli.io` / `commonry.app` live in [`docs/PRE_LAUNCH_CHECKLIST.md`](docs/PRE_LAUNCH_CHECKLIST.md). If a trigger fires, do not merge — escalate to the Head of Data and CTO.

## Reporting security issues

Do **not** open a public GitHub issue for security vulnerabilities. Follow the responsible-disclosure process described in [SECURITY.md](SECURITY.md).

## Questions

Open a GitHub Discussion or issue for general questions. For security concerns, see above.
