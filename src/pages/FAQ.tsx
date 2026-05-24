import React, { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { StaticPageLayout } from "@/components/layout/StaticPageLayout";

interface FAQEntry {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FAQSectionData {
  title: string;
  items: FAQEntry[];
}

const FAQ_SECTIONS: FAQSectionData[] = [
  {
    title: "About Give Protocol",
    items: [
      {
        id: "what-is-give-protocol",
        question: "What is Give Protocol?",
        answer: (
          <p>
            Give Protocol is a transparent, blockchain-powered platform for
            charitable giving and volunteering. It connects donors, non-profit
            organizations, and volunteers in one place, enabling contributions
            in both traditional currency (USD) and digital assets
            (cryptocurrency). Every donation and volunteer hour is recorded
            on-chain — creating an immutable, publicly verifiable record of
            impact.
          </p>
        ),
      },
      {
        id: "how-is-it-different",
        question:
          "How is Give Protocol different from other donation platforms?",
        answer: (
          <>
            <p>
              Most donation platforms act as financial intermediaries — you
              trust them to forward your money. Give Protocol uses blockchain
              technology to record every transaction permanently and publicly.
              Key differences:
            </p>
            <ul>
              <li>
                <strong>On-chain transparency:</strong> Every donation is
                traceable from sender to recipient, visible to anyone.
              </li>
              <li>
                <strong>Multi-mode giving:</strong> Donate in USD or
                cryptocurrency — your choice.
              </li>
              <li>
                <strong>Verified organizations:</strong> Charities that opt in
                go through a vetting process and earn an on-chain verification
                badge.
              </li>
              <li>
                <strong>Volunteer credentials:</strong> Volunteer hours and
                skills are recorded as Soul-Bound Tokens — a portable, permanent
                record that belongs to you.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "is-it-free",
        question: "Is Give Protocol free to use?",
        answer: (
          <p>
            Creating an account and browsing charities is free. When making
            donations, standard network transaction fees (gas fees) may apply
            for on-chain transactions — these go to the blockchain network, not
            to Give Protocol. We are committed to minimizing overhead so the
            maximum share of your donation reaches the cause.
          </p>
        ),
      },
    ],
  },
  {
    title: "Crypto & Donations",
    items: [
      {
        id: "how-crypto-donations-work",
        question: "How do crypto donations work?",
        answer: (
          <>
            <p>
              When you donate cryptocurrency through Give Protocol, your funds
              are transferred directly from your wallet to the receiving
              organization&apos;s wallet via a smart contract. Here is the
              process:
            </p>
            <ol>
              <li>
                Connect your crypto wallet (MetaMask, Coinbase Wallet, Phantom,
                etc.).
              </li>
              <li>
                Select a charity or cause and enter the amount you want to give.
              </li>
              <li>
                Approve the transaction in your wallet — this sends funds
                directly on-chain.
              </li>
              <li>
                The smart contract records the donation permanently; you receive
                an on-chain receipt linked to your wallet address.
              </li>
            </ol>
            <p>
              No intermediary holds your funds. The transaction is settled on
              the blockchain, usually within seconds to minutes depending on the
              network.
            </p>
          </>
        ),
      },
      {
        id: "what-crypto-accepted",
        question: "What cryptocurrencies does Give Protocol accept?",
        answer: (
          <p>
            Give Protocol is multichain by design. Currently supported networks
            include Moonbeam, Base, Optimism, Polkadot, Kusama, and Solana. The
            specific tokens accepted depend on the network and the receiving
            organization&apos;s wallet configuration. Check the charity&apos;s
            profile page for their supported assets.
          </p>
        ),
      },
      {
        id: "need-wallet",
        question: "Do I need a crypto wallet to donate?",
        answer: (
          <p>
            No. You can donate in traditional currency (USD) without a crypto
            wallet. A wallet is required only for cryptocurrency donations. If
            you want to explore crypto giving, we recommend starting with a
            free, beginner-friendly wallet like MetaMask or Coinbase Wallet —
            both have guided setup flows and browser extensions.
          </p>
        ),
      },
      {
        id: "fiat-donations",
        question: "Can I donate with regular money (USD)?",
        answer: (
          <p>
            Yes. Give Protocol supports both USD (fiat) and cryptocurrency
            donations. You can give with a credit or debit card without ever
            touching a crypto wallet. We built the platform to be accessible to
            everyone, regardless of familiarity with blockchain technology.
          </p>
        ),
      },
    ],
  },
  {
    title: "Trust & Safety",
    items: [
      {
        id: "money-to-charity",
        question: "How do I know my money goes to the charity?",
        answer: (
          <>
            <p>
              Transparency is the core promise of Give Protocol. Here is how we
              back it up:
            </p>
            <ul>
              <li>
                <strong>On-chain records:</strong> Every donation is written to
                the blockchain as an immutable transaction. You can look up the
                transaction hash at any time using a public blockchain explorer.
              </li>
              <li>
                <strong>Direct transfers:</strong> Funds are sent directly to
                the organization&apos;s registered wallet via smart contract —
                no pooled accounts, no delays.
              </li>
              <li>
                <strong>Donation receipts:</strong> After each donation, you
                receive an on-chain receipt linked to your account, recording
                the amount, date, organization, and transaction ID.
              </li>
              <li>
                <strong>Public ledger:</strong> All verified charity wallet
                addresses are publicly listed so anyone can audit inbound
                donations.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "how-charities-verified",
        question: "How are charities verified?",
        answer: (
          <>
            <p>
              Any registered non-profit can create a profile on Give Protocol.
              Organizations that want to earn the <strong>Verified</strong>{" "}
              badge voluntarily go through our vetting process:
            </p>
            <ul>
              <li>Submission of official non-profit registration documents.</li>
              <li>Review by the Give Protocol moderation team.</li>
              <li>
                On-chain issuance of a verification credential tied to their
                wallet.
              </li>
            </ul>
            <p>
              Unverified organizations are clearly labeled. We encourage donors
              to prioritize verified charities, but ultimately the choice — and
              the on-chain record — is yours.
            </p>
          </>
        ),
      },
      {
        id: "fraudulent-charity",
        question: "What happens if a charity is found to be fraudulent?",
        answer: (
          <p>
            If we confirm that an organization has misrepresented itself, its
            verified status is revoked and its profile is flagged. Because
            blockchain transactions are immutable, past donations cannot be
            erased — but the public record ensures the history is visible. We
            encourage users to report concerns via our contact channels and we
            work with authorities where relevant. We take platform integrity
            seriously.
          </p>
        ),
      },
      {
        id: "data-privacy",
        question: "Is my personal data safe?",
        answer: (
          <p>
            Yes. Give Protocol collects only the data necessary to operate the
            platform and complies with applicable privacy regulations. On-chain
            transactions are pseudonymous — they are tied to your wallet
            address, not your name. You control what personal information you
            share in your profile. See our{" "}
            <a
              href="/privacy"
              className="text-emerald-600 underline hover:text-emerald-700"
            >
              Privacy Policy
            </a>{" "}
            for full details.
          </p>
        ),
      },
    ],
  },
  {
    title: "Volunteering",
    items: [
      {
        id: "volunteer-verification",
        question: "How does volunteer hour verification work?",
        answer: (
          <>
            <p>
              When you volunteer through Give Protocol, your hours go through a
              simple verification flow:
            </p>
            <ol>
              <li>
                Log your volunteer hours via your dashboard after completing an
                opportunity.
              </li>
              <li>
                The host organization reviews and approves the submission.
              </li>
              <li>
                Approved hours are recorded on-chain and credited to your
                volunteer profile.
              </li>
            </ol>
            <p>
              Only validated hours count toward public leaderboards and
              credential issuance — this ensures the records are trustworthy for
              organizations reviewing your history.
            </p>
          </>
        ),
      },
      {
        id: "what-are-sbts",
        question: "What are Soul-Bound Tokens (SBTs)?",
        answer: (
          <p>
            Soul-Bound Tokens are a type of blockchain credential that is
            permanently tied to your wallet — they cannot be sold or
            transferred. Give Protocol issues SBTs to recognize verified
            volunteer contributions: skills demonstrated, hours logged, and
            milestones reached. Think of them as a permanent, portable digital
            resume entry that any organization can independently verify, without
            contacting us.
          </p>
        ),
      },
      {
        id: "find-opportunities",
        question: "How do I find volunteer opportunities?",
        answer: (
          <p>
            Browse available opportunities at{" "}
            <a
              href="/opportunities"
              className="text-emerald-600 underline hover:text-emerald-700"
            >
              Give Protocol Opportunities
            </a>
            {". "}
            You can filter by cause, location, required skills, and time
            commitment. Registered organizations can also post new opportunities
            directly from their charity portal.
          </p>
        ),
      },
    ],
  },
  {
    title: "For Organizations",
    items: [
      {
        id: "how-to-join",
        question: "How can my organization join Give Protocol?",
        answer: (
          <p>
            Organizations can register at{" "}
            <a
              href="/auth/signup?type=charity"
              className="text-emerald-600 underline hover:text-emerald-700"
            >
              the charity registration page
            </a>
            {". "}
            You will need to provide basic organizational details and a wallet
            address for receiving donations. After registration, you can apply
            for Verified status by submitting your official non-profit
            credentials.
          </p>
        ),
      },
      {
        id: "what-does-org-get",
        question: "What does an organization get from Give Protocol?",
        answer: (
          <ul>
            <li>
              A public charity profile page with your mission, causes, and
              volunteer opportunities.
            </li>
            <li>
              Access to a new donor demographic comfortable with digital assets.
            </li>
            <li>Transparent donation tracking and on-chain receipts.</li>
            <li>Tools to post and manage volunteer opportunities.</li>
            <li>
              Enhanced credibility through our optional verification process.
            </li>
          </ul>
        ),
      },
    ],
  },
];

interface FAQItemProps {
  entry: FAQEntry;
  isOpen: boolean;
  onToggle: (_id: string) => void;
}

/** Single accordion FAQ item with question and expandable answer. */
const FAQItem: React.FC<FAQItemProps> = ({ entry, isOpen, onToggle }) => {
  const handleClick = useCallback(() => {
    onToggle(entry.id);
  }, [onToggle, entry.id]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${entry.id}`}
        className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">
          {entry.question}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 text-emerald-600 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          id={`faq-answer-${entry.id}`}
          className="px-5 pb-5 pt-2 bg-white text-gray-700 leading-relaxed prose prose-sm max-w-none prose-a:text-emerald-600 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-1"
        >
          {entry.answer}
        </div>
      )}
    </div>
  );
};

interface FAQSectionProps {
  section: FAQSectionData;
  openIds: Set<string>;
  onToggle: (_id: string) => void;
}

/** Category section grouping related FAQ items. */
const FAQSection: React.FC<FAQSectionProps> = ({
  section,
  openIds,
  onToggle,
}) => (
  <section>
    <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
      {section.title}
    </h2>
    <div className="space-y-3">
      {section.items.map((entry) => (
        <FAQItem
          key={entry.id}
          entry={entry}
          isOpen={openIds.has(entry.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  </section>
);

/** Frequently Asked Questions page covering Give Protocol basics, crypto donations, and trust. */
const FAQ: React.FC = () => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <StaticPageLayout
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about giving, volunteering, and blockchain transparency."
    >
      <div className="space-y-12">
        {FAQ_SECTIONS.map((section) => (
          <FAQSection
            key={section.title}
            section={section}
            openIds={openIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </StaticPageLayout>
  );
};

export default FAQ;
