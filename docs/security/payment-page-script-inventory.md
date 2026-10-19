# Payment-page script inventory (MVP-SEC-06)

| | |
|---|---|
| **Owner** | Information Security Officer (ISO) |
| **Scope** | Every page that can render the donation flow: `DonateWidget`, `DonationModal`, `ScheduledDonationModal`, and `FiatDonationForm`. That covers charity profiles and `/portfolio-funds`. The SPA ships one bundle and one CSP, so this inventory covers the whole site. |
| **Supports** | PCI DSS v4.0.1 req. 6.4.3 (payment-page script inventory, authorization, integrity) and 11.6.1 (change/tamper detection), SAQ A-EP pack (GIV-311) |
| **Source of truth** | CSP: `index.html` meta tag (canonical), mirrored in `vercel.json` (production), `netlify.toml`, `nginx.conf`. Sentry config: `src/lib/sentry.ts`. |
| **Last verified** | 2026-10-18 against `origin/main` @ `b1a7b4ed` |
| **Review cadence** | On any PR that changes a CSP location, `index.html`, `src/lib/sentry.ts`, `src/lib/consent/*`, `src/services/helcimService.ts`, `src/services/paypalService.ts`, or `src/components/web3/donation/*`, plus a quarterly review by the ISO |

## (a) Script inventory

Every script that runs in the browser on a payment page. Card data is entered **only** inside the Helcim-hosted iframe (`secure.helcim.app`), and PayPal approval happens in a PayPal-hosted popup. No script on our origin can read PAN.

| # | Script | Origin | How loaded | When | Purpose / justification | Integrity control | Authorized by |
|---|---|---|---|---|---|---|---|
| 1 | App bundle (React, Vite chunks) | `'self'` | `<script type="module">` | Always | Application code | First-party build from reviewed `main`; hashed filenames | CTO / PR review |
| 2 | Inline gtag consent-default stub | `'self'` (inline) | `<script>` in `index.html` | Always | Sets GA consent to `denied` before any analytics can load | CSP `sha256-rum+BkA883k4o7T5Fk/eJ/2bXkW23qG+uAmv8xJCpSI=` (re-verified 2026-10-18, matches) | ISO |
| 3 | Sentry browser SDK (`@sentry/react` ^9.24) | Bundled in #1 | npm dependency | Prod only, when `VITE_SENTRY_DSN` is set | Error capture only (Phase A). See Sentry controls below. | Lockfile + Dependabot. No third-party script fetch. | ISO |
| 4 | Supabase JS, ethers, viem | Bundled in #1 | npm dependency | Always | Auth/data API client, EVM wallet + RPC | Lockfile + Dependabot | CTO |
| 5 | Wallet providers (EIP-1193 injected: MetaMask etc.) | Browser extension | Injected by the extension, not by us | When the user has a wallet installed | Non-custodial crypto donations | Outside our CSP. Users verify transactions in the wallet UI. No WalletConnect/Reown SDK is shipped. | CTO |
| 6 | HelcimPay.js `start.js` | `https://secure.helcim.app` | Dynamic `<script>` in `helcimService.ts` | Only when a fiat donation starts | Mounts the Helcim-hosted card iframe | **SRI** `sha384-8wWGKUkdq5wTIHBBb2inwu8SO3TFDWqLBUSLTwpmjyPzWv9GklIAv8SE3WP3z0Vy` with `crossorigin=anonymous`. A hash mismatch blocks the load and fails closed. | ISO / CTO |
| 7 | Google tag (gtag.js, GA4 `G-CBQHKLHD8T`) | `https://www.googletagmanager.com` (+ `www.google-analytics.com`) | Dynamic `<script>` in `src/lib/consent/useGA4Loader.ts` | **Only after analytics consent** | Product analytics | **No SRI possible** (Google serves versioned, unpinned content). Mitigated by consent gating. See gap G3. | ISO + Head of Data |
| 8 | Web fonts (DM Serif Display, DM Sans, Inter, Hanken Grotesk, IBM Plex Mono) | `fonts.googleapis.com` / `fonts.gstatic.com` | `<link rel=stylesheet>` | Always | Typography (CSS + font files, not script) | None. The spec requires self-hosting. See gap G2. | — |

**Confirmed not present:**
- **Silktide**: removed in GIV-377. `cypress/e2e/consent-ga4.cy.ts` asserts that no `silktide` script or link tags exist.
- **PayPal JS SDK**: not loaded. PayPal uses server-side order creation plus a `window.open` approval popup (`usePayPalPayment.ts`).
- **Google Translate widget**: there is no loader in `src/`, but its origins are still in the CSP (gap G1).
- **Sentry CDN loader**: not used. The SDK is bundled.

## (b) CSP: sources mapped to inventory

| Directive | Allowed source | Inventory # | Status |
|---|---|---|---|
| script-src | `'self'`, `'sha256-rum+…'` | 1, 2 | OK |
| script-src | `'wasm-unsafe-eval'` | — | Review. No first-party WASM was found, so it may be needed by a dependency. Confirm or remove (G1). |
| script-src | `https://secure.helcim.app` | 6 | OK |
| script-src | `https://www.googletagmanager.com`, `https://www.google-analytics.com` | 7 | OK (consent-gated) |
| script-src | `https://*.supabase.co`, `https://*.sentry.io` | — | **Unlisted**: SDKs are bundled and no script is fetched from them. Remove (G1). |
| script-src | `https://translate.google.com`, `https://translate.googleapis.com` | — | **Unlisted**: no loader. Remove (G1). |
| script-src | `https://api.helcim.com` | — | **Unlisted**: API origin, not a script host. Remove (G1). |
| script-src | `https://www.paypal.com`, `https://www.paypalobjects.com` | — | **Unlisted**: the SDK isn't loaded. Remove (G1). |
| frame-src | `https://secure.helcim.app`, `https://www.paypal.com`, `https://www.sandbox.paypal.com` | 6, PayPal | OK (processor frames) |
| frame-src | `https://api.helcim.com`, `https://translate.google.com` | — | Unlisted. Remove (G1). |
| style-src | `'unsafe-inline'`, `fonts.googleapis.com`, `translate.googleapis.com` | 8 | Accepted for now (styles can't exfiltrate PAN, and PAN lives in a cross-origin iframe). Drop the Google origins once fonts are self-hosted (G2). |
| connect-src | Supabase, Sentry ingest, Helcim, PayPal API, CoinGecko, `api.giveprotocol.io`, public EVM RPCs, `s3.amazonaws.com` | 3, 4, 6 | OK. These are data endpoints, not script sources. `ws://localhost:*` should not ship to prod (G1). |
| object-src / base-uri / form-action | `'none'` / `'self'` / `'self'` | — | OK |
| frame-ancestors | not set in CSP. `X-Frame-Options: DENY` is set via headers. | — | Acceptable. Adding `frame-ancestors 'none'` to the HTTP header is preferred (G1). |

**Enforced today:**
- `npm run validate:csp` (`scripts/validate-csp.mjs`, GIV-553) runs in CI (`.github/workflows/code-quality.yml`).
- It fails the build when any CSP location diverges from `index.html`, or when `script-src` contains `'unsafe-inline'` or `'unsafe-eval'`.
- It does **not** yet check sources against this inventory (G4).

**Violation reporting:** `report-uri /api/csp-report` (GIV-328) is set only in `nginx.conf`. The production host (`vercel.json`) has no `report-uri`/`report-to` (G5).

## (c) Integrity pinning or removal

| Third-party script | Decision |
|---|---|
| HelcimPay.js | **Pinned** (SRI sha384). To rotate the hash: `curl -s https://secure.helcim.app/helcim-pay/services/start.js \| openssl dgst -sha384 -binary \| openssl base64 -A`, then update it through a reviewed PR. |
| gtag.js | **Cannot be pinned.** Kept only behind consent and never needed for payment. Gap G3 decides between leaving it off donation flows and accepting it as a documented risk. |
| Google Fonts | Not a script. **Self-host** (G2). |
| Translate, PayPal SDK, Supabase/Sentry script hosts | **Removed** from code. Remove the CSP entries too (G1). |

## (d) Change review for payment-page deploys

- **Today:** every change goes through a PR to `main`, with Claude code review and SonarCloud. CSP drift is blocked by `validate:csp`.
- **Gap G6:** there is no `CODEOWNERS` file, so ISO review isn't *required* on payment-page paths.
- **Required end state:** ISO or CTO approval is required for the files listed under "Review cadence" above.

## Sentry session replay controls (GIV-357)

| Control | Evidence |
|---|---|
| Replay off at init, site-wide | `src/lib/sentry.ts` `initSentry()`: `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, `tracesSampleRate: 0`, `integrations: []`, `sendDefaultPii: false` |
| Replay only after explicit analytics consent | `enableAnalyticsIntegrations()` is called only from `src/lib/consent/SentryConsentReactor.tsx` (tested in `SentryConsentReactor.test.tsx`). Text is masked and media blocked. Withdrawal calls `Sentry.close()`, re-inits Phase A, and reloads the page. |
| Sentry off in non-prod | `initSentry()` returns early unless `import.meta.env.PROD` |
| **Replay disabled on donation flows** | **Not implemented (G7).** After consent, replay can record pages hosting the donation modal. The Helcim card iframe is cross-origin, so rrweb can't capture PAN, but donor amount and name fields are on our DOM (masked). The spec requires replay to be disabled on the donation route. |
| Production-build check | Not yet automated (G7) |

## Open gaps → remediation

| ID | Gap | Severity |
|---|---|---|
| G1 | Remove unlisted CSP sources: Translate, `*.supabase.co`/`*.sentry.io`/`api.helcim.com`/PayPal script-src, `api.helcim.com`/Translate frame-src, prod `ws://localhost:*`. Confirm `'wasm-unsafe-eval'`. Add `frame-ancestors 'none'` to headers. Re-sync `src/utils/security/index.ts`, whose script hash differs from the canonical one. | Medium |
| G2 | Self-host the web fonts and drop the `fonts.googleapis.com`/`fonts.gstatic.com` origins | Low |
| G3 | Keep gtag.js from loading while a donation modal is open, or document a risk acceptance | Medium |
| G4 | Extend `validate-csp.mjs` to fail the build on any CSP source not listed in this inventory | Medium (spec acceptance) |
| G5 | Add `report-uri`/`report-to` to the `vercel.json` CSP (production). This is required for 11.6.1-style tamper alerting. | Medium |
| G6 | Add `CODEOWNERS` requiring ISO/CTO review on payment-page paths | Medium |
| G7 | Suppress Sentry replay while donation UI is mounted, and add a test or prod-build check showing replay is disabled there | Medium (spec acceptance) |

Remediation is tracked in the GIV-1058 follow-up engineering issue. When a gap closes, update this file in the same PR.
