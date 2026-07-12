# GIV-634 — Email Template Copy (CMO Draft v1)

**Author:** CMO (agent 00b6774b)
**Date:** 2026-07-12
**Status:** Draft for CEO/CTO review → engineering implementation

## Brand & Delivery Constants

- **From (all templates):** `Give Protocol <notifications@giveprotocol.io>`
- **Reply-To (all templates):** `info@giveprotocol.io`
- **Provider:** Resend (giveprotocol.io verified)
- **Voice:** Confident, warm, professional, human. World-class but not corporate. Short rhythmic sentences. Lead with the "why."
- **Country-agnostic copy (per GIV-520):** External surfaces say "Tax ID" instead of "EIN," "verified nonprofit" instead of "verified 501(c)(3)" — **except** where US-tax-compliance requires the literal terms (Template 3 & 4 US receipts).
- **Legal footer (all templates):**
  > Give Protocol · giveprotocol.io · You're receiving this because of activity on your Give Protocol account.
  > Questions? Reply to this email or write to info@giveprotocol.io.
- **i18n:** Templates registered as content JSON in the mail service; body variants must be added to `en.ts` if surfaced anywhere in-app. Non-English translation regen delegated to a follow-up ticket once EN copy is locked.

---

## 1. Charity Approval Email

**Subject:** You're approved — welcome to Give Protocol
**Preheader:** Your charity is verified and live. Here's your portal.

**Body:**

> Hi {{charityContactName}},
>
> Congratulations — **{{charityLegalName}}** is now a verified charity on Give Protocol.
>
> Your profile is live. Donors can find you, give directly, and see the impact you create. No middlemen. No delays. Just support that arrives where it matters.
>
> **What to do next:**
>
> 1. Sign in to your portal
> 2. Finish your public profile (mission, photos, wallets)
> 3. Share your Give Protocol link with your community
>
> [Open your charity portal →]({{portalUrl}})
>
> We built Give Protocol so causes like yours can spend less time on fees and paperwork, and more time on the mission. Welcome aboard. We're glad you're here.
>
> — The Give Protocol Team

**Variables:** `charityContactName`, `charityLegalName`, `portalUrl`

---

## 2. Charity Rejection Email

**Subject:** Update on your Give Protocol application
**Preheader:** We reviewed your submission — here's where we landed.

**Body:**

> Hi {{charityContactName}},
>
> Thank you for applying to Give Protocol on behalf of **{{charityLegalName}}**.
>
> After careful review, we're unable to approve this application at this time. The reason:
>
> > {{rejectionReason}}
>
> This decision isn't a judgment of your mission. Our verification standards protect donors and every charity on the platform, and sometimes an application needs additional documentation or a change in eligibility status before we can move forward.
>
> **What you can do:**
>
> - Review the reason above and gather any missing documentation.
> - Reapply once the underlying items are resolved — most applicants who address the feedback are approved on their next submission.
> - Reply to this email if you'd like to discuss the decision or need clarification.
>
> We appreciate the work you do and hope to welcome you to Give Protocol in the future.
>
> — The Give Protocol Trust & Safety Team

**Variables:** `charityContactName`, `charityLegalName`, `rejectionReason`

---

## 3. Donation Receipt — Helcim (Card / Fiat)

**Subject:** Your donation receipt from {{charityLegalName}} — ${{amountFormatted}}
**Preheader:** Thank you. Keep this receipt for your records.

**Body:**

> Hi {{donorName}},
>
> Thank you for your generosity. Your donation has been processed and delivered to **{{charityLegalName}}**.
>
> **Official Donation Receipt**
>
> | Field | Detail |
> | --- | --- |
> | Donor | {{donorName}} |
> | Charity | {{charityLegalName}} |
> | Charity Tax ID (EIN) | {{charityEin}} |
> | Date of donation | {{donationDate}} |
> | Amount | ${{amountFormatted}} {{currencyCode}} |
> | Payment method | {{cardBrand}} ending in {{cardLast4}} |
> | Transaction ID | {{transactionId}} |
> | Processor | Helcim |
>
> **{{charityLegalName}}** is a registered 501(c)(3) tax-exempt organization in the United States. No goods or services were provided in exchange for this contribution. Your donation may be tax-deductible to the fullest extent permitted by law. Please consult your tax advisor. Retain this receipt for your records.
>
> Every dollar you give reaches the causes you care about — transparently, and on-chain when applicable. That's the whole point.
>
> [View this donation in your account →]({{donationDetailUrl}})
>
> With gratitude,
> The Give Protocol Team

**Variables:** `donorName`, `charityLegalName`, `charityEin`, `donationDate`, `amountFormatted`, `currencyCode`, `cardBrand`, `cardLast4`, `transactionId`, `donationDetailUrl`

**Note to engineering:** For non-US charities, swap the "501(c)(3)" paragraph for `"{{charityLegalName}} is a verified nonprofit in {{charityCountry}}. Consult your local tax advisor to determine deductibility."` Gate on `charity.country_code === "US"`.

---

## 4. Donation Receipt — PayPal

**Subject:** Your donation receipt from {{charityLegalName}} — ${{amountFormatted}}
**Preheader:** Thank you. Keep this receipt for your records.

**Body:**

> Hi {{donorName}},
>
> Thank you for your generosity. Your donation has been processed and delivered to **{{charityLegalName}}**.
>
> **Official Donation Receipt**
>
> | Field | Detail |
> | --- | --- |
> | Donor | {{donorName}} |
> | Charity | {{charityLegalName}} |
> | Charity Tax ID (EIN) | {{charityEin}} |
> | Date of donation | {{donationDate}} |
> | Amount | ${{amountFormatted}} {{currencyCode}} |
> | Payment method | PayPal ({{paypalEmail}}) |
> | Transaction ID | {{transactionId}} |
> | Processor | PayPal |
>
> **{{charityLegalName}}** is a registered 501(c)(3) tax-exempt organization in the United States. No goods or services were provided in exchange for this contribution. Your donation may be tax-deductible to the fullest extent permitted by law. Please consult your tax advisor. Retain this receipt for your records.
>
> Every dollar you give reaches the causes you care about — transparently, and on-chain when applicable. That's the whole point.
>
> [View this donation in your account →]({{donationDetailUrl}})
>
> With gratitude,
> The Give Protocol Team

**Variables:** `donorName`, `charityLegalName`, `charityEin`, `donationDate`, `amountFormatted`, `currencyCode`, `paypalEmail`, `transactionId`, `donationDetailUrl`

**Note:** Same non-US swap rule as Template 3.

---

## 5. Username Reminder — Existing Email

**Subject:** Your Give Protocol username
**Preheader:** Someone (hopefully you) asked to be reminded.

**Body:**

> Hi there,
>
> Someone requested a username reminder for the Give Protocol account tied to this email address.
>
> **Your username:** `{{username}}`
>
> [Sign in →]({{signInUrl}})
>
> If you didn't request this, you can safely ignore this email — no changes have been made to your account. If you're seeing repeated reminders you didn't ask for, reply to this email and we'll investigate.
>
> — The Give Protocol Team

**Variables:** `username`, `signInUrl`

---

## 6. Volunteer Hours Approval Email

**Subject:** Your volunteer hours were approved by {{charityLegalName}}
**Preheader:** {{hoursApproved}} hours logged and verified. Nice work.

**Body:**

> Hi {{volunteerName}},
>
> Great news — **{{charityLegalName}}** has approved your volunteer hours.
>
> **Approved contribution:**
>
> - **Role / activity:** {{activityDescription}}
> - **Date(s) served:** {{serviceDates}}
> - **Hours approved:** {{hoursApproved}}
> - **Approved by:** {{approverName}}, {{approverTitle}}
> - **Verification date:** {{verificationDate}}
>
> Your service now appears on your verified volunteer record. Employers, schools, and communities can trust these hours because they're confirmed by the organization you served — not self-reported.
>
> [View your volunteer record →]({{volunteerProfileUrl}})
>
> Thank you for showing up. This is the work that moves the world forward.
>
> — The Give Protocol Team

**Variables:** `volunteerName`, `charityLegalName`, `activityDescription`, `serviceDates`, `hoursApproved`, `approverName`, `approverTitle`, `verificationDate`, `volunteerProfileUrl`

---

## 7. Volunteer Hours Rejection Email

**Subject:** Update on your volunteer hours submission
**Preheader:** {{charityLegalName}} reviewed your submission — here's the outcome.

**Body:**

> Hi {{volunteerName}},
>
> **{{charityLegalName}}** has reviewed your submitted volunteer hours and was unable to approve them at this time.
>
> **Submission details:**
>
> - **Activity:** {{activityDescription}}
> - **Date(s):** {{serviceDates}}
> - **Hours submitted:** {{hoursSubmitted}}
>
> **Reason from the organization:**
>
> > {{rejectionReason}}
>
> This isn't a reflection of your commitment to service. Often it's a matter of a missing detail, an activity that falls outside the scope the organization tracks, or a date that needs correction.
>
> **What you can do next:**
>
> - Reach out to {{charityLegalName}} directly to clarify or resubmit with corrected details.
> - Log new hours at any time from your volunteer dashboard.
>
> [Go to your volunteer dashboard →]({{volunteerDashboardUrl}})
>
> Thank you for the time you give. Keep going.
>
> — The Give Protocol Team

**Variables:** `volunteerName`, `charityLegalName`, `activityDescription`, `serviceDates`, `hoursSubmitted`, `rejectionReason`, `volunteerDashboardUrl`

---

## 8. Password Reset (Request New Password)

**Subject:** Reset your Give Protocol password
**Preheader:** A secure link to set a new password — expires in 60 minutes.

**Body:**

> Hi there,
>
> We received a request to reset the password for the Give Protocol account tied to this email address.
>
> [Set a new password →]({{resetUrl}})
>
> **A few things to know:**
>
> - This link expires in **60 minutes** for your security.
> - Use it once — after you set a new password, the link stops working.
> - If the link expires, request a new one from the sign-in page.
>
> **Didn't request this?** No action is needed. Your password stays the same and your account remains secure. If you're seeing repeated reset emails you didn't ask for, reply to this message and our team will investigate.
>
> — The Give Protocol Team

**Variables:** `resetUrl` (Supabase-generated recovery link routing to `/auth/reset-password` per GIV-338 pattern)

---

## Delivery Notes for Engineering

1. **Sender identity** — all templates use `notifications@giveprotocol.io` (from) + `info@giveprotocol.io` (reply-to). Do not introduce new sub-processors or send domains (brand-safe single-inbox routing pattern).
2. **HTML + plaintext** — build both. The markdown blockquote tables above render as HTML `<table>`s; plaintext version must include a labeled key/value list of the same fields (deliverability + accessibility).
3. **Receipt legal text (Templates 3, 4)** — the "No goods or services" clause is IRS Publication 1771 required language for US 501(c)(3) receipts. Do not edit without CFO / legal review.
4. **Country-agnostic gating** — for Templates 3 & 4, engineering must branch the tax-exemption paragraph on `charity.country_code`. US = literal 501(c)(3) text; non-US = generic "verified nonprofit — consult your local tax advisor" text (see GIV-520 pattern).
5. **Password reset** — must integrate with Supabase Auth `PASSWORD_RECOVERY` event and route to existing `/auth/reset-password` page (GIV-338).
6. **PII handling** — donor name, EIN, transaction ID, and PayPal email are PII/sensitive data. Ensure templates are rendered server-side in the edge function (never leaked to a client-visible template preview endpoint).
7. **i18n follow-up** — once engineering wires these into the mail service, open a separate translation regen ticket (analogous to GIV-581) to localize into the 11 non-English languages.

## Acceptance Criteria for Sign-off

- [ ] CEO or founder approves customer-facing tone.
- [ ] Legal / compliance reviewer confirms IRS Pub. 1771 language on Templates 3 & 4.
- [ ] Engineering child issue opened for wire-up (Backend / edge functions in `give-protocol-backend`).
- [ ] Translation regen follow-up ticket filed once EN copy is locked.
