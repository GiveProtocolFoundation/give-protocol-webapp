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

> _Does this introduce a STRONG, EU-specific targeting signal? If yes → STOP, escalate for an Art. 3(2)/Art. 27 reassessment._

No single factor is dispositive: targeting is judged on the **totality of factors**, and a factor equally explained by a worldwide audience (e.g., a globally-spoken language that is also an EU official language, or EUR offered as one of many world currencies) is **not** probative of EU targeting. **Strong, EU-specific** signals — an EU-only/minority language, an EU-specific payment rail or EUR-default for EU users, an EU ccTLD, EU-geotargeted marketing, or onboarding EU-established charities — point specifically at the EU and require escalation. The full signal list, the weak-vs-strong distinction, the legal rationale, and the pre-launch gate for `giveprotocol.io` / `pacioli.io` / `commonry.app` live in [`docs/PRE_LAUNCH_CHECKLIST.md`](docs/PRE_LAUNCH_CHECKLIST.md). If a strong signal fires, do not merge — escalate to the Head of Data and CTO.

## Reporting security issues

Do **not** open a public GitHub issue for security vulnerabilities. Follow the responsible-disclosure process described in [SECURITY.md](SECURITY.md).

## Questions

Open a GitHub Discussion or issue for general questions. For security concerns, see above.
