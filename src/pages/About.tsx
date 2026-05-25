import React from "react";
import type { LucideIcon } from "lucide-react";
import { Users, Target, Heart, Shield, Globe, TrendingUp } from "lucide-react";
import { StaticPageLayout } from "@/components/layout/StaticPageLayout";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Mission card with icon, heading, and description. */
const InfoCard: React.FC<{
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
    <Icon className="h-8 w-8 text-emerald-600 mb-3" />
    <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
    <p className="text-gray-600 leading-relaxed">{children}</p>
  </div>
);

/** Feature highlight card with icon, title, and description. */
const FeatureHighlight: React.FC<{
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="text-center">
    <Icon className="h-10 w-10 text-emerald-600 bg-emerald-100 rounded-full p-6 w-20 h-20 mx-auto mb-6" />
    <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
    <p className="text-gray-600">{children}</p>
  </div>
);

/** "How We Make a Difference" section with three feature highlights. */
const HowWeHelpSection: React.FC = () => (
  <ScrollReveal direction="up">
    <section>
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        How We Make a Difference
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        <FeatureHighlight icon={Heart} title="Direct & Simple Giving">
          We&apos;ve simplified the path between you and the causes that matter.
          Whether you&apos;re giving traditional currency or digital assets,
          your support goes directly to verified organizations.
        </FeatureHighlight>
        <FeatureHighlight icon={Users} title="Making Time Count">
          Volunteering is the heartbeat of change. We help people find
          meaningful opportunities and provide a reliable way to celebrate and
          verify the time they&apos;ve invested in their communities.
        </FeatureHighlight>
        <FeatureHighlight icon={TrendingUp} title="Collective Impact Funds">
          Why choose just one? Our curated funds allow you to support an entire
          sector — like clean water or education — spreading your impact across
          multiple high-performing organizations at once.
        </FeatureHighlight>
      </div>
    </section>
  </ScrollReveal>
);

/** "What We Stand For" section with four value descriptions. */
const ValuesSection: React.FC = () => (
  <ScrollReveal direction="up">
    <section className="bg-gray-50 rounded-lg p-8 grid md:grid-cols-2 gap-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center md:col-span-2">
        What We Stand For
      </h2>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-6 w-6 text-emerald-600 mr-3" />
          Accountability
        </h3>
        <p className="text-gray-600">
          You shouldn&apos;t have to wonder where your money went. We use modern
          tools to provide a clear, permanent record of every donation and
          volunteer hour. When we say your help made a difference, we have the
          receipts to prove it.
        </p>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-6 w-6 text-emerald-600 mr-3" />
          Lasting Change
        </h3>
        <p className="text-gray-600">
          We aren&apos;t interested in quick fixes. We partner with
          organizations focused on measurable outcomes, ensuring your generosity
          creates a ripple effect that lasts for years.
        </p>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-6 w-6 text-emerald-600 mr-3" />
          Community Power
        </h3>
        <p className="text-gray-600">
          We believe we are stronger together. Give Protocol is a gathering
          place for donors, volunteers, and non-profits to collaborate, share
          resources, and solve problems as one.
        </p>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-6 w-6 text-emerald-600 mr-3" />
          Smart Innovation
        </h3>
        <p className="text-gray-600">
          We use the best of today&apos;s technology to solve the oldest
          problems in charity. By cutting out the middleman and reducing
          overhead, we make sure more of your gift stays where it&apos;s needed
          most.
        </p>
      </div>
    </section>
  </ScrollReveal>
);

/** Mission and vision cards section. */
const MissionVisionSection: React.FC = () => (
  <section className="grid md:grid-cols-2 gap-8">
    <ScrollReveal direction="left">
      <InfoCard icon={Target} title="Our Mission">
        To enable sustainable giving for lasting global impact.
      </InfoCard>
    </ScrollReveal>
    <ScrollReveal direction="right" delay={100}>
      <InfoCard icon={Globe} title="Our Vision">
        A world where charitable giving is borderless, and resources are as
        agile and accountable as the modern world requires.
      </InfoCard>
    </ScrollReveal>
  </section>
);

/** Call-to-action section inviting visitors to join Give Protocol. */
const JoinUsSection: React.FC = () => (
  <ScrollReveal direction="scale">
    <section className="text-center bg-emerald-50 rounded-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Join the Future of Giving
      </h2>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Whether you&apos;re a donor looking to make an impact, a volunteer ready
        to contribute your time, or an organization seeking support, Give
        Protocol provides the tools you need to create meaningful change.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm hover:shadow-lg">
          Start Giving
        </button>
        <button className="border-2 border-emerald-500 text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
          Find Opportunities
        </button>
      </div>
    </section>
  </ScrollReveal>
);

/** About page describing the Give Protocol mission, values, and vision. */
export const About: React.FC = () => {
  usePageTitle("About");
  return (
    <StaticPageLayout
      title="About Give Protocol"
      subtitle="Removing barriers to sustainable charitable giving."
    >
      <div className="space-y-16">
        <MissionVisionSection />
        <HowWeHelpSection />
        <ValuesSection />
        <JoinUsSection />
      </div>
    </StaticPageLayout>
  );
};

export default About;
