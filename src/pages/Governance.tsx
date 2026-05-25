import React from "react";
import type { LucideIcon } from "lucide-react";
import { Shield, Users, Vote, Scale, Clock, AlertTriangle } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Bullet-point item with emerald dot indicator. */
const BulletItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "mb-2" }) => (
  <p className={`flex items-center ${className} text-gray-600`}>
    <span className="w-2 h-2 bg-emerald-600 rounded-full mr-2 flex-shrink-0" />{" "}
    {children}
  </p>
);

/** Card with icon header and bullet-point list for the governance overview grid. */
const GovernanceCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}> = ({ icon: Icon, title, description, items }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <Icon className="h-6 w-6 text-emerald-600 mr-2" />
      {title}
    </h3>
    <p className="text-gray-600 mb-4">{description}</p>
    {items.map((item, i) => (
      <BulletItem key={item} className={i < items.length - 1 ? "mb-2" : ""}>{item}</BulletItem>
    ))}
  </div>
);

/** Proposal process section with the four governance steps. */
const ProposalProcessSection: React.FC = () => (
  <div className="bg-white p-8 rounded-lg shadow-md">
    <h2 className="text-2xl font-semibold mb-6 flex items-center">
      <Scale className="h-8 w-8 text-emerald-600 mr-3" />
      Proposal Process
    </h2>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">1. Creation</h4>
        <p className="text-gray-600">
          Any account with minimum voting power can submit detailed
          proposals with implementation plans.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">2. Discussion</h4>
        <p className="text-gray-600">
          7-day minimum discussion period for community feedback and refinement.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">3. Voting</h4>
        <p className="text-gray-600">
          48-hour voting period with weighted voting based on participation metrics.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">4. Execution</h4>
        <p className="text-gray-600">
          Successful proposals are implemented after meeting all required thresholds.
        </p>
      </div>
    </div>
  </div>
);

/** Timeframes and delays section for standard and emergency governance actions. */
const TimeframesSection: React.FC = () => (
  <div className="bg-white p-8 rounded-lg shadow-md">
    <h2 className="text-2xl font-semibold mb-6 flex items-center">
      <Clock className="h-8 w-8 text-emerald-600 mr-3" />
      Timeframes & Delays
    </h2>
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Standard Changes</h4>
        <div className="text-gray-600 mb-2">• 7 days discussion period</div>
        <div className="text-gray-600 mb-2">• 48 hours voting period</div>
        <div className="text-gray-600">• 24 hours timelock before execution</div>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Emergency Actions</h4>
        <div className="text-gray-600 mb-2">• No discussion period required</div>
        <div className="text-gray-600 mb-2">• 4/7 council signatures needed</div>
        <div className="text-gray-600">• 24 hours maximum timelock</div>
      </div>
    </div>
  </div>
);

/** Important notice banner for governance participants. */
const GovernanceNotice: React.FC = () => (
  <div className="bg-emerald-50 p-8 rounded-lg flex items-start">
    <AlertTriangle className="h-6 w-6 text-emerald-600 mt-1 mr-3 flex-shrink-0" />
    <div>
      <h3 className="text-lg font-semibold text-emerald-900 mb-2">
        Important Notice
      </h3>
      <p className="text-emerald-700">
        All governance participants are required to review and understand
        the complete governance documentation before participating in
        proposals or voting. This ensures informed decision-making and
        maintains the integrity of our governance process.
      </p>
    </div>
  </div>
);

/** Governance overview page describing the Give Protocol DAO structure and voting mechanics. */
export const Governance: React.FC = () => {
  usePageTitle("Governance");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center animate-fade-in-up">
        Protocol Governance
      </h1>
      <p className="text-xl text-gray-600 text-center mb-12 animate-fade-in-up">
        Empowering our community through transparent and decentralized
        decision-making
      </p>

      <ScrollReveal direction="up" delay={100}>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
        <GovernanceCard
          icon={Vote}
          title="Voting Power"
          description="Voting power is earned through active participation:"
          items={[
            "Donations contribute to base voting power",
            "Volunteer hours add additional weight",
            "Verified organizations receive multipliers",
          ]}
        />
        <GovernanceCard
          icon={Shield}
          title="Proposal Thresholds"
          description="Core protocol changes require:"
          items={[
            "66% supermajority approval",
            "50% minimum participation",
            "48-hour voting period",
          ]}
        />
        <GovernanceCard
          icon={Users}
          title="Council Oversight"
          description="A multi-signature council provides:"
          items={[
            "Emergency response capabilities",
            "4/7 signatures for critical actions",
            "24-hour maximum timelock",
          ]}
        />
      </div>
      </ScrollReveal>

      <div className="space-y-8">
        <ScrollReveal direction="up" delay={200}>
        <ProposalProcessSection />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={300}>
        <TimeframesSection />
        </ScrollReveal>

        <ScrollReveal direction="scale" delay={400}>
        <GovernanceNotice />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Governance;
