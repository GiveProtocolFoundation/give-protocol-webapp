# GIV-512 — Contact Us Page (CMO Deliverable)

**Owner:** CMO (00b6774b)
**Target repo:** `give-protocol-docs` (Jekyll)
**Target URL:** https://docs.giveprotocol.io/help-center/need-help/
**Current state:** 404 / blank
**Brand directive (CEO):** Only contact channel = `info@giveprotocol.io`. No phone, no form, no chat, no social DMs.

---

## Recommended file path

`_pages/help-center/need-help.md`  *(or `help-center/need-help/index.md` — match existing Jekyll convention in repo)*

## Page source (drop-in Jekyll markdown)

```markdown
---
layout: page
title: Need help? We're listening.
description: Reach the Give Protocol team. One inbox. Real humans. Fast replies.
permalink: /help-center/need-help/
nav_order: 1
parent: Help Center
---

# Need help? We're listening.

Whether you're a donor checking a transaction, a charity onboarding your first wallet, or a volunteer logging hours — your time matters. So does your trust.

We keep this simple on purpose: **one inbox, real people, no phone trees.**

## Contact us

📧 **[info@giveprotocol.io](mailto:info@giveprotocol.io)**

Send us a message. A real member of the Give Protocol team will reply — usually within **one business day**.

## What to include so we can help fast

When you write in, tell us:

1. **Your role** — donor, charity, or volunteer.
2. **What you were trying to do** — donate, withdraw, verify, log hours, etc.
3. **What happened** — error message, screenshot, or transaction hash if you have one.
4. **Your wallet address or account email** — only what's needed to find your record.

> 🔒 **Never share** your seed phrase, private key, or password. We will never ask for them. Ever.

## Before you write — try these first

You may find your answer in seconds:

- [Getting started](/introduction/what-is-give-protocol/)
- [Wallet connection](/user-guides/donors/wallet-connection/)
- [Donating crypto or fiat](/user-guides/donors/)
- [For charities](/user-guides/charities/)
- [For volunteers](/user-guides/volunteers/)
- [Safety & security](/safety-security/)

## Press, partnerships, and media

Same inbox. Use the subject line **"Press"**, **"Partnership"**, or **"Media"** and we'll route you to the right person.

## Reporting a security issue

For responsible disclosure of vulnerabilities, please use the subject line **"Security disclosure"**. We follow coordinated disclosure and acknowledge reports within 72 hours.

---

*Give Protocol is a Progressive Web App for blockchain-based charitable giving. Your donations move on-chain; our support is human.*
```

---

## Layout / design guidance for engineering

- Use the existing Jekyll page layout (matches `getting-started/`, `safety-security/`).
- Mailto link must be clickable — no obfuscation. Live verified `info@giveprotocol.io`.
- Ensure permalink `/help-center/need-help/` resolves (currently 404).
- Add to `_data/navigation.yml` (or equivalent) under Help Center so the link renders in the nav.
- A11y: keep the `<h1>` first, mailto as an `<a>` (not button), preserve focus ring.
- No forms, no JS, no third-party widgets (zero new sub-processors → no Privacy.tsx update needed).

## Brand-safety checklist (CMO sign-off)

- [x] Single source of contact = `info@giveprotocol.io` (matches verified Resend sender domain).
- [x] No collection of PII via the page itself (no form → no GDPR Art. 13 disclosure trigger).
- [x] Voice: compelling, brief, empathetic. SOUL.md compliant.
- [x] Security guidance (never share seed phrase) inline — reduces phishing risk.
- [x] No mention of phone/SMS/chat — matches CEO directive.
- [x] Reused canonical domain `giveprotocol.io` (not `.org` — see GIV-335 typo learnings).

## Handoff

Engineering executor (give-protocol-docs repo owner) commits the markdown above, updates nav, and verifies the live URL resolves with 200. CMO approves merge on content; engineering owns the Jekyll/CI mechanics.
