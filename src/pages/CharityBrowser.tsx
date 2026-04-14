import React, { useState, useCallback } from "react";
import { Search, MapPin } from "lucide-react";
import { CharityGrid } from "../components/charity/CharityGrid";
import { PortfolioGrid } from "../components/charity/PortfolioGrid";
import { CauseGrid } from "../components/charity/CauseGrid";
import { GeographicFilter } from "../components/charity/GeographicFilter";
import { Button } from "../components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useGeographicFilterParams } from "@/hooks/useGeographicFilterParams";
import { resolveLocation } from "@/utils/locationResolver";
import type { LocationFilter } from "@/utils/locationResolver";

type ViewMode = "charities" | "causes" | "portfolios";
type FilterCategory = "impact" | "hq";

/** Page component for browsing and filtering charities, causes, and portfolio funds. */
const CharityBrowser: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("charities");
  const [searchTerm, setSearchTerm] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("hq");
  const [impactLocations, setImpactLocations] = useState<LocationFilter[]>([]);
  const [hqLocations, setHqLocations] = useState<LocationFilter[]>([]);
  const [onPlatformOnly, setOnPlatformOnly] = useState(false);

  const { filterState, filterCountry } = useGeographicFilterParams(
    hqLocations,
    impactLocations,
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleLocationInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocationInput(e.target.value);
    },
    [],
  );

  const handleLocationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const trimmed = locationInput.trim();
      if (trimmed.length === 0) return;

      const location = resolveLocation(trimmed);
      const targetLocations =
        activeCategory === "impact" ? impactLocations : hqLocations;
      const onChange =
        activeCategory === "impact" ? setImpactLocations : setHqLocations;

      const isDuplicate = targetLocations.some((loc) => loc.id === location.id);
      if (!isDuplicate) {
        onChange([...targetLocations, location]);
      }

      setLocationInput("");
    },
    [locationInput, activeCategory, impactLocations, hqLocations],
  );

  const handleCategoryChange = useCallback((category: FilterCategory) => {
    setActiveCategory(category);
  }, []);

  const handleCharitiesClick = useCallback(() => {
    setViewMode("charities");
  }, []);

  const handleCausesClick = useCallback(() => {
    setViewMode("causes");
  }, []);

  const handlePortfoliosClick = useCallback(() => {
    setViewMode("portfolios");
  }, []);

  const handleOnPlatformChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOnPlatformOnly(e.target.checked);
    },
    [],
  );

  /** Renders the appropriate grid component based on the selected view mode. */
  const renderContent = () => {
    switch (viewMode) {
      case "causes":
        return <CauseGrid searchTerm={searchTerm} category="" />;
      case "portfolios":
        return <PortfolioGrid searchTerm={searchTerm} category="" />;
      case "charities":
      default:
        return (
          <CharityGrid
            searchTerm={searchTerm}
            filterState={filterState}
            filterCountry={filterCountry}
            onPlatformOnly={onPlatformOnly}
          />
        );
    }
  };

  const isCharities = viewMode === "charities";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
      <h1 className="text-3xl font-bold text-gray-900 animate-fade-in-up">
        Discover Impact Opportunities
      </h1>

      <ScrollReveal direction="up" delay={100}>
        <div className="flex space-x-3">
          <Button
            variant={viewMode === "charities" ? "primary" : "secondary"}
            onClick={handleCharitiesClick}
          >
            Charities
          </Button>
          <Button
            variant={viewMode === "causes" ? "primary" : "secondary"}
            onClick={handleCausesClick}
          >
            Causes
          </Button>
          <Button
            variant={viewMode === "portfolios" ? "primary" : "secondary"}
            onClick={handlePortfoliosClick}
          >
            Portfolio Funds
          </Button>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={200} className="space-y-2">
        <div className="flex gap-3">
          <div
            className={isCharities ? "relative flex-[7]" : "relative flex-grow"}
          >
            <input
              type="text"
              placeholder="Search charities..."
              aria-label="Search charities"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Search
              aria-hidden="true"
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            />
          </div>
          {isCharities && (
            <div className="relative flex-[3]">
              <input
                type="text"
                value={locationInput}
                onChange={handleLocationInputChange}
                onKeyDown={handleLocationKeyDown}
                placeholder="City, state, or country..."
                aria-label="Search location"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
              <MapPin
                aria-hidden="true"
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              />
            </div>
          )}
        </div>

        {isCharities && (
          <GeographicFilter
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            impactLocations={impactLocations}
            hqLocations={hqLocations}
            onImpactLocationsChange={setImpactLocations}
            onHqLocationsChange={setHqLocations}
            onPlatformOnly={onPlatformOnly}
            onPlatformOnlyChange={handleOnPlatformChange}
          />
        )}
      </ScrollReveal>

      <ScrollReveal direction="up" delay={300}>
        {renderContent()}
      </ScrollReveal>
    </main>
  );
};

export default CharityBrowser;
