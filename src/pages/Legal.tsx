import React from "react";
import { StaticPageLayout } from "@/components/layout/StaticPageLayout";
import { ImportantNotice } from "@/components/ui/ImportantNotice";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Terms and conditions page for the Give Protocol platform. */
export const Legal: React.FC = () => {
  usePageTitle("Terms & Conditions");
  return (
    <StaticPageLayout title="GIVE PROTOCOL - TERMS AND CONDITIONS">
      <section>
        <h2>1. INTRODUCTION AND BINDING AGREEMENT</h2>

        <p>
          Welcome to the Give Protocol decentralized application
          (&quot;dApp&quot;). These Terms and Conditions (&quot;Terms&quot;)
          constitute a legally binding agreement between you (&quot;User,&quot;
          &quot;you,&quot; or &quot;your&quot;) and Give Protocol Foundation
          (&quot;Give Protocol,&quot; &quot;Company,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) governing your access to and use
          of the Give Protocol dApp, including all related services, features,
          content, and functionality (collectively, the &quot;Platform&quot; or
          &quot;Services&quot;).
        </p>

        <p>
          By accessing or using the Services in any way, you acknowledge that
          you have read, understood, and agree to be bound by all of these
          Terms. If you don&apos;t agree to these Terms, you must not access or
          use the Services. Your use of the Services in any way means that you
          agree to all of these Terms, and these Terms will remain in effect
          while you use the Services.
        </p>

        <ImportantNotice variant="warning">
          <p className="font-bold">
            PLEASE READ THESE TERMS CAREFULLY. They cover important information
            about Services provided to you and any charges we bill you. These
            Terms include information about future changes to these Terms,
            limitations of liability, a class action waiver, and resolution of
            disputes by arbitration instead of in court.
          </p>
        </ImportantNotice>

        <ImportantNotice variant="warning">
          <p className="font-bold">
            ARBITRATION NOTICE AND CLASS ACTION WAIVER: EXCEPT FOR CERTAIN TYPES
            OF DISPUTES DESCRIBED IN THE ARBITRATION SECTION BELOW, YOU AGREE
            THAT DISPUTES BETWEEN YOU AND US WILL BE RESOLVED BY BINDING,
            INDIVIDUAL ARBITRATION AND YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A
            CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
          </p>
        </ImportantNotice>
      </section>

      <section>
        <h2>2. CHANGES TO TERMS</h2>

        <p>
          We reserve the right to modify these Terms at any time by posting the
          revised Terms on the Platform. We will place a notice on our site,
          send you an email, and/or notify you by some other means when we make
          changes.
        </p>

        <p>
          If you don&apos;t agree with the new Terms, you are free to reject
          them; unfortunately, that means you will no longer be able to use the
          Services. If you use the Services in any way after a change to the
          Terms is effective, that means you agree to all of the changes. The
          changes will not be retroactive, and the most current version of the
          Terms will govern our relationship with you.
        </p>

        <p>
          Except for changes by us as described here, no other amendment or
          modification of these Terms will be effective unless in writing and
          signed by both you and us.
        </p>
      </section>

      <section>
        <h2>3. PLATFORM OVERVIEW</h2>

        <p>
          Give Protocol is a decentralized application built on blockchain
          technology that facilitates:
        </p>

        <ul>
          <li>Cryptocurrency donations to verified charitable organizations</li>
          <li>Connections between volunteers and charitable organizations</li>
          <li>
            Transparency in charitable giving through blockchain verification
          </li>
        </ul>

        <ImportantNotice variant="warning">
          <p className="font-bold">
            IMPORTANT NOTICE: Give Protocol Foundation is a not-for-profit
            charitable organization that has developed this platform to
            facilitate charitable giving, charitable equity, and volunteering.
            Give Protocol does not offer financial or other advice, and is not a
            bank or financial institution. We do not provide financial services
            or financial market infrastructure. We serve as a technological
            bridge connecting donors, volunteers, and charitable organizations.
          </p>
        </ImportantNotice>
      </section>

      <section>
        <h2>4. ELIGIBILITY AND ACCOUNT REQUIREMENTS</h2>

        <h3>4.1 Eligibility Requirements</h3>

        <p>To use the Services, you must:</p>

        <ul>
          <li>- Be at least 18 years of age</li>
          <li>- Have the capacity to form a legally binding contract</li>
          <li>
            - Not be prohibited from using the Services under applicable laws
          </li>
          <li>
            - Complete any required verification processes truthfully and
            accurately
          </li>
          <li>- Maintain the security of your wallet and private keys</li>
        </ul>

        <h3>4.2 Wallet Requirements</h3>

        <p>
          To use the Platform, you must connect a compatible cryptocurrency
          wallet. You are solely responsible for:
        </p>

        <ul>
          <li>- The security of your wallet and private keys</li>
          <li>- All activities occurring through your connected wallet</li>
          <li>
            - Ensuring your wallet complies with applicable laws and regulations
          </li>
        </ul>

        <h3>4.3 Account Information</h3>

        <p>
          You promise to provide us with accurate, complete, and updated
          information about yourself. You may not select as your User ID a name
          that you don&apos;t have the right to use, or another person&apos;s
          name with the intent to impersonate that person. You may not transfer
          your account to anyone else without our prior written permission.
        </p>

        <p>
          If you&apos;re agreeing to these Terms on behalf of an organization or
          entity, you represent and warrant that you are authorized to agree to
          these Terms on that organization&apos;s or entity&apos;s behalf and
          bind them to these Terms.
        </p>

        <h3>4.4 Children&apos;s Privacy</h3>

        <p>
          We do not knowingly collect or solicit personally identifiable
          information from children under 18 years of age. If you are a child
          under 18 years of age, please do not attempt to register for or
          otherwise use the Services or send us any personal information. If we
          learn we have collected personal information from a child under 18
          years of age, we will delete that information as quickly as possible.
          If you believe that a child under 18 years of age may have provided us
          personal information, please contact us at privacy@giveprotocol.io.
        </p>
      </section>

      <section>
        <h2>5. CRYPTOCURRENCY DONATIONS</h2>

        <h3>5.1 Transaction Execution</h3>

        <p>
          All cryptocurrency donations are executed through smart contracts
          deployed on blockchain networks. Once initiated, transactions cannot
          be reversed or refunded except as required by applicable law.
        </p>

        <h3>5.2 Role of Give Protocol</h3>

        <p>
          Give Protocol Foundation, as a not-for-profit charitable organization,
          connects charitable organizations with those looking to donate
          cryptocurrency and other assets. When we use the word &quot;you&quot;
          in these Terms, it refers to any user, regardless of whether you are a
          donor or using the Services on behalf of a charitable organization,
          while if we use one of those specific terms, it only applies to that
          category of user.
        </p>

        <p>
          Where applicable take steps to confirm each potential charitable
          organization is a registered nonprofit organization. However, each
          donor must make its own determinations that an organization available
          through our Service is suitable for such donor. Give Protocol is only
          responsible for connecting organizations and donors, and is not
          responsible for the use of any donations.
        </p>

        <h3>5.3 Transaction Fees</h3>

        <p>
          You are responsible for all transaction fees associated with
          donations, including:
        </p>

        <ul>
          <li>- Blockchain network fees (gas fees)</li>
          <li>
            - Any platform fees as disclosed prior to transaction execution
          </li>
          <li>- Any currency conversion fees</li>
        </ul>
      </section>

      {/* Continue with remaining sections... I'll add the rest in the next part to keep the file manageable */}

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <strong>Email:</strong> legal@giveprotocol.io
        </p>
        <p className="mt-8 text-gray-500 dark:text-gray-400 italic">Effective: March 15, 2025</p>
      </section>
    </StaticPageLayout>
  );
};

export default Legal;
