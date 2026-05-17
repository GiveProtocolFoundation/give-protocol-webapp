import React from "react";
import { Link } from "react-router-dom";
import { Cause } from "../../types/charity";

interface CauseGridProps {
  searchTerm: string;
  category: string;
}

/**
 * Renders a grid of charitable causes filtered by search term and category.
 * @param props - Component props.
 * @param props.searchTerm - Free-text query used to filter causes by name.
 * @param props.category - Category filter applied to the cause list.
 * @returns A grid of cause cards.
 */
export const CauseGrid: React.FC<CauseGridProps> = ({
  searchTerm,
  category,
}) => {
  // Sample causes - replace with actual data fetching
  const causes: Cause[] = [
    {
      id: "1",
      name: "Clean Water Initiative",
      description: "Providing clean water access to rural communities",
      targetAmount: 50000,
      raisedAmount: 25000,
      charityId: "1",
      category: "Water & Sanitation",
      image:
        "https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=800",
    },
    {
      id: "2",
      name: "Education Access Program",
      description: "Ensuring quality education for underprivileged children",
      targetAmount: 75000,
      raisedAmount: 45000,
      charityId: "2",
      category: "Education",
      image:
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800",
    },
    {
      id: "3",
      name: "Reforestation Project",
      description: "Restoring forest ecosystems and biodiversity",
      targetAmount: 100000,
      raisedAmount: 60000,
      charityId: "3",
      category: "Environment",
      image:
        "https://images.unsplash.com/photo-1498925008800-019c7d59d903?auto=format&fit=crop&w=800",
    },
  ];

  /** Convert a cause name to a URL-friendly slug */
  const getCauseSlug = (name: string): string => {
    return name.toLowerCase().replaceAll(/\s+/g, "-");
  };

  const filteredCauses = causes.filter((cause) => {
    const matchesSearch =
      cause.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cause.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !category || cause.category === category;
    return matchesSearch && matchesCategory;
  });

  if (filteredCauses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No causes found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredCauses.map((cause) => (
        <Link
          key={cause.id}
          to={`/causes/${getCauseSlug(cause.name)}`}
          className="block bg-white rounded-lg shadow-card border border-gray-100 overflow-hidden transition-all duration-200 ease-in-out hover:shadow-card-hover"
        >
          <img
            src={cause.image}
            alt={cause.name}
            className="w-full h-48 object-cover"
          />
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {cause.name}
            </h3>
            <p className="text-gray-600 mb-4">{cause.description}</p>
            <div
              className="w-full h-[48px] rounded-full bg-[#0d9f6e] text-white flex items-center justify-center gap-2.5 uppercase"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[0.65rem] leading-none">
                &#9829;
              </span>{" "}
              Give to Cause
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
