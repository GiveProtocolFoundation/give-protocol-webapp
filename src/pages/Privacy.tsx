import React from "react";
import { StaticPageLayout } from "@/components/layout/StaticPageLayout";
import { ImportantNotice } from "@/components/ui/ImportantNotice";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Privacy policy page displaying GiveProtocol's data handling practices. */
export const Privacy: React.FC = () => {
  usePageTitle("Privacy Policy");
  return (
    <StaticPageLayout
      title="GiveProtocol Privacy Policy"
      effectiveDate="Effective Date: March 11, 2025"
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          GiveProtocol (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
          committed to protecting your privacy. This Privacy Policy explains how
          we collect, use, disclose, and safeguard your information when you use
          our blockchain-based philanthropic platform and related services
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
            IF YOU DO NOT AGREE WITH ANY PART OF THIS PRIVACY POLICY OR OUR
            TERMS OF USE, THEN PLEASE DO NOT USE ANY OF THE SERVICES.
          </p>
        </ImportantNotice>

        <p>
          If you provide personal data to us, you consent to the collection,
          use, and disclosure of such personal data in accordance with this
          Privacy Policy. If you provide the personal data of another individual
          (such as organization representatives or volunteer references), it
          means that you have informed them of the purposes for which we require
          their personal data and they have consented to the collection, use,
          and disclosure of their personal data in accordance with this Privacy
          Policy.
        </p>
      </section>

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
          <li>Identification documents for KYC/AML compliance</li>
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
          However, this blockchain data is not directly linked to personal
          identifiers unless you choose to make such connections publicly known.
        </p>

        <h3>2.4 Information We Will Never Collect</h3>
        <ImportantNotice variant="warning">
          <p className="font-bold">
            We will never ask you to share your private keys or wallet seed.
            Never trust anyone or any site that asks you to enter your private
            keys or wallet seed.
          </p>
        </ImportantNotice>
        <p>
          We do not collect any special categories of personal data about you
          (this includes details about your race or ethnicity, religious or
          philosophical beliefs, sex life, sexual orientation, political
          opinions, trade union membership, information about your health and
          genetic and biometric data). Nor do we collect any information about
          criminal convictions and offenses, except where required for
          charitable organization verification purposes and permitted by law.
        </p>

        <h3>2.5 Aggregated and Anonymized Data</h3>
        <p>
          We may create aggregated and anonymized data (such as statistical or
          demographic data) which will not directly or indirectly reveal your
          identity. For example, we may aggregate donation data to calculate the
          percentage of users supporting specific causes. If we combine
          aggregated data with your personal data so that it can identify you,
          we treat the combined data as personal data subject to this Privacy
          Policy.
        </p>

        <h3>2.6 Consequences if We Cannot Collect Your Personal Data</h3>
        <p>
          Where we need to collect personal data by law, or under the terms of a
          contract we have with you, and you fail to provide that data when
          requested, we may not be able to perform the contract we have or are
          trying to enter into with you (for example, to provide you with
          Services). In this case, we may have to cancel a service you have with
          us, but we will notify you if this is the case at the time.
        </p>
      </section>

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

      <section>
        <h2>4. Legal Basis for Processing</h2>
        <p>We process your personal data based on:</p>
        <ul>
          <li>
            Performance of a contract when we provide you with our Service
          </li>
          <li>Legitimate interests in operating and improving our Service</li>
          <li>Compliance with our legal obligations</li>
          <li>Your consent, where applicable</li>
        </ul>
        <p>
          You have the right to lodge a complaint with a supervisory authority
          if you believe our processing of your personal data violates
          applicable law.
        </p>
      </section>

      <section>
        <h2>5. How We Share Your Information</h2>
        <p>We may share your information in the following circumstances:</p>

        <h3>5.1 With Charitable Organizations</h3>
        <p>
          When you make a donation or volunteer for an organization, we share
          relevant information to facilitate the transaction or volunteer
          opportunity.
        </p>

        <h3>5.2 With Service Providers</h3>
        <p>
          We may share information with third-party service providers who help
          us operate our platform, subject to confidentiality agreements.
        </p>

        <h3>5.3 For Legal Compliance</h3>
        <p>
          We may disclose information when required by law or to protect our
          rights and safety.
        </p>

        <h3>5.4 Blockchain Transparency</h3>
        <p>
          Transaction data is publicly visible on the blockchain as part of its
          transparent nature.
        </p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal data against unauthorized access, alteration,
          disclosure, or destruction. However, no method of transmission over
          the internet or electronic storage is 100% secure.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>
          We retain personal data only for as long as necessary to fulfill the
          purposes outlined in this Privacy Policy, unless a longer retention
          period is required or permitted by law. Specific retention periods per
          data category are set out below.
        </p>

        <h3>7.1 Retention Periods by Data Category</h3>
        <ul>
          <li>
            <strong>Donation and transaction records</strong> (donation amounts,
            charity recipient, transaction timestamps, tax-relevant
            attribution): retained for <strong>seven (7) years</strong> after
            the donation, to satisfy charitable tax-reporting and audit
            obligations under US and EU member-state law. After this period,
            records are aggregated and the personal identifiers are removed.
          </li>
          <li>
            <strong>Identity verification documents</strong> (KYC/AML documents,
            charity registration documents): retained for the duration of the
            verified relationship plus <strong>five (5) years</strong>, to
            satisfy anti-money-laundering record-keeping requirements. Where a
            verification is rejected, documents are deleted within{" "}
            <strong>thirty (30) days</strong> of the final decision unless
            retention is required for a regulatory or legal dispute.
          </li>
          <li>
            <strong>Account profile data</strong> (name, email, contact details,
            profile preferences, volunteer skills): retained for as long as the
            account is active. On account deletion, profile data is anonymized
            or deleted within <strong>thirty (30) days</strong> of the deletion
            request being processed.
          </li>
          <li>
            <strong>Volunteer activity records</strong> (volunteer hours,
            charity affiliations, references): retained for the duration of the
            account plus <strong>three (3) years</strong> to allow verification
            of past volunteer history by current and prospective charities, and
            to defend against disputes. After this period, records are
            anonymized.
          </li>
          <li>
            <strong>Authentication and security logs</strong> (login events,
            session metadata, IP addresses, security audit trails): retained for
            up to <strong>twelve (12) months</strong> for security monitoring,
            fraud detection, and incident investigation. Logs relating to an
            active or recent security incident may be retained longer until the
            incident is closed.
          </li>
          <li>
            <strong>Communications and correspondence</strong> (support tickets,
            emails, in-app messages): retained for up to{" "}
            <strong>three (3) years</strong> from the last interaction, for
            quality assurance and dispute resolution.
          </li>
          <li>
            <strong>Cookie and analytics data</strong>: retained per the cookie
            lifetime declared in our Cookies notice; aggregated analytics are
            retained indefinitely in non-personal form.
          </li>
          <li>
            <strong>Blockchain transaction data</strong>: by the immutable
            nature of public blockchains, on-chain transactions cannot be
            deleted. Where on-chain data is linked to a Give Protocol account,
            we can sever the link in our off-chain records but cannot remove the
            underlying on-chain record.
          </li>
        </ul>

        <h3>7.2 Backup Retention and the Right to Erasure</h3>
        <p>
          When you exercise the right to erasure (Article 17 GDPR), we delete
          your personal data from our live production systems promptly. Because
          we operate encrypted database backups for disaster-recovery purposes,
          residual copies of your data may persist in those backups for up to{" "}
          <strong>seven (7) days</strong> after your erasure request is
          processed in production. We do not access, sell, share, or otherwise
          use backup data for any purpose other than restoring service in the
          event of a disaster. Backup data is encrypted at rest and is rotated
          out automatically as the backup retention window passes.
        </p>
        <p>
          If a disaster-recovery restore takes place during the backup retention
          window, any restored copies of previously-erased data are re-deleted
          within twenty-four (24) hours of the restore completing, and a record
          of the re-deletion is logged.
        </p>

        <h3>7.3 Legal and Regulatory Retention</h3>
        <p>
          We may retain specific records beyond the periods stated above where
          required by law (for example, where a tax authority, supervisory
          authority, or court order requires longer retention), or where the
          records are necessary for the establishment, exercise, or defense of
          legal claims. In those cases, retention is limited to what is strictly
          necessary for the legal purpose and the data is segregated from active
          processing.
        </p>

        <h3>7.4 Personal Data Breach Notification</h3>
        <p>
          If we determine that a personal data breach has occurred that is
          likely to result in a risk to your rights and freedoms, we will notify
          the competent supervisory authority within seventy-two (72) hours of
          becoming aware of the breach, in line with Article 33 GDPR. If the
          breach is likely to result in a high risk to your rights and freedoms,
          we will also notify you directly without undue delay, in line with
          Article 34 GDPR. We maintain an internal register of all personal data
          breaches as required by Article 33(5) GDPR.
        </p>
      </section>

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
          To exercise these rights, please contact us at
          privacy@giveprotocol.io.
        </p>
      </section>

      <section>
        <h2>9. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries
          other than your own. We ensure appropriate safeguards are in place for
          such transfers.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of any material changes by posting the new Privacy Policy on this
          page and updating the effective date.
        </p>
      </section>

      <section>
        <h2>11. Legal Basis for Processing</h2>
        <p>We process your personal data based on:</p>
        <ul>
          <li>
            Performance of a contract when we provide you with our Service
          </li>
          <li>Legitimate interests in operating and improving our Service</li>
          <li>Compliance with our legal obligations</li>
          <li>Your consent, where applicable</li>
        </ul>
        <p>
          You have the right to lodge a complaint with a supervisory authority
          if you believe our processing of your personal data violates
          applicable law.
        </p>
      </section>

      <section>
        <h2>12. Children&apos;s Privacy</h2>
        <p>
          Our Service is not directed to children under the age of 18, and we do
          not knowingly collect personal information from children. If we learn
          we have collected personal information from a child under 18, we will
          delete that information as quickly as possible. If you believe a child
          has provided us with personal information, please contact us.
        </p>
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2>13. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at:
        </p>
        <p className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <strong>Email:</strong> privacy@giveprotocol.io
        </p>
      </section>
    </StaticPageLayout>
  );
};

export default Privacy;
