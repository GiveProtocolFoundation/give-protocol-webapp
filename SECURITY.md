# Security Policy for Give Protocol

**Last Updated:** February 2026

Give Protocol is a blockchain-based philanthropic platform managed by the Give Protocol Foundation, a Delaware-incorporated 501(c)(3) nonprofit. Security is paramount because we handle charitable donations and volunteer data.

## 🛡️ Our Commitment to Security

We take security seriously and are committed to:

1. **Protecting donor funds** – ensuring cryptocurrency transfers are secure and irreversible
2. **Safeguarding user data** – maintaining privacy for donors, charities, and volunteers
3. **Maintaining platform integrity** – preventing fraud, unauthorized access, and data manipulation
4. **Transparency** – disclosing vulnerabilities responsibly and keeping the community informed
5. **Continuous improvement** – regularly auditing code and infrastructure

---

## 📋 Supported Versions

| Version | Status | Security Updates |
|---------|--------|------------------|
| Latest (main) | ✅ Active | Immediate |
| n-1 | ⚠️ Limited | Critical only |
| n-2+ | ❌ Unsupported | None |

**Recommendation:** Always run the latest version for security patches.

### Smart Contract Versions

| Chain | Contract | Version | Audited | Status |
|-------|----------|---------|---------|--------|
| Moonbeam | DirectDonation.sol | 1.2.0 | ✅ Yes | Production |
| Moonbeam | CharitableEquityFund.sol | 1.0.0 | ✅ Yes | Production |
| Moonbeam | CauseImpactFund.sol | 1.0.0 | ⏳ Pending | Testnet |
| Base | DirectDonation.sol | 1.2.0 | ⏳ Pending | Testnet |
| Optimism | DirectDonation.sol | 1.2.0 | ⏳ Pending | Testnet |

---

## 🚨 Reporting Security Vulnerabilities

### Do NOT Create a Public GitHub Issue

**If you discover a security vulnerability, please do NOT open a public GitHub issue.** Public disclosure puts the entire community at risk and violates responsible disclosure practices.

### How to Report Safely

**Email:** security@giveprotocol.io

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

| Severity | Definition | Response Time | Example |
|----------|-----------|----------------|---------|
| **Critical** 🔴 | Immediate risk to user funds or complete platform compromise | 24 hours | Smart contract reentrancy, private key exposure |
| **High** 🟠 | Significant risk to data or funds, or widespread service disruption | 3-5 days | Authentication bypass, data exposure, DOS attacks |
| **Medium** 🟡 | Limited impact, requires specific conditions or user action | 7-14 days | XSS vulnerability, information disclosure |
| **Low** 🟢 | Minimal impact, low likelihood of exploitation | 30 days | Typos in docs, non-critical logic issues |

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

| Config | Location | Reporting |
|--------|----------|-----------|
| `vercel.json` | Production (Vercel) | `Report-To` header + `report-to`/`report-uri` in CSP |
| `nginx.conf` | Self-hosted | `Report-To` header + `report-to`/`report-uri` in CSP |
| `.htaccess` | Apache | `Report-To` header + `report-to`/`report-uri` in CSP |
| `server.js` | Express SSR dev | `/api/csp-report` route (collector) |
| `index.html` | Meta tag | No reporting (CSP meta tags cannot use report-to/report-uri) |
| `SecurityManager` | TypeScript | `report-to`/`report-uri` in generated CSP string |

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
const s = document.createElement('script');
s.src = 'https://csp-test.invalid/probe.js';
document.head.appendChild(s);
```

A `[CSP-ALERT]` log entry should appear in the server logs (or Vercel function logs) within seconds.

### IRP-001 §4 — Detection Sources (off-cycle revision per §11.3)

CSP violation reports from the donation page are now a detection source for the Incident Response Plan. High-risk violations (`script-src`, `frame-src` on the payment domain) are escalated to `#security-incidents` via log drain alerting.
