import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { PortfolioFund } from "../../types/charity";
import { useTranslation } from "@/hooks/useTranslation";

interface PortfolioGridProps {
  searchTerm: string;
  category: string;
}

/**
 * Renders a grid of portfolio funds filtered by search term and category.
 * @param props - Component props.
 * @param props.searchTerm - Free-text query used to filter portfolios by name.
 * @param props.category - Category filter applied to the portfolio list.
 * @returns A grid of portfolio cards.
 */
export const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  searchTerm,
  category,
}) => {
  const { t } = useTranslation();
  // Sample portfolio funds - replace with actual data fetching
  const portfolios: PortfolioFund[] = [
    {
      id: "1",
      name: "Environmental Impact Fund",
      description: "Supporting climate action and conservation projects",
      category: "Environmental",
      totalDonated: 1000000,
      charities: ["1", "2", "3"],
      image:
        "https://images.unsplash.com/photo-1498925008800-019c7d59d903?auto=format&fit=crop&w=800",
    },
    {
      id: "2",
      name: "Poverty Relief Impact Fund",
      description:
        "Empowering communities through sustainable poverty alleviation programs",
      category: "Poverty Relief",
      totalDonated: 850000,
      charities: ["4", "5", "6"],
      image:
        "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800",
    },
    {
      id: "3",
      name: "Education Impact Fund",
      description:
        "Advancing educational opportunities and access to quality learning worldwide",
      category: "Education",
      totalDonated: 920000,
      charities: ["7", "8", "9"],
      image:
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800",
    },
  ];

  /** Extract the category slug from a portfolio fund name */
  const getPortfolioSlug = (name: string): string => {
    const category = name.split(" ")[0].toLowerCase();
    return category;
  };

  const filteredPortfolios = portfolios.filter((portfolio) => {
    const matchesSearch =
      portfolio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !category || portfolio.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredPortfolios.map((portfolio) => (
        <Link
          key={portfolio.id}
          to={`/portfolio/${getPortfolioSlug(portfolio.name)}`}
        >
          <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02]">
            <img
              src={portfolio.image}
              alt={portfolio.name}
              className="w-full h-48 object-cover"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2 px-6 pt-6">
              {portfolio.name}
            </h3>
            <p className="text-gray-600 mb-4 px-6">{portfolio.description}</p>
            <div
              className="w-full h-[48px] rounded-full bg-[#0d9f6e] text-white flex items-center justify-center gap-2.5 uppercase mx-6 mb-6"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
                width: "calc(100% - 3rem)",
              }}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[0.65rem] leading-none">
                &#9829;
              </span>{" "}
              {t("browse.funds.donateCta", "Donate to Fund")}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};
