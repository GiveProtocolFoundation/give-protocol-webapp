import React from "react";
import { StaticPageLayout } from "@/components/layout/StaticPageLayout";
import { ImportantNotice } from "@/components/ui/ImportantNotice";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "@/hooks/useTranslation";

/** Renders the introduction section of the privacy policy. */
const SectionIntroduction: React.FC = () => (
  <section>
    <h2>1. Introduction</h2>
    <p>
      GiveProtocol (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
      committed to protecting your privacy. This Privacy Policy explains how we
      collect, use, disclose, and safeguard your information when you use our
      blockchain-based philanthropic platform and related services
      (collectively, the &quot;Service&quot;).
    </p>
    <p>
      We value your privacy and recognize the sensitivity of personal data.
      While blockchain technology enables transparency in donations and
      volunteer contributions, we&apos;ve designed our platform to balance
      transparency with appropriate privacy protections.
    </p>

    <ImportantNotice variant="warning">
      <p className="font-bold">
        IF YOU DO NOT AGREE WITH ANY PART OF THIS PRIVACY POLICY OR OUR TERMS OF
        USE, THEN PLEASE DO NOT USE ANY OF THE SERVICES.
      </p>
    </ImportantNotice>

    <p>
      This Privacy Policy describes the personal data we process, the purposes
      and legal bases for that processing, and the rights available to you under
      applicable data protection law. The legal basis for each processing
      activity is set out in Section 4 (Legal Basis for Processing) and in the
      relevant sections below. We do not treat your provision of personal data
      as blanket consent to all processing; each processing activity relies on
      the specific legal basis identified for it.
    </p>
    <p>
      Where you provide us with personal data relating to another individual
      (such as an organization representative or a volunteer reference), we
      process that data as the data controller on the legal basis identified in
      Section 4. Please ensure you are permitted to share that data with us and,
      where appropriate, make the individual aware of this Privacy Policy.
    </p>
  </section>
);

/** Renders the information collection section of the privacy policy. */
const SectionInformationWeCollect: React.FC = () => (
  <section>
    <h2>2. Information We Collect</h2>

    <h3>2.1 Information You Provide to Us</h3>
    <p>We collect information you provide directly to us when you:</p>
    <ul>
      <li>Create an account or user profile</li>
      <li>Register as a charitable organization</li>
      <li>Register as a volunteer</li>
      <li>Post volunteer opportunities</li>
      <li>Process donations</li>
      <li>Communicate with us</li>
      <li>Participate in governance activities</li>
    </ul>
    <p>This information may include:</p>
    <ul>
      <li>Identity Data (name, username, title)</li>
      <li>Contact Data (email address, postal address, phone number)</li>
      <li>Account credentials</li>
      <li>Payment information</li>
      <li>Transaction Data (donation history, volunteer hours)</li>
      <li>Identification documents for identity verification (KYC)</li>
      <li>Organization verification documents</li>
      <li>Professional qualifications and experience</li>
      <li>Volunteer skills and availability</li>
      <li>Feedback and Correspondence Data</li>
      <li>Profile information and preferences</li>
    </ul>

    <h3>2.2 Information Collected Automatically</h3>
    <p>When you use our Service, we automatically collect:</p>
    <ul>
      <li>Technical Data (IP address, browser type, operating system)</li>
      <li>Usage data (pages visited, features used, time spent)</li>
      <li>Device information</li>
      <li>Network information</li>
      <li>
        Blockchain transaction data (wallet addresses, timestamps, donation
        amounts)
      </li>
      <li>Tracking Data from cookies and similar technologies</li>
    </ul>
    <p>
      <strong>IP address.</strong> We collect your IP address automatically when
      you access the Service, when you make a card payment, and when
      administrative or wallet-designation actions are performed on your
      account. We use it to secure the platform, detect and prevent fraud, and
      maintain administrative audit trails. Our legal basis is our legitimate
      interests in keeping the Service and your account secure (Article 6(1)(f)
      GDPR). For card payments, your IP address is shared with our payment
      processor for fraud detection (see Section 5.2 and the
      international-transfer disclosures in Section 9). We retain IP address and
      related security logs for up to twelve (12) months (see Section 7.1).
    </p>

    <h3>2.3 Blockchain Data</h3>
    <p>
      The nature of blockchain technology means that certain transaction
      information is publicly visible on the blockchain, including:
    </p>
    <ul>
      <li>Wallet addresses</li>
      <li>Transaction amounts</li>
      <li>Transaction timestamps</li>
      <li>Smart contract interactions</li>
    </ul>
    <p>
      When you make a donation or receive volunteer verification through Give
      Protocol, your wallet address is recorded both in our internal systems and
      on the public blockchain. While the on-chain record itself does not embed
      your name or email, your wallet address{" "}
      <strong>is linked to your Give Protocol account in our database</strong>{" "}
      for the duration of your account, so within our systems the address is
      personal data relating to you.
    </p>
    <p>
      <strong>
        On-chain records (donation transactions, volunteer verification tokens)
        are permanent and cannot be deleted or modified.
      </strong>{" "}
      When you exercise your right to erasure (see Section 8), we will delete
      all personal data from our internal systems, including the link between
      your account and your wallet address, but the on-chain transaction records
      associated with that wallet address will remain on the public blockchain
      indefinitely. If you have ever publicly connected your wallet address to
      your real-world identity (for example, on social media), that on-chain
      history may remain re-identifiable by third parties beyond our control. We
      recommend reviewing the permanence of blockchain records before connecting
      your wallet.
    </p>
    <p>
      <strong>Legal basis for processing your wallet address.</strong> We
      process your wallet address to deliver the Service you request — recording
      and verifying your donations and volunteer contributions (Article 6(1)(b)
      GDPR, performance of a contract) — and to protect the integrity and
      security of on-chain transactions (Article 6(1)(f) GDPR, legitimate
      interests). Your wallet address is a public blockchain identifier: while
      we store it as personal data linked to your account, the address itself is
      visible to anyone on the public blockchain. We retain the link between
      your account and your wallet address for the duration of your account (see
      Section 7.1); the on-chain record is permanent as described above. You are
      first shown this notice at the point your wallet is connected, where the
      wallet connection screen links to this Privacy Policy.
    </p>

    <h3>2.4 Information We Will Never Collect</h3>
    <ImportantNotice variant="warning">
      <p className="font-bold">
        We will never ask you to share your private keys or wallet seed. Never
        trust anyone or any site that asks you to enter your private keys or
        wallet seed.
      </p>
    </ImportantNotice>
    <p>
      We do not collect any special categories of personal data about you (this
      includes details about your race or ethnicity, religious or philosophical
      beliefs, sex life, sexual orientation, political opinions, trade union
      membership, information about your health and genetic and biometric data).
      Nor do we collect any information about criminal convictions and offenses,
      except where required for charitable organization verification purposes
      and permitted by law.
    </p>

    <h3>2.5 Aggregated and Anonymized Data</h3>
    <p>
      We may create aggregated and anonymized data (such as statistical or
      demographic data) which will not directly or indirectly reveal your
      identity. For example, we may aggregate donation data to calculate the
      percentage of users supporting specific causes. If we combine aggregated
      data with your personal data so that it can identify you, we treat the
      combined data as personal data subject to this Privacy Policy.
    </p>

    <h3>2.6 Consequences if We Cannot Collect Your Personal Data</h3>
    <p>
      Where we need to collect personal data by law, or under the terms of a
      contract we have with you, and you fail to provide that data when
      requested, we may not be able to perform the contract we have or are
      trying to enter into with you (for example, to provide you with Services).
      In this case, we may have to cancel a service you have with us, but we
      will notify you if this is the case at the time.
    </p>
  </section>
);

/** Renders the information usage section of the privacy policy. */
const SectionHowWeUseInfo: React.FC = () => (
  <section>
    <h2>3. How We Use Your Information</h2>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Provide, maintain, and improve our Services</li>
      <li>Process transactions and send confirmations</li>
      <li>Verify charitable organizations and volunteers</li>
      <li>Communicate with you about the Service</li>
      <li>Ensure platform security and prevent fraud</li>
      <li>Comply with legal obligations</li>
      <li>Match volunteers with opportunities</li>
      <li>Generate platform analytics and insights</li>
      <li>Facilitate governance participation</li>
    </ul>
  </section>
);

/** Renders the legal basis for processing section of the privacy policy. */
const SectionLegalBasis: React.FC = () => (
  <section>
    <h2>4. Legal Basis for Processing</h2>
    <p>We process your personal data based on:</p>
    <ul>
      <li>Performance of a contract when we provide you with our Service</li>
      <li>Legitimate interests in operating and improving our Service</li>
      <li>Compliance with our legal obligations</li>
      <li>Your consent, where applicable</li>
    </ul>
    <p>
      You have the right to lodge a complaint with a supervisory authority if
      you believe our processing of your personal data violates applicable law.
      If you are located in the European Union, the competent supervisory
      authority for Give Protocol is the{" "}
      <strong>Irish Data Protection Commission (DPC)</strong> —{" "}
      <a
        href="https://www.dataprotection.ie"
        target="_blank"
        rel="noopener noreferrer"
      >
        www.dataprotection.ie
      </a>
      {". "}
      If you are located in the United Kingdom, you may contact the{" "}
      <strong>Information Commissioner&apos;s Office (ICO)</strong> —{" "}
      <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
        ico.org.uk
      </a>
      {". "}
      You may also lodge a complaint with the supervisory authority of your
      habitual residence, place of work, or place of the alleged infringement.
    </p>
  </section>
);

/** Renders the information sharing section of the privacy policy. */
const SectionHowWeShare: React.FC = () => (
  <section>
    <h2>5. How We Share Your Information</h2>
    <p>We may share your information in the following circumstances:</p>

    <h3>5.1 With Charitable Organizations</h3>
    <p>
      When you make a <strong>fiat (card) donation</strong>, we share your{" "}
      <strong>name</strong> with the recipient charitable organization so that
      it can acknowledge your gift, issue any applicable tax receipt, and
      maintain its own donation records. Your name appears in the charity&apos;s
      administrative portal transaction history. We do <strong>not</strong>{" "}
      share your email address, postal address, or payment-card details with the
      recipient charity.
    </p>
    <p>
      When you make a <strong>cryptocurrency donation</strong>, the transaction
      details (wallet address, amount, and timestamp) are recorded on the public
      blockchain and are inherently visible to the recipient charity and anyone
      else; we do not additionally share your name or contact details. See
      Section 5.4 (Blockchain Transparency).
    </p>
    <p>
      When you <strong>volunteer</strong> for an organization, we share the
      information necessary to facilitate the volunteer opportunity (such as
      your name and the details you submit in your application) with that
      organization.
    </p>
    <p>
      The legal basis for this sharing is{" "}
      <strong>Article 6(1)(b) (performance of a contract)</strong>, as the
      donation or volunteer engagement is a transaction between you and the
      recipient organization.
    </p>

    <h3>5.2 With Service Providers</h3>
    <p>
      We may share information with third-party service providers who help us
      operate our platform, under written data processing agreements that bind
      them to act only on our instructions (Article 28 GDPR) and to apply
      appropriate technical and organisational security measures.
    </p>
    <p>
      <strong>Payment processing (Helcim).</strong> Fiat (card) donations are
      processed by Helcim Inc., a payment processor based in Calgary, Canada. To
      authorise a card payment and to carry out fraud-prevention checks, we
      transmit the donor&apos;s name, email address, payment amount, and client
      IP address to Helcim. Helcim acts as a data processor for this activity
      under a data processing agreement; the related cross-border transfer to
      Canada and the safeguards that apply to it are described in Section 9.2.
    </p>
    <p>
      <strong>Transactional email delivery (Resend).</strong> Outbound platform
      emails &mdash; including donation receipts, charity claim and
      volunteer-hours notifications, and wallet-designation confirmations
      &mdash; are delivered through Resend, Inc. (United States). Resend
      receives the recipient&apos;s email address and name and any personal data
      contained in the message body, solely to deliver the email on our behalf.
      This processing is governed by a Data Processing Agreement with Resend;
      the international-transfer mechanism is set out in Section 9.2.
    </p>
    <p>
      Other named processors &mdash; including our error-monitoring provider
      (Sentry) and, where active, analytics (Google Analytics 4) &mdash; are
      described, together with the international-transfer safeguards that apply
      to them, in Sections 9.2 and 11.2.
    </p>

    <h3>5.3 For Legal Compliance</h3>
    <p>
      We may disclose information when required by law or to protect our rights
      and safety.
    </p>

    <h3>5.4 Blockchain Transparency</h3>
    <p>
      Transaction data is publicly visible on the blockchain as part of its
      transparent nature.
    </p>

    <h3>5.5 Data Storage Location</h3>
    <p>
      Personal data submitted through Give Protocol is stored on servers located
      in <strong>Ireland, European Union</strong> (Supabase eu-west-1 region).
      Encrypted disaster-recovery backups are held in the same region. Further
      detail on cross-border data flows, including residual transfers to
      third-party processors and remote access by our staff, is set out in
      Section 9 (International Data Transfers).
    </p>
  </section>
);

/** Renders the data security section of the privacy policy. */
const SectionDataSecurity: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section>
      <h2>6. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to
        protect your personal data against unauthorized access, alteration,
        disclosure, or destruction. However, no method of transmission over the
        internet or electronic storage is 100% secure.
      </p>
      <p>
        {t(
          "privacy.security.auditLog",
          "As a technical measure under GDPR Article 32, we log and monitor administrative access to personal data \u2014 including the action taken and when it occurred \u2014 to detect unauthorized access, demonstrate accountability, and reconstruct events in the unlikely event of a personal data breach (Article 34). Donor personal data is not duplicated into these administrative-access logs. Administrative-access logs are distinct from the authentication and security logs described in \u00a77.1; their retention period is governed by our internal Record of Processing Activities.",
        )}
      </p>
    </section>
  );
};

/** Renders the data retention section of the privacy policy. */
const SectionDataRetention: React.FC = () => (
  <section>
    <h2>7. Data Retention</h2>
    <p>
      We retain personal data only for as long as necessary to fulfill the
      purposes outlined in this Privacy Policy, unless a longer retention period
      is required or permitted by law. Specific retention periods per data
      category are set out below.
    </p>

    <h3>7.1 Retention Periods by Data Category</h3>
    <ul>
      <li>
        <strong>Donation and transaction records</strong> (donation amounts,
        charity recipient, transaction timestamps, tax-relevant attribution):
        retained for <strong>seven (7) years</strong> after the donation, to
        satisfy charitable tax-reporting and audit obligations under US and EU
        member-state law. After this period, records are aggregated and the
        personal identifiers are removed.
      </li>
      <li>
        <strong>Identity verification documents</strong> (identity-verification
        KYC documents, charity registration documents): the Foundation performs
        KYC for <strong>identity verification only</strong> &mdash; to bind a
        charity, recipient, or wallet to a verified identity for grant integrity
        and fraud deterrence. The Foundation is{" "}
        <strong>not an anti-money-laundering (AML) obliged entity</strong> (it
        is not a money services business, money transmitter, or virtual-asset
        service provider), so this KYC is <strong>not</strong> AML customer due
        diligence and the five-year AML record-keeping regime does not apply.
        Verification documents are retained only for the duration of the
        verified relationship and deleted when that relationship ends. Where a
        verification is <strong>rejected</strong>, the application and its
        documents are deleted within <strong>thirty (30) days</strong> of the
        final decision. This 30-day period is grounded in{" "}
        <strong>GDPR data minimisation and storage limitation</strong> (Article
        5(1)(c) and Article 5(1)(e)), not on AML record-keeping; we retain a
        rejected application beyond 30 days only where strictly necessary for an
        active regulatory or legal dispute. This identity-only, non-AML posture
        applies while the Foundation does not take custody of donor or recipient
        funds, does not accept regulated money flows, and keeps payment
        processing intermediated by our regulated payment processor (Helcim) and
        on-chain transfers wallet-to-recipient; if any of those facts change,
        this retention basis will be re-assessed.
      </li>
      <li>
        <strong>Account profile data</strong> (name, email, contact details,
        profile preferences, volunteer skills): retained for as long as the
        account is active. On account deletion, profile data is anonymized or
        deleted within <strong>thirty (30) days</strong> of the deletion request
        being processed.
      </li>
      <li>
        <strong>Volunteer activity records</strong> (volunteer hours, charity
        affiliations, references): retained for the duration of the account plus{" "}
        <strong>three (3) years</strong> to allow verification of past volunteer
        history by current and prospective charities, and to defend against
        disputes. After this period, records are anonymized.
      </li>
      <li>
        <strong>Authentication and security logs</strong> (login events, session
        metadata, IP addresses, security audit trails): retained for up to{" "}
        <strong>twelve (12) months</strong> for security monitoring, fraud
        detection, and incident investigation. Logs relating to an active or
        recent security incident may be retained longer until the incident is
        closed.
      </li>
      <li>
        <strong>Communications and correspondence</strong> (support tickets,
        emails, in-app messages): retained for up to{" "}
        <strong>three (3) years</strong> from the last interaction, for quality
        assurance and dispute resolution.
      </li>
      <li>
        <strong>Cookie and analytics data</strong>: retained per the cookie
        lifetime declared in our Cookies notice; aggregated analytics are
        retained indefinitely in non-personal form.
      </li>
      <li>
        <strong>Blockchain transaction data</strong>: by the immutable nature of
        public blockchains, on-chain transactions cannot be deleted. Where
        on-chain data is linked to a Give Protocol account, we can sever the
        link in our off-chain records but cannot remove the underlying on-chain
        record.
      </li>
    </ul>

    <h3>7.2 Backup Retention and the Right to Erasure</h3>
    <p>
      When you exercise the right to erasure (Article 17 GDPR), we delete your
      personal data from our live production systems promptly. Because we
      operate encrypted database backups for disaster-recovery purposes,
      residual copies of your data may persist in those backups for up to{" "}
      <strong>seven (7) days</strong> after your erasure request is processed in
      production. We do not access, sell, share, or otherwise use backup data
      for any purpose other than restoring service in the event of a disaster.
      Backup data is encrypted at rest and is rotated out automatically as the
      backup retention window passes.
    </p>
    <p>
      If a disaster-recovery restore takes place during the backup retention
      window, any restored copies of previously-erased data are re-deleted
      within twenty-four (24) hours of the restore completing, and a record of
      the re-deletion is logged.
    </p>

    <h3>7.3 Legal and Regulatory Retention</h3>
    <p>
      We may retain specific records beyond the periods stated above where
      required by law (for example, where a tax authority, supervisory
      authority, or court order requires longer retention), or where the records
      are necessary for the establishment, exercise, or defense of legal claims.
      In those cases, retention is limited to what is strictly necessary for the
      legal purpose and the data is segregated from active processing.
    </p>

    <h3>7.4 Personal Data Breach Notification</h3>
    <p>
      If we determine that a personal data breach has occurred that is likely to
      result in a risk to your rights and freedoms, we will notify the competent
      supervisory authority within seventy-two (72) hours of becoming aware of
      the breach, in line with Article 33 GDPR. If the breach is likely to
      result in a high risk to your rights and freedoms, we will also notify you
      directly without undue delay, in line with Article 34 GDPR. We maintain an
      internal register of all personal data breaches as required by Article
      33(5) GDPR.
    </p>
  </section>
);

/** Renders the user rights section of the privacy policy. */
const SectionYourRights: React.FC = () => (
  <section>
    <h2>8. Your Rights</h2>
    <p>
      Depending on your location, you may have certain rights regarding your
      personal data, including:
    </p>
    <ul>
      <li>Right to access your personal data</li>
      <li>Right to correct inaccurate data</li>
      <li>Right to delete your data</li>
      <li>Right to restrict processing</li>
      <li>Right to data portability</li>
      <li>Right to object to processing</li>
      <li>Right to withdraw consent</li>
    </ul>
    <p>
      To exercise these rights, please contact us at privacy@giveprotocol.io.
    </p>

    <h3>8.1 Right to Erasure — Blockchain Limitation</h3>
    <p>
      Exercising your right to erasure (Article 17 GDPR) will result in deletion
      of all personal data from our internal systems within{" "}
      <strong>30 days</strong>, including the link between your Give Protocol
      account and your wallet address. However, transaction data that has
      already been recorded on public blockchain networks (such as Moonbeam,
      Base, and Optimism) <strong>cannot be erased</strong>, because blockchain
      ledgers are immutable by design and no technical means exist to remove or
      alter a confirmed on-chain record.
    </p>
    <p>
      This means that after your erasure request is fulfilled, donation
      transactions and volunteer-verification tokens linked to your wallet
      address remain publicly visible on-chain. If you have previously linked
      your identity to your wallet address through public means outside of our
      platform, we cannot control the re-identification of your on-chain
      history. This limitation is described further in Section 2.3, and the
      corresponding retention position is set out in Section 7.1.
    </p>
  </section>
);

/** Renders the international data transfers section of the privacy policy. */
const SectionInternationalTransfers: React.FC = () => (
  <section>
    <h2>9. International Data Transfers</h2>

    <h3>9.1 Primary Database — European Economic Area</h3>
    <p>
      Personal data stored in our primary database remains within the European
      Economic Area (Ireland). We do not transfer primary database data to
      countries outside the EEA for storage purposes. For EU and UK data
      subjects whose personal data is held only in the primary database, no
      Article 44–49 GDPR transfer occurs by virtue of storage.
    </p>

    <h3>9.2 Residual Transfers — Third-Party Processors</h3>
    <p>
      Certain processing activities still involve personal data being
      transmitted outside the EEA. For each active processor transfer, we rely
      on a recognised Article 46 GDPR transfer mechanism (typically the European
      Commission&apos;s Standard Contractual Clauses (&quot;SCCs&quot;)) or,
      where applicable, an adequacy decision.
    </p>
    <ul>
      <li>
        <strong>Payment processing (Helcim)</strong>: where you make a fiat
        (card) donation, the donor name, email address, payment amount, and
        client IP address are transmitted to Helcim Inc. in Canada to authorise
        the payment and to perform fraud-prevention checks. Transfers to Canada
        rely on the European Commission&apos;s adequacy decision for Canadian
        commercial organisations subject to PIPEDA and, as a supplementary
        safeguard, the European Commission&apos;s Standard Contractual Clauses
        under our data processing agreement with Helcim. This transfer occurs
        only when you choose to make a fiat donation.
      </li>
      <li>
        <strong>Error monitoring (Sentry)</strong>: application error and
        performance data is sent to Sentry. Where the Sentry organisation is
        hosted in the United States, this constitutes a transfer to a third
        country and is covered by SCCs. Replay capture and performance tracing
        have been disabled, and email identifiers are stripped from Sentry user
        context.
      </li>
      <li>
        <strong>Transactional email delivery (Resend)</strong>: recipient email
        addresses, names, and message content are transmitted to Resend, Inc. in
        the United States to deliver platform emails. This transfer is covered
        by the Standard Contractual Clauses incorporated into our Data
        Processing Agreement with Resend (Art. 46(2)(c) GDPR), and applies only
        to users who receive a transactional email from us.
      </li>
      <li>
        <strong>Analytics (Google Analytics 4, if active)</strong>: where we
        operate analytics that transmit usage data to Google in the United
        States, the transfer is covered by the EU–US Data Privacy Framework
        adequacy decision and Google&apos;s SCCs. We only load analytics after
        you grant cookie consent (see our Cookies notice).
      </li>
      <li>
        <strong>Remote database access by US-based staff</strong>: members of
        our engineering and operations team based in the United States may
        access the primary database remotely for administration, support, and
        incident response. Following EDPB guidance, remote access from a third
        country is treated as a transfer for GDPR purposes. Such access is
        governed by intra-group SCCs and role-based access controls, with access
        events logged.
      </li>
      <li>
        <strong>Blockchain layer</strong>: by design, public blockchain networks
        are globally distributed and immutable. On-chain data (wallet addresses,
        transaction amounts, timestamps, smart-contract interactions) is not
        subject to geographic restriction and cannot be subjected to a transfer
        mechanism in the conventional sense. We minimise the personal data
        published on-chain, as described in Section 2.3.
      </li>
    </ul>

    <h3>9.3 Your Rights in Respect of Transfers</h3>
    <p>
      You may request a copy of the safeguards we rely on for any third-country
      transfer by contacting us at privacy@giveprotocol.io.
    </p>
  </section>
);

/** Renders the policy changes section of the privacy policy. */
const SectionChanges: React.FC = () => (
  <section>
    <h2>10. Changes to This Privacy Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of
      any material changes by posting the new Privacy Policy on this page and
      updating the effective date.
    </p>
  </section>
);

/** Renders the cookie preferences and analytics processing section of the privacy policy. */
const SectionCookiePreferences: React.FC = () => (
  <section>
    <h2>11. Cookie Preferences and Analytics Processing</h2>
    <p>
      We use cookies and similar technologies on our platform. Some are
      essential and cannot be disabled; others are optional and require your
      explicit consent.
    </p>

    <h3>11.1 Essential technologies</h3>
    <p>
      Required for the site to function: session authentication, CSRF
      protection, and storing your privacy preferences. These are always active
      and cannot be turned off.
    </p>

    <h3>11.2 Error monitoring and session analytics (Sentry)</h3>
    <p>
      <strong>Error monitoring (always active).</strong> We use Sentry
      (Functional Software, Inc., 45 Fremont Street, San Francisco, CA 94105,
      USA) to receive error reports. In this mode, Sentry receives only a
      randomly generated, opaque session identifier &mdash; no email address, no
      account information, and no session recording. We rely on our legitimate
      interests in operating a stable, secure service (Art. 6(1)(f) GDPR). You
      have the right to object to this processing at any time by contacting us
      at the address in &sect;1 (Art. 21 GDPR).
    </p>
    <p>
      <strong>Session analytics (optional &mdash; consent required).</strong>{" "}
      With your consent, we also enable enhanced Sentry analytics. In this mode,
      Sentry additionally receives your user identifier, email address, and
      masked session activity. Session replays are configured with{" "}
      <code>maskAllText: true</code> and <code>blockAllMedia: true</code>{" "}
      &mdash; all text and media visible on screen is masked or blocked before
      transmission to Sentry, so no readable content is captured in replay
      recordings. The legal basis for this processing is your consent (Art.
      6(1)(a) GDPR).
    </p>
    <p>
      Data is transferred to the United States under EU Standard Contractual
      Clauses (Art. 46(2)(c) GDPR) per our Data Processing Agreement with Sentry
      &mdash; see the International Transfers section. You may withdraw consent
      at any time via the <strong>Cookie preferences</strong> link in the site
      footer (Art. 7(3) GDPR). Withdrawal does not affect the lawfulness of
      processing before withdrawal.
    </p>

    <h3>11.3 Your consent choices</h3>
    <p>A consent banner is shown on your first visit. You may:</p>
    <ul>
      <li>
        <strong>Accept all</strong> &mdash; enable session analytics in addition
        to the always-on essential technologies and error monitoring described
        in &sect;11.2
      </li>
      <li>
        <strong>Decline non-essential</strong> &mdash; only essential
        technologies and the always-on error monitoring described in &sect;11.2
        will run; session analytics will not
      </li>
      <li>
        <strong>Customize</strong> &mdash; toggle session analytics on or off;
        essential technologies and error monitoring cannot be turned off
      </li>
    </ul>
    <p>
      You may withdraw or change your consent at any time via the{" "}
      <strong>Cookie preferences</strong> link in the site footer. Withdrawal
      does not affect the lawfulness of processing before withdrawal (Art. 7(3)
      GDPR).
    </p>
  </section>
);

/** Renders the children's privacy section of the privacy policy. */
const SectionChildrensPrivacy: React.FC = () => (
  <section>
    <h2>12. Children&apos;s Privacy</h2>
    <p>
      Our Service is intended for users aged 16 and over. When you register, you
      must affirm via our age-affirmation gate that you meet this requirement.
      We rely on this self-attestation as our age-verification mechanism. This
      processing is carried out for the performance of our contract with you
      under Art. 6(1)(b) GDPR.
    </p>
    <p>
      We do not knowingly collect personal data from individuals under the age
      of 16. If we discover or are notified that we hold personal data belonging
      to a user under 16, we will delete that account and all associated
      personal data immediately and without exception. No parental-consent
      alternative is available; the only outcome is prompt erasure.
    </p>
    <p>
      If you believe an under-16 individual has registered with our Service,
      please contact us at{" "}
      <a href="mailto:privacy@giveprotocol.io">privacy@giveprotocol.io</a> so we
      can take immediate action.
    </p>
  </section>
);

/** Renders the contact information section of the privacy policy. */
const SectionContactUs: React.FC = () => (
  <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
    <h2>13. Data Controller and Contact</h2>
    <p>
      The data controller responsible for the personal data described in this
      Privacy Policy is:
    </p>
    <p className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <strong>Give Protocol Foundation</strong>
      <br />
      1930 18th St NW, Suite B2 PMB2430
      <br />
      Washington, DC 20009
      <br />
      United States
      <br />
      <br />
      <strong>Privacy contact:</strong>{" "}
      <a href="mailto:privacy@giveprotocol.io">privacy@giveprotocol.io</a>
    </p>
    <p>
      Give Protocol Foundation is established in the United States. Where we
      process the personal data of individuals located in the European Union,
      the European Economic Area, or the United Kingdom in connection with
      offering our Service to them, that processing is subject to the EU General
      Data Protection Regulation and the UK GDPR under their extraterritorial
      scope (Art. 3(2) GDPR).
    </p>
  </section>
);

/** Privacy policy page displaying GiveProtocol's data handling practices. */
export const Privacy: React.FC = () => {
  usePageTitle("Privacy Policy");
  return (
    <StaticPageLayout
      title="GiveProtocol Privacy Policy"
      effectiveDate="Effective Date: June 13, 2026"
    >
      <SectionIntroduction />
      <SectionInformationWeCollect />
      <SectionHowWeUseInfo />
      <SectionLegalBasis />
      <SectionHowWeShare />
      <SectionDataSecurity />
      <SectionDataRetention />
      <SectionYourRights />
      <SectionInternationalTransfers />
      <SectionChanges />
      <SectionCookiePreferences />
      <SectionChildrensPrivacy />
      <SectionContactUs />
    </StaticPageLayout>
  );
};

export default Privacy;
