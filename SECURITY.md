# Security Policy for Give Protocol

**Last Updated:** June 2026

Give Protocol is a blockchain-based philanthropic platform managed by the Give Protocol Foundation, a Delaware-incorporated 501(c)(3) nonprofit. Security is paramount because we handle charitable donations and volunteer data.

## 🛡️ Our Commitment to Security

We take security seriously and are committed to:

1. **Protecting donor funds** – ensuring cryptocurrency transfers are secure and irreversible
2. **Safeguarding user data** – maintaining privacy for donors, charities, and volunteers
3. **Maintaining platform integrity** – preventing fraud, unauthorized access, and data manipulation
4. **Transparency** – disclosing vulnerabilities responsibly and keeping the community informed
5. **Continuous improvement** – regularly auditing code and infrastructure

---

## Content Security Policy (CSP)

### Canonical Source of Truth

The **single source of truth** for the Content Security Policy is the `<meta http-equiv="Content-Security-Policy">` tag in **`index.html`** (lines 7-15).

All other CSP locations **must mirror** the canonical definition:

| Location                      | Role                                                   | Must match canonical? |
| ----------------------------- | ------------------------------------------------------ | --------------------- |
| `index.html` meta tag         | **Canonical** — enforced by browser on every page load | N/A (is the source)   |
| `netlify.toml` [[headers]]    | HTTP header for Netlify (production hosting)           | Yes                   |
| `nginx.conf` add_header       | HTTP header for nginx (self-hosted fallback)           | Yes                   |
| `vercel.json` headers         | HTTP header for Vercel (alternative hosting)           | Yes                   |
| `src/utils/security/index.ts` | Runtime CSP reference for SecurityManager              | Structurally aligned  |

### Hardening Rules (per GIV-60)

- `script-src` **must not** contain `'unsafe-inline'` or `'unsafe-eval'`. Inline scripts use SHA-256 hashes instead.
- `object-src 'none'` — blocks plugins (Flash, Java applets).
- `base-uri 'self'` — prevents `<base>` tag injection.
- `form-action 'self'` — restricts form submission targets.
- `style-src 'unsafe-inline'` is permitted (CSS injection is lower risk; required for many UI libraries).

### CI Enforcement

The script `scripts/validate-csp.mjs` (run via `npm run validate:csp`) validates:

1. No `'unsafe-inline'` or `'unsafe-eval'` in any `script-src`.
2. All secondary locations (nginx.conf, vercel.json, netlify.toml) match the canonical index.html meta tag directive-for-directive.

This check runs in the **Code Quality** CI workflow on every push and PR.

### Changing the CSP

1. Edit the `<meta>` tag in `index.html` (the canonical source).
2. Copy the updated CSP value to `netlify.toml`, `nginx.conf`, and `vercel.json`.
3. Update `src/utils/security/index.ts` if directive structure changed.
4. Run `npm run validate:csp` locally to verify.
5. CI will also verify on push.

---

## 📋 Supported Versions

| Version       | Status         | Security Updates |
| ------------- | -------------- | ---------------- |
| Latest (main) | ✅ Active      | Immediate        |
| n-1           | ⚠️ Limited     | Critical only    |
| n-2+          | ❌ Unsupported | None             |

**Recommendation:** Always run the latest version for security patches.

### Smart Contract Versions

| Chain    | Contract                 | Version     | Audited                  | Status  |
| -------- | ------------------------ | ----------- | ------------------------ | ------- |
| Moonbeam | DirectDonation.sol       | pre-release | No — planned pre-mainnet | Testnet |
| Moonbeam | CharitableEquityFund.sol | pre-release | No — planned pre-mainnet | Testnet |
| Moonbeam | CauseImpactFund.sol      | pre-release | No — planned pre-mainnet | Testnet |
| Base     | DirectDonation.sol       | pre-release | No — planned pre-mainnet | Testnet |
| Optimism | DirectDonation.sol       | pre-release | No — planned pre-mainnet | Testnet |

---

## 🚨 Reporting Security Vulnerabilities

### Do NOT Create a Public GitHub Issue

**If you discover a security vulnerability, please do NOT open a public GitHub issue.** Public disclosure puts the entire community at risk and violates responsible disclosure practices.

### How to Report Safely

**Email:** privacy@giveprotocol.io

**Include in your report:**

1. **Type of vulnerability** (e.g., smart contract bug, authentication bypass, XSS, data leak)
2. **Location** (e.g., which file, function, or contract)
3. **Description** – clear explanation of the issue
4. **Reproduction steps** – how to reproduce the vulnerability
5. **Impact** – what could an attacker do?
6. **Proof of Concept** (optional but helpful) – code snippet or screenshot
7. **Your contact information** – name, email, optionally PGP key

### Example Report

```
Subject: [SECURITY] Potential Reentrancy in DirectDonation.sol

Type: Smart Contract - Reentrancy Vulnerability
Location: contracts/DirectDonation.sol, line 156, withdrawFunds() function
Description: The contract calls external contract before updating balance...
Reproduction: Deploy contract, call withdrawFunds() with a malicious fallback...
Impact: An attacker could drain the contract multiple times
PGP Key: [if you have one, include your public key]
```

---

## 🔄 Vulnerability Disclosure Process

### Timeline

1. **You Report** → We acknowledge receipt within **24 hours**
2. **We Investigate** → Assessment within **3-5 business days**
3. **We Fix** → Development of patch (timeline depends on severity)
4. **We Test** → Testnet deployment and review
5. **We Deploy** → Mainnet patch + public disclosure

### Severity Levels & Response Times

| Severity        | Definition                                                          | Response Time | Example                                           |
| --------------- | ------------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| **Critical** 🔴 | Immediate risk to user funds or complete platform compromise        | 24 hours      | Smart contract reentrancy, private key exposure   |
| **High** 🟠     | Significant risk to data or funds, or widespread service disruption | 3-5 days      | Authentication bypass, data exposure, DOS attacks |
| **Medium** 🟡   | Limited impact, requires specific conditions or user action         | 7-14 days     | XSS vulnerability, information disclosure         |
| **Low** 🟢      | Minimal impact, low likelihood of exploitation                      | 30 days       | Typos in docs, non-critical logic issues          |

### Disclosure & Patch Release

**For Critical/High severity:**

- We will **coordinate with you on a disclosure date**
- We typically ask for **30-60 days before public disclosure** to allow users to upgrade
- We will **credit your discovery** in our security advisory (unless you prefer anonymity)
- You will receive a **security advisory link before public release**

**For Medium/Low severity:**

- We include fixes in the next regular release
- Public disclosure happens with the release announcement

---

## CSP Violation Reporting

**Added:** June 2026 (TT-F1 / GIV-328)

All server-sent CSP headers include `report-to` (Reporting API v1) and `report-uri` (legacy) directives that point to `/api/csp-report`.

### Architecture

| Config            | Location            | Reporting                                                    |
| ----------------- | ------------------- | ------------------------------------------------------------ |
| `vercel.json`     | Production (Vercel) | `Report-To` header + `report-to`/`report-uri` in CSP         |
| `nginx.conf`      | Self-hosted         | `Report-To` header + `report-to`/`report-uri` in CSP         |
| `.htaccess`       | Apache              | `Report-To` header + `report-to`/`report-uri` in CSP         |
| `server.js`       | Express SSR dev     | `/api/csp-report` route (collector)                          |
| `index.html`      | Meta tag            | No reporting (CSP meta tags cannot use report-to/report-uri) |
| `SecurityManager` | TypeScript          | `report-to`/`report-uri` in generated CSP string             |

### Collector endpoint

`POST /api/csp-report` accepts both `application/csp-report` (legacy) and `application/reports+json` (Reporting API v1) content types. It:

1. Normalizes the payload across report formats.
2. Drops browser-extension violations (chrome-extension://, moz-extension://, etc.).
3. Drops reports from non-Give-Protocol origins.
4. Classifies violations: `script-src`, `frame-src`, `object-src`, `base-uri` are **high-risk** (ALERT level).
5. Logs to stdout — picked up by Vercel Log Drains / Sentry for routing to `#security-incidents`.

### Smoke-testing

To verify reporting works, open the browser console on the donation page and run:

```javascript
// Inject a script from an untrusted origin to trigger a CSP violation
const s = document.createElement("script");
s.src = "https://csp-test.invalid/probe.js";
document.head.appendChild(s);
```

A `[CSP-ALERT]` log entry should appear in the server logs (or Vercel function logs) within seconds.

### IRP-001 §4 — Detection Sources (off-cycle revision per §11.3)

CSP violation reports from the donation page are now a detection source for the Incident Response Plan. High-risk violations (`script-src`, `frame-src` on the payment domain) are escalated to `#security-incidents` via log drain alerting.

---

## 🛂 Internal Data Breach Response (GDPR Art. 33 / Art. 34)

> The section above governs how _external researchers_ report vulnerabilities to us. This section governs what _Give Protocol does internally_ when we discover a personal data breach affecting our users. The two processes can run in parallel for the same incident.

### Authoritative procedure

The full internal procedure — roles, decision tree, notification templates, and post-incident review — is the **Data Breach Response Procedure (DBRP)** document, owned by the CEO acting as Data Breach Owner (DBO). Engineering should treat the DBRP as the source of truth; this section is a quick-reference summary.

### The 72-hour regulatory clock is separate from the engineering SLA

The High-severity researcher response time in the table above is **3-5 business days**. This is an engineering remediation SLA for the researcher relationship.

It is **not** the regulatory notification clock.

GDPR Art. 33 requires notification to the competent supervisory authority within **72 hours** of becoming aware of a personal data breach, unless the breach is unlikely to result in a risk to natural persons. The 72-hour clock is independent of:

- The engineering remediation timeline
- Whether the researcher has been credited
- Whether the patch has shipped to production

If a High- or Critical-severity issue involves personal data, the on-call engineer **must** page the CEO (DBO) and CTO immediately. The 72-hour clock starts at the moment of reasonable certainty that personal data has been compromised, not at the moment of researcher report receipt and not at the moment internal triage completes.

### Data categories that trigger GDPR consideration

Any incident that exposes or could expose the following data categories must be evaluated by the DBO for Art. 33 reportability:

- Account credentials (email, password hash, session token, OAuth identity)
- Identity verification documents (KYC)
- Wallet addresses linked to identifiable users
- Donation history linked to identifiable users
- Volunteer activity linked to identifiable users
- Charity affiliation linked to identifiable users
- Any data processed under Supabase Row Level Security with PII fields

### What engineering does in the first hour

1. Open a private incident channel and page CEO + CTO.
2. Preserve evidence: do not delete logs, do not wipe affected systems, snapshot Supabase audit logs.
3. Contain the breach (rotate credentials, revoke tokens, disable affected endpoints).
4. Do **not** publicly disclose anything until the DBO authorises external communication. Internal candor, external discipline.

### What the DBO does in the first 24 hours

1. Formally declare whether the incident is a personal data breach under Art. 4(12) GDPR. The moment of formal declaration is recorded in UTC and starts the 72-hour clock.
2. Run the DBRP decision tree to determine reportability and Art. 34 high-risk status.
3. Open an entry in the **Personal Data Breach Register** (Art. 33(5)). Every declared breach is registered, reportable or not.
4. Engage external counsel for confirmation of the lead supervisory authority and review of the notification draft.

### Documents

- `data-breach-response-procedure` — full DBRP, owned by the DBO
- `breach-register` — Art. 33(5) register of all declared breaches

Both live as Paperclip documents on the originating governance issue.

### Contact

- Internal escalation for suspected data breach: page CEO (DBO) and CTO via the on-call rotation
- Privacy, data-subject inquiries, and external vulnerability disclosure: `privacy@giveprotocol.io`
