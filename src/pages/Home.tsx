import React, { useState, useEffect } from "react";
import {
  Heart,
  TrendingUp,
  Users,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTranslation } from "@/hooks/useTranslation";

interface FooterLink {
  label: string;
  href?: string;
  isExternal?: boolean;
  isDisabled?: boolean;
}

const features = [
  {
    icon: <Heart className="w-10 h-10" />,
    titleKey: "home.features.highEfficiency.title",
    descriptionKey: "home.features.highEfficiency.description",
    color: "from-emerald-500 to-teal-500",
    badge: false,
  },
  {
    icon: <TrendingUp className="w-10 h-10" />,
    titleKey: "home.features.equityFunds.title",
    descriptionKey: "home.features.equityFunds.description",
    color: "from-teal-500 to-cyan-500",
    badge: true,
  },
  {
    icon: <Users className="w-10 h-10" />,
    titleKey: "home.features.impactFunds.title",
    descriptionKey: "home.features.impactFunds.description",
    color: "from-cyan-500 to-sky-500",
    badge: false,
  },
  {
    icon: <Shield className="w-10 h-10" />,
    titleKey: "home.features.verifiedOrgs.title",
    descriptionKey: "home.features.verifiedOrgs.description",
    color: "from-green-500 to-emerald-500",
    badge: false,
  },
  {
    icon: <Zap className="w-10 h-10" />,
    titleKey: "home.features.blockchainVerified.title",
    descriptionKey: "home.features.blockchainVerified.description",
    color: "from-lime-500 to-green-500",
    badge: false,
  },
  {
    icon: <Globe className="w-10 h-10" />,
    titleKey: "home.features.bridgingModes.title",
    descriptionKey: "home.features.bridgingModes.description",
    color: "from-teal-500 to-emerald-500",
    badge: true,
  },
];

/** Hero section with animated title, vision statement, and CTA buttons. */
function HeroSection({
  mousePosition,
}: {
  mousePosition: { x: number; y: number };
}) {
  const { t } = useTranslation();
  return (
    <section className="relative z-10 container mx-auto px-6 py-20 text-center">
      <div
        className="transform transition-transform duration-300"
        style={{
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
        }}
      >
        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
          {t("home.hero.title")}
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            {t("home.hero.titleAccent")}
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          {t("home.hero.description")}
        </p>
      </div>

      {/* Vision Statement */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {t("home.hero.visionTitle")}
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed">
          {t("home.hero.visionText")}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          disabled
          className="bg-gradient-to-r from-emerald-500/50 to-teal-500/50 px-8 py-4 rounded-full font-semibold text-lg cursor-not-allowed opacity-60 flex items-center space-x-2"
        >
          <span>{t("home.comingSoon")}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <a
          href="https://docs.giveprotocol.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all"
        >
          {t("home.readDocs")}
        </a>
      </div>
    </section>
  );
}

/** Individual feature card with icon, title, description, and optional badge. */
function FeatureCard({
  feature,
}: {
  feature: {
    icon: React.ReactNode;
    titleKey: string;
    descriptionKey: string;
    color: string;
    badge: boolean;
  };
}) {
  const { t } = useTranslation();
  return (
    <div className="group bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-emerald-500/30 transition-all hover:scale-105 cursor-pointer relative">
      {feature.badge && (
        <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500/50 px-3 py-1 rounded-full text-xs text-emerald-300">
          {t("home.comingSoon")}
        </div>
      )}
      <div
        className={`inline-block p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4`}
      >
        {feature.icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{t(feature.titleKey)}</h3>
      <p className="text-gray-400">{t(feature.descriptionKey)}</p>
    </div>
  );
}

/** Column listing benefits for a specific user role. */
function UserRoleColumn({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: { label: string; comingSoon?: boolean }[];
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className={`${color} font-semibold mb-3`}>{title}</div>
      <ul className="space-y-2 text-gray-300">
        {items.map((item) => (
          <li key={item.label} className="flex items-start">
            <Check className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              {item.label}
              {item.comingSoon && (
                <span className="ml-2 text-xs text-emerald-300 bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 rounded-full">
                  {t("home.comingSoon")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Section showcasing benefits for donors, organizations, and volunteers. */
function UserRoleSection({
  mousePosition,
}: {
  mousePosition: { x: number; y: number };
}) {
  const { t } = useTranslation();
  return (
    <div
      className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 backdrop-blur-lg border border-white/10 rounded-3xl p-12"
      style={{
        transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
      }}
    >
      <h2 className="text-4xl font-bold text-center mb-12">
        {t("home.roles.title")}
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        <UserRoleColumn
          title={t("home.roles.donors.title")}
          color="text-emerald-400"
          items={[
            { label: t("home.roles.donors.item1") },
            { label: t("home.roles.donors.item2"), comingSoon: true },
            { label: t("home.roles.donors.item3") },
          ]}
        />
        <UserRoleColumn
          title={t("home.roles.nonprofits.title")}
          color="text-teal-400"
          items={[
            { label: t("home.roles.nonprofits.item1") },
            { label: t("home.roles.nonprofits.item2"), comingSoon: true },
            { label: t("home.roles.nonprofits.item3") },
          ]}
        />
        <UserRoleColumn
          title={t("home.roles.volunteers.title")}
          color="text-cyan-400"
          items={[
            { label: t("home.roles.volunteers.item1") },
            { label: t("home.roles.volunteers.item2") },
            { label: t("home.roles.volunteers.item3") },
          ]}
        />
      </div>
    </div>
  );
}

/** Footer brand section with logo and tagline. */
function HomeFooterBrand() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <img
          src="/give_logo_gradient.svg"
          alt="Give Protocol"
          className="w-8 h-8"
        />
        <span className="text-xl font-bold">{t("app.name")}</span>
      </div>
      <p className="text-gray-400 text-sm">{t("home.footer.brand.tagline")}</p>
    </div>
  );
}

/** Renders a single footer link based on its type. */
function HomeFooterLink({ link }: { link: FooterLink }) {
  if (link.isDisabled) {
    return <span className="opacity-60">{link.label}</span>;
  }
  if (link.isExternal) {
    return (
      <a
        href={link.href}
        className="hover:text-emerald-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }
  return (
    <a href={link.href} className="hover:text-emerald-400">
      {link.label}
    </a>
  );
}

/** Footer column with title and list of links. */
function HomeFooterLinks({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h4 className="font-semibold mb-4">{title}</h4>
      <ul className="space-y-2 text-gray-400 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <HomeFooterLink link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Card showcasing an individual planned impact fund. */
function ImpactFundCard({
  icon,
  gradient,
  hoverBorder,
  title,
  description,
}: {
  icon: React.ReactNode;
  gradient: string;
  hoverBorder: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden ${hoverBorder} transition-all`}
    >
      <div className={`h-48 ${gradient} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
      </div>
    </div>
  );
}

/** Call-to-action section inviting users to join the platform. */
function CTASection() {
  const { t } = useTranslation();
  return (
    <section className="relative z-10 container mx-auto px-6 py-20">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-12 text-center">
        <h2 className="text-5xl font-bold mb-6">{t("home.cta.title")}</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          {t("home.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            disabled
            className="bg-white/50 text-emerald-600/70 px-8 py-4 rounded-full font-semibold text-lg cursor-not-allowed opacity-60"
          >
            {t("home.comingSoon")}
          </button>
          <a
            href="https://docs.giveprotocol.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/20 backdrop-blur-sm border border-white/30 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/30 transition-all"
          >
            {t("home.readDocs")}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Home page footer with links and copyright. */
function HomeFooter() {
  const { t } = useTranslation();
  const productLinks: FooterLink[] = [
    { label: t("home.nav.features"), href: "#features" },
    { label: t("home.footer.product.impactFunds"), href: "#impact" },
    { label: t("home.footer.product.charities"), href: "#charities" },
    { label: t("home.footer.product.volunteers"), href: "#volunteer" },
  ];
  const resourceLinks: FooterLink[] = [
    { label: t("nav.docs"), href: "/documentation" },
    { label: t("home.footer.resources.whitepaper"), isDisabled: true },
    { label: t("home.footer.resources.blog"), isDisabled: true },
    { label: t("home.footer.resources.community"), isDisabled: true },
  ];
  const connectLinks: FooterLink[] = [
    {
      label: "Bluesky",
      href: "https://giveprotocol.bsky.social",
      isExternal: true,
    },
    {
      label: "Discord",
      href: "https://discord.gg/giveprotocol",
      isExternal: true,
    },
    {
      label: "GitHub",
      href: "https://github.com/giveprotocol",
      isExternal: true,
    },
    { label: t("home.footer.connect.contact"), isDisabled: true },
  ];

  return (
    <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/10">
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <HomeFooterBrand />
        <HomeFooterLinks
          title={t("home.footer.product.title")}
          links={productLinks}
        />
        <HomeFooterLinks
          title={t("home.footer.resources.title")}
          links={resourceLinks}
        />
        <HomeFooterLinks
          title={t("home.footer.connect.title")}
          links={connectLinks}
        />
      </div>
      <div className="pt-8 border-t border-white/10 text-center text-gray-400 text-sm">
        <p>
          © {new Date().getFullYear()} {t("home.footer.copyright")}
        </p>
      </div>
    </footer>
  );
}

/** Landing page showcasing Give Protocol features, impact funds, and multichain strategy. */
const Home: React.FC = () => {
  const { t } = useTranslation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    /** Calculates mouse position offset for parallax animation effects. */
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-gray-100 overflow-hidden">
      {/* Animated Background Elements - Emerald/Teal Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          }}
        />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{
            transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
          }}
        />
      </div>

      {/* Skip-to-content link for keyboard users (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-emerald-700 focus:ring-2 focus:ring-emerald-500"
      >
        {t("common.skipToMainContent", "Skip to main content")}
      </a>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        {/* Existing Logo with Emerald Theme Colors */}
        <div className="flex items-center space-x-2">
          <Logo className="w-8 h-8 text-emerald-400" />
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Give Protocol
          </span>
        </div>

        <div className="hidden md:flex space-x-8">
          <a
            href="#features"
            className="hover:text-emerald-400 transition-colors"
          >
            {t("home.nav.features")}
          </a>
          <a
            href="#impact"
            className="hover:text-emerald-400 transition-colors"
          >
            {t("home.nav.impact")}
          </a>
          <a
            href="#charities"
            className="hover:text-emerald-400 transition-colors"
          >
            {t("home.nav.charities")}
          </a>
          <a
            href="#volunteer"
            className="hover:text-emerald-400 transition-colors"
          >
            {t("home.nav.volunteer")}
          </a>
        </div>
        <button
          disabled
          className="bg-gradient-to-r from-emerald-500/50 to-teal-500/50 px-6 py-2 rounded-full font-semibold cursor-not-allowed opacity-60"
        >
          {t("home.comingSoon")}
        </button>
      </nav>

      {/* Anchor target for skip-to-main-content link */}
      <span id="main-content" tabIndex={-1} className="sr-only" />

      <HeroSection mousePosition={mousePosition} />

      {/* Features Grid */}
      <section
        id="features"
        className="relative z-10 container mx-auto px-6 py-20"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            {t("home.features.sectionTitle")}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t("home.features.sectionSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      {/* For Different Users Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <UserRoleSection mousePosition={mousePosition} />
      </section>

      {/* Impact Showcase */}
      <section
        id="impact"
        className="relative z-10 container mx-auto px-6 py-20"
      >
        <h2 className="text-4xl font-bold text-center mb-12">
          {t("home.impact.title")}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <ImpactFundCard
            icon={<Globe className="w-24 h-24 text-white/80" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            hoverBorder="hover:border-emerald-500/30"
            title={t("home.impact.environmental.title")}
            description={t("home.impact.environmental.description")}
          />
          <ImpactFundCard
            icon={<Users className="w-24 h-24 text-white/80" />}
            gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            hoverBorder="hover:border-teal-500/30"
            title={t("home.impact.education.title")}
            description={t("home.impact.education.description")}
          />
        </div>
      </section>

      {/* CTA Section */}
      <CTASection />

      <HomeFooter />
    </main>
  );
};

export default Home;
