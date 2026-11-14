# Payment-page script inventory (MVP-SEC-06)

| | |
|---|---|
| **Owner** | Information Security Officer (ISO) |
| **Scope** | Every page that can render the donation flow: `DonateWidget`, `DonationModal`, `ScheduledDonationModal`, and `FiatDonationForm`. That covers charity profiles and `/portfolio-funds`. The SPA ships one bundle and one CSP, so this inventory covers the whole site. |
| **Supports** | PCI DSS v4.0.1 req. 6.4.3 (payment-page script inventory, authorization, integrity) and 11.6.1 (change/tamper detection), SAQ A-EP pack (GIV-311) |
| **Source of truth** | CSP: `index.html` meta tag (canonical), mirrored in `vercel.json` (production), `netlify.toml`, `nginx.conf`. Sentry config: `src/lib/sentry.ts`. |
| **Last verified** | 2026-10-27 against `origin/main` @ `agent/giv-1063-csp-gaps` |
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
| 8 | Web fonts (DM Serif Display, DM Sans, Inter, Hanken Grotesk, IBM Plex Mono) | `'self'` (`public/fonts/`) | `@import` in `src/styles/fonts.css` | Always | Typography (CSS + font files, not script) | Self-hosted woff2 files served from same origin. | CTO |

**Confirmed not present:**
- **Silktide**: removed in GIV-377. `cypress/e2e/consent-ga4.cy.ts` asserts that no `silktide` script or link tags exist.
- **PayPal JS SDK**: not loaded. PayPal uses server-side order creation plus a `window.open` approval popup (`usePayPalPayment.ts`).
- **Google Translate widget**: there is no loader in `src/`, but its origins are still in the CSP (gap G1).
- **Sentry CDN loader**: not used. The SDK is bundled.

## (b) CSP: sources mapped to inventory

| Directive | Allowed source | Inventory # | Status |
|---|---|---|---|
| script-src | `'self'`, `'sha256-rum+…'` | 1, 2 | OK |
| script-src | `'wasm-unsafe-eval'` | — | Removed — no first-party WASM in use (G1 ✅). |
| script-src | `https://secure.helcim.app` | 6 | OK |
| script-src | `https://www.googletagmanager.com`, `https://www.google-analytics.com` | 7 | OK (consent-gated, suppressed during donation flows — G3 ✅) |
| script-src | `https://*.supabase.co`, `https://*.sentry.io` | — | **Removed**: SDKs are bundled and no script is fetched from them (G1 ✅). |
| script-src | `https://translate.google.com`, `https://translate.googleapis.com` | — | **Removed**: no loader (G1 ✅). |
| script-src | `https://api.helcim.com` | — | **Removed**: API origin, not a script host (G1 ✅). |
| script-src | `https://www.paypal.com`, `https://www.paypalobjects.com` | — | **Removed**: the SDK isn't loaded (G1 ✅). |
| frame-src | `https://secure.helcim.app`, `https://www.paypal.com`, `https://www.sandbox.paypal.com` | 6, PayPal | OK (processor frames) |
| frame-src | `https://api.helcim.com`, `https://translate.google.com` | — | **Removed** (G1 ✅). |
| style-src | `'unsafe-inline'` | — | Accepted for now (styles can't exfiltrate PAN, and PAN lives in a cross-origin iframe). Google Fonts origins removed — fonts self-hosted (G2 ✅). |
| connect-src | Supabase, Sentry ingest, Helcim, PayPal API, CoinGecko, `api.giveprotocol.io`, public EVM RPCs, `s3.amazonaws.com` | 3, 4, 6 | OK. These are data endpoints, not script sources. `ws://localhost:*` removed from prod (G1 ✅). |
| object-src / base-uri / form-action | `'none'` / `'self'` / `'self'` | — | OK |
| frame-ancestors | `'none'` in HTTP headers (vercel.json, nginx.conf, netlify.toml). Not in CSP meta tag (spec limitation). | — | OK (G1 ✅). |

**Enforced today:**
- `npm run validate:csp` (`scripts/validate-csp.mjs`, GIV-553) runs in CI (`.github/workflows/code-quality.yml`).
- It fails the build when any CSP location diverges from `index.html`, or when `script-src` contains `'unsafe-inline'` or `'unsafe-eval'`.
- It also validates that every `script-src` and `frame-src` source is listed in `scripts/csp-inventory.json` (G4 ✅).
- A negative test (`scripts/validate-csp-negative.test.mjs`) confirms the validator rejects unlisted sources (G4 ✅).

**Violation reporting:** `report-uri /api/csp-report` and `report-to csp-endpoint` are set in all HTTP-header CSP locations: `vercel.json` (production), `nginx.conf`, `netlify.toml` (G5 ✅).

## (c) Integrity pinning or removal

| Third-party script | Decision |
|---|---|
| HelcimPay.js | **Pinned** (SRI sha384). To rotate the hash: `curl -s https://secure.helcim.app/helcim-pay/services/start.js \| openssl dgst -sha384 -binary \| openssl base64 -A`, then update it through a reviewed PR. |
| gtag.js | **Cannot be pinned.** Kept only behind consent and suppressed while donation UI is mounted (G3 ✅). |
| Google Fonts | **Self-hosted** in `public/fonts/` (G2 ✅). No external font loads. |
| Translate, PayPal SDK, Supabase/Sentry script hosts | **Removed** from CSP (G1 ✅). |

## (d) Change review for payment-page deploys

- **Today:** every change goes through a PR to `main`, with Claude code review and SonarCloud. CSP drift is blocked by `validate:csp`. `.github/CODEOWNERS` requires @drigobl and @civicmastery review on all payment-page and CSP paths (G6 ✅).
- **Required end state:** ISO or CTO approval is required for the files listed under "Review cadence" above. ✅ Enforced via CODEOWNERS.

## Sentry session replay controls (GIV-357)

| Control | Evidence |
|---|---|
| Replay off at init, site-wide | `src/lib/sentry.ts` `initSentry()`: `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, `tracesSampleRate: 0`, `integrations: []`, `sendDefaultPii: false` |
| Replay only after explicit analytics consent | `enableAnalyticsIntegrations()` is called only from `src/lib/consent/SentryConsentReactor.tsx` (tested in `SentryConsentReactor.test.tsx`). Text is masked and media blocked. Withdrawal calls `Sentry.close()`, re-inits Phase A, and reloads the page. |
| Sentry off in non-prod | `initSentry()` returns early unless `import.meta.env.PROD` |
| **Replay disabled on donation flows** | `useSentryReplayGuard` hook pauses `Sentry.getReplay().stop()` when any donation component mounts (via `DonationActiveContext`), resumes on unmount (G7 ✅). Unit test in `src/lib/__tests__/sentry-replay-guard.test.tsx`. |
| Production-build check | `npm run check:replay-suppression` verifies `replaysSessionSampleRate:0` and guard functions in `dist/` (G7 ✅). |

## Closed gaps

All gaps from the initial inventory have been remediated in PR `agent/giv-1063-csp-gaps`.

| ID | Gap | Severity | Resolution |
|---|---|---|---|
| G1 | Remove unlisted CSP sources, confirm `'wasm-unsafe-eval'`, add `frame-ancestors 'none'`, re-sync `security/index.ts` | Medium | ✅ Removed all unlisted sources, confirmed no WASM needed, added `frame-ancestors 'none'` to HTTP headers, re-synced security/index.ts hash and trusted domains. |
| G2 | Self-host the web fonts | Low | ✅ Downloaded woff2 files to `public/fonts/`, created `src/styles/fonts.css`, removed Google Fonts `<link>` tags and CSP origins. |
| G3 | Keep gtag.js from loading while donation UI is mounted | Medium | ✅ `DonationActiveContext` tracks donation component mount state; `useGA4Loader` defers loading while donation UI is active. Unit test confirms. |
| G4 | Extend `validate-csp.mjs` to fail on unlisted CSP sources | Medium | ✅ Added `scripts/csp-inventory.json` allowlist; validator checks all `script-src`/`frame-src` sources against it. Negative test added. |
| G5 | Add `report-uri`/`report-to` to production CSP | Medium | ✅ Added to `vercel.json`, `nginx.conf`, and `netlify.toml`. |
| G6 | Add `CODEOWNERS` for payment-page paths | Medium | ✅ `.github/CODEOWNERS` requires @drigobl/@civicmastery review. |
| G7 | Suppress Sentry replay while donation UI is mounted + tests | Medium | ✅ `useSentryReplayGuard` pauses/resumes replay via `DonationActiveContext`. Unit test + prod-build check script. |

Remediation tracked in GIV-1063.
