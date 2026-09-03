import React from "react";
import { Link, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { GivingOptionsCard } from "@/components/web3/donation/GivingButtons";
import { ImpactCalculator } from "@/components/impact/ImpactCalculator";
import { FloatingSocialSidebar } from "@/components/social/FloatingSocialSidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePortfolioFund,
  type PortfolioFundCharity,
  type PortfolioFundDetails,
} from "@/hooks/usePortfolioFund";

const DEFAULT_COVER = "/images/charities/default.jpg";

/** Hero banner displaying the portfolio fund cover, name, and description. */
function PortfolioHero({
  fund,
}: {
  fund: PortfolioFundDetails;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="relative h-64 rounded-xl overflow-hidden mb-6 bg-gray-900">
      <ImageWithFallback
        src={fund.imageUrl || DEFAULT_COVER}
        alt={`${fund.name} cover`}
        className="w-full h-full object-cover opacity-60"
        fallbackSrc={DEFAULT_COVER}
      />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <span className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-white/90 text-emerald-700 text-xs font-medium rounded-full">
          {t("browse.funds.badge", "Portfolio Fund")}
        </span>
        <h1 className="text-3xl font-bold mb-2">{fund.name}</h1>
        <p className="text-lg opacity-90">{fund.description}</p>
      </div>
    </div>
  );
}

/** Card summarizing one charity that the portfolio fund supports. */
function FundCharityDetails({
  charity,
}: {
  charity: PortfolioFundCharity;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <div className="flex items-center mb-2">
        {charity.verified && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            {t("browse.verified", "Verified")}
          </span>
        )}
        <span className="ml-2 text-sm text-gray-500">{charity.location}</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {charity.name}
      </h3>
      <p className="text-gray-600 line-clamp-3">{charity.mission}</p>
    </div>
  );
}

function FundCharityCard({
  charity,
}: {
  charity: PortfolioFundCharity;
}): React.ReactElement {
  return (
    <Link to={`/charity/${charity.ein}`}>
      <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02]">
        <ImageWithFallback
          src={charity.imageUrl || DEFAULT_COVER}
          alt={`${charity.name} cover`}
          className="w-full h-48 object-cover"
          fallbackSrc={DEFAULT_COVER}
        />
        <FundCharityDetails charity={charity} />
      </Card>
    </Link>
  );
}

/**
 * Detail page for a single portfolio fund, loaded from Supabase by route id.
 * Shows the fund hero, giving options, and every charity it distributes to.
 * @returns The portfolio fund detail page
 */
const PortfolioFundDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { fund, loading, error } = usePortfolioFund(id);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error !== null || !fund) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("portfolio.notFound.title", "Portfolio Fund Not Found")}
          </h1>
          <p className="text-gray-500">
            {t(
              "portfolio.notFound.body",
              "The portfolio fund you are looking for does not exist or is no longer active.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const charityCount = fund.charities.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FloatingSocialSidebar title={fund.name} />
      <div className="mb-8">
        <PortfolioHero fund={fund} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ImpactCalculator fundId={fund.id} fundName={fund.name} />
          <GivingOptionsCard charityName={fund.name} charityAddress={fund.id} />
        </div>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 mb-6">
        {t("portfolio.supportedOrgs", "Supported Organizations")}
        <span className="inline-flex items-center gap-1 text-sm font-normal text-gray-500">
          <Users aria-hidden="true" className="h-4 w-4" />
          {charityCount}{" "}
          {charityCount === 1
            ? t("browse.funds.charity", "charity")
            : t("browse.funds.charities", "charities")}
        </span>
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {fund.charities.map((charity) => (
          <FundCharityCard key={charity.id} charity={charity} />
        ))}
      </div>
    </div>
  );
};

export default PortfolioFundDetail;
