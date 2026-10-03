import React, { useState, useCallback, useMemo } from "react";
import { Search, Award, Clock, MapPin, Globe, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { VolunteerApplicationForm } from "../components/volunteer/VolunteerApplicationForm";
import { useTranslation } from "@/hooks/useTranslation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { WorkLanguage } from "@/types/volunteer";
import {
  useVolunteerOpportunities,
  type VolunteerOpportunityItem as Opportunity,
} from "@/hooks/useVolunteerOpportunities";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/utils/cn";

/**
 * Segmented toggle for work type (Remote / On-site / Hybrid).
 * @param props - Component props
 * @returns The rendered toggle group
 */
function WorkTypeToggle({
  selectedType,
  onRemoteClick,
  onOnsiteClick,
  onHybridClick,
}: {
  selectedType: string;
  onRemoteClick: () => void;
  onOnsiteClick: () => void;
  onHybridClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset
      className="inline-flex rounded-full bg-gray-100 p-0.5 border border-gray-200 shrink-0 m-0"
      aria-label={t("volunteer.workTypeFilter", "Work type filter")}
    >
      <button
        type="button"
        onClick={onRemoteClick}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
          selectedType === "remote"
            ? "bg-white text-emerald-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}
      >
        {t("volunteer.type.remote", "Remote")}
      </button>
      <button
        type="button"
        onClick={onOnsiteClick}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
          selectedType === "onsite"
            ? "bg-white text-emerald-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}
      >
        {t("volunteer.type.onSite", "On-site")}
      </button>
      <button
        type="button"
        onClick={onHybridClick}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
          selectedType === "hybrid"
            ? "bg-white text-emerald-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}
      >
        {t("volunteer.type.hybrid", "Hybrid")}
      </button>
    </fieldset>
  );
}

/** A single active filter for display as a removable pill. */
interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Removable pill displaying an active filter.
 * @param props - Component props
 * @returns The rendered pill element
 */
function FilterPill({ filter }: { filter: ActiveFilter }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      {filter.label}
      <button
        type="button"
        onClick={filter.onRemove}
        aria-label={t("volunteer.removeFilter", "Remove {{filter}} filter", {
          filter: filter.label,
        })}
        className="ml-0.5 hover:text-emerald-900 transition-colors"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Converts a snake_case language code to Title Case display name */
const formatLanguageName = (language: string): string => {
  return language
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Input field with a leading icon, for search and location inputs.
 * @param props - Component props
 * @returns The rendered search field
 */
function SearchField({
  icon: Icon,
  wrapperClass,
  inputClass,
  ...inputProps
}: {
  icon: React.ElementType;
  wrapperClass: string;
  inputClass: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">) {
  return (
    <div className={wrapperClass}>
      <input className={inputClass} {...inputProps} />
      <Icon
        aria-hidden="true"
        className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
      />
    </div>
  );
}

/**
 * Card displaying a single volunteer opportunity.
 * @param props - Component props
 * @returns The rendered opportunity card
 */
function OpportunityCard({
  opportunity,
  onApply,
}: {
  opportunity: Opportunity;
  onApply: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden">
      <img
        src={opportunity.imageUrl}
        alt=""
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {opportunity.title}
        </h3>
        <p className="text-sm font-medium text-emerald-700 mb-2">
          {opportunity.organization !== "" &&
          opportunity.charityPath !== undefined ? (
            <Link
              to={opportunity.charityPath}
              className="hover:text-emerald-900 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              {opportunity.organization}
            </Link>
          ) : (
            opportunity.organization
          )}
        </p>
        <p className="text-gray-600 mb-4">{opportunity.description}</p>
        <div className="flex items-center text-sm text-gray-500">
          <Clock aria-hidden="true" className="h-4 w-4 mr-2" />
          {opportunity.commitment}
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <MapPin aria-hidden="true" className="h-4 w-4 mr-2" />
          {opportunity.location}
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <Globe aria-hidden="true" className="h-4 w-4 mr-2" />
          {t(
            `language.${opportunity.workLanguage}`,
            formatLanguageName(opportunity.workLanguage),
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          {opportunity.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
            >
              <Award aria-hidden="true" className="h-3 w-3 mr-1" />
              {skill}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onApply}
          aria-label={`${t("volunteer.applyNow", "Apply Now")}: ${opportunity.title}`}
          className="w-full bg-emerald-700 text-white px-4 py-2 rounded-md hover:bg-emerald-800 transition-colors"
        >
          {t("volunteer.applyNow", "Apply Now")}
        </button>
      </div>
    </Card>
  );
}

/** Search and filter controls for the opportunities page. */
function OpportunityFilters({
  searchTerm,
  locationSearch,
  selectedSkill,
  selectedType,
  selectedLanguage,
  activeFilters,
  skillOptions,
  onSearchChange,
  onLocationChange,
  onSkillChange,
  onRemoteClick,
  onOnsiteClick,
  onHybridClick,
  onLanguageChange,
}: {
  searchTerm: string;
  locationSearch: string;
  selectedSkill: string;
  selectedType: string;
  selectedLanguage: string;
  activeFilters: ActiveFilter[];
  skillOptions: string[];
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkillChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRemoteClick: () => void;
  onOnsiteClick: () => void;
  onHybridClick: () => void;
  onLanguageChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <ScrollReveal direction="up" delay={100} className="space-y-2">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchField
          icon={Search}
          wrapperClass="relative flex-[3] min-w-[200px]"
          inputClass="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          type="text"
          placeholder={t(
            "volunteer.searchOpportunities",
            "Search opportunities...",
          )}
          aria-label={t(
            "volunteer.searchOpportunities",
            "Search opportunities",
          )}
          value={searchTerm}
          onChange={onSearchChange}
        />

        <SearchField
          icon={MapPin}
          wrapperClass="relative flex-[2] min-w-[160px]"
          inputClass="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          type="text"
          placeholder={t("volunteer.searchLocation", "City or region...")}
          aria-label={t("volunteer.searchLocationAria", "Search location")}
          value={locationSearch}
          onChange={onLocationChange}
        />

        <WorkTypeToggle
          selectedType={selectedType}
          onRemoteClick={onRemoteClick}
          onOnsiteClick={onOnsiteClick}
          onHybridClick={onHybridClick}
        />

        <select
          value={selectedSkill}
          onChange={onSkillChange}
          className="appearance-none bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-[10px] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-medium px-3 py-2 pr-8 text-sm shrink-0 transition-all duration-200 cursor-pointer"
          aria-label={t("volunteer.selectSkill", "Select skill")}
        >
          <option value="">{t("volunteer.allSkills", "All Skills")}</option>
          {skillOptions.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>

        <select
          value={selectedLanguage}
          onChange={onLanguageChange}
          className="appearance-none bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-[10px] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-medium px-3 py-2 pr-8 text-sm shrink-0 transition-all duration-200 cursor-pointer"
          aria-label={t("volunteer.selectLanguage", "Select language")}
        >
          <option value="">
            {t("volunteer.allLanguages", "All Languages")}
          </option>
          {Object.values(WorkLanguage).map((language) => (
            <option key={language} value={language}>
              {t(`language.${language}`, formatLanguageName(language))}
            </option>
          ))}
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <FilterPill key={filter.key} filter={filter} />
          ))}
        </div>
      )}
    </ScrollReveal>
  );
}

/**
 * Browse and apply for volunteer opportunities
 * @returns VolunteerOpportunities page element
 */
const VolunteerOpportunities: React.FC = () => {
  usePageTitle("Volunteer Opportunities");
  const [searchTerm, setSearchTerm] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { opportunities, loading, error } = useVolunteerOpportunities();

  const skillOptions = useMemo(
    () =>
      [...new Set(opportunities.flatMap((o) => o.skills))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [opportunities],
  );

  const filteredOpportunities = useMemo(() => {
    const locationTerm = locationSearch.trim().toLowerCase();
    const searchTermLower = searchTerm.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      const matchesSearch =
        searchTermLower.length === 0 ||
        [
          opportunity.title,
          opportunity.description,
          opportunity.organization,
          ...opportunity.skills,
        ].some((field) => field.toLowerCase().includes(searchTermLower));
      const matchesSkill =
        !selectedSkill || opportunity.skills.includes(selectedSkill);
      const matchesType = !selectedType || opportunity.type === selectedType;
      const matchesLanguage =
        !selectedLanguage || opportunity.workLanguage === selectedLanguage;
      const matchesLocation =
        locationTerm.length === 0 ||
        opportunity.location.toLowerCase().includes(locationTerm);

      return (
        matchesSearch &&
        matchesSkill &&
        matchesType &&
        matchesLanguage &&
        matchesLocation
      );
    });
  }, [
    opportunities,
    searchTerm,
    locationSearch,
    selectedSkill,
    selectedType,
    selectedLanguage,
  ]);

  const handleApply = useCallback(
    (opportunity: Opportunity) => {
      if (!user) {
        showToast(
          "error",
          t(
            "volunteer.signInToApply",
            "Please sign in to apply for volunteer opportunities",
          ),
        );
        navigate("/auth");
        return;
      }
      setSelectedOpportunity(opportunity);
      setShowApplicationForm(true);
    },
    [user, navigate, showToast, t],
  );

  const createApplyHandler = useCallback(
    (opportunity: Opportunity) => {
      return () => handleApply(opportunity);
    },
    [handleApply],
  );

  const handleApplicationClose = useCallback(() => {
    setShowApplicationForm(false);
    setSelectedOpportunity(null);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    showToast(
      "success",
      t("volunteer.applicationSuccess", "Application submitted successfully!"),
    );
    setShowApplicationForm(false);
    setSelectedOpportunity(null);
  }, [showToast, t]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocationSearch(e.target.value);
    },
    [],
  );

  const handleSkillChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSkill(e.target.value);
    },
    [],
  );

  const handleTypeChange = useCallback((category: string) => {
    setSelectedType((prev) => (prev === category ? "" : category));
  }, []);

  const handleRemoteClick = useCallback(() => {
    handleTypeChange("remote");
  }, [handleTypeChange]);

  const handleOnsiteClick = useCallback(() => {
    handleTypeChange("onsite");
  }, [handleTypeChange]);

  const handleHybridClick = useCallback(() => {
    handleTypeChange("hybrid");
  }, [handleTypeChange]);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguage(e.target.value);
    },
    [],
  );

  const clearSkill = useCallback(() => {
    setSelectedSkill("");
  }, []);

  const clearType = useCallback(() => {
    setSelectedType("");
  }, []);

  const clearLanguage = useCallback(() => {
    setSelectedLanguage("");
  }, []);

  const clearLocation = useCallback(() => {
    setLocationSearch("");
  }, []);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (selectedSkill) {
      filters.push({
        key: "skill",
        label: t("volunteer.filter.skill", "Skill: {{value}}", {
          value: selectedSkill,
        }),
        onRemove: clearSkill,
      });
    }
    if (selectedType) {
      const typeKey = `volunteer.type.${selectedType}`;
      filters.push({
        key: "type",
        label: t("volunteer.filter.type", "Type: {{value}}", {
          value: t(typeKey, selectedType),
        }),
        onRemove: clearType,
      });
    }
    if (selectedLanguage) {
      const langKey = `language.${selectedLanguage}`;
      filters.push({
        key: "language",
        label: t("volunteer.filter.language", "Language: {{value}}", {
          value: t(langKey, formatLanguageName(selectedLanguage)),
        }),
        onRemove: clearLanguage,
      });
    }
    if (locationSearch.trim()) {
      filters.push({
        key: "location",
        label: t("volunteer.filter.location", "Location: {{value}}", {
          value: locationSearch.trim(),
        }),
        onRemove: clearLocation,
      });
    }
    return filters;
  }, [
    selectedSkill,
    selectedType,
    selectedLanguage,
    locationSearch,
    clearSkill,
    clearType,
    clearLanguage,
    clearLocation,
    t,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
      <h1 className="text-3xl font-bold text-gray-900 animate-fade-in-up">
        {t("volunteer.opportunities", "Volunteer Opportunities")}
      </h1>

      <OpportunityFilters
        searchTerm={searchTerm}
        locationSearch={locationSearch}
        selectedSkill={selectedSkill}
        selectedType={selectedType}
        selectedLanguage={selectedLanguage}
        activeFilters={activeFilters}
        skillOptions={skillOptions}
        onSearchChange={handleSearchChange}
        onLocationChange={handleLocationChange}
        onSkillChange={handleSkillChange}
        onRemoteClick={handleRemoteClick}
        onOnsiteClick={handleOnsiteClick}
        onHybridClick={handleHybridClick}
        onLanguageChange={handleLanguageChange}
      />

      {loading && (
        <div role="status" className="text-center py-12 text-gray-500">
          {t("volunteer.loadingOpportunities", "Loading opportunities...")}
        </div>
      )}

      {error !== null && (
        <div role="alert" className="text-center py-12 text-red-700">
          {t(
            "volunteer.loadOpportunitiesError",
            "We couldn't load volunteer opportunities. Please try again later.",
          )}
        </div>
      )}

      <ScrollReveal direction="up" delay={200}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onApply={createApplyHandler(opportunity)}
            />
          ))}
        </div>
      </ScrollReveal>

      {!loading && error === null && filteredOpportunities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t(
            "volunteer.noOpportunitiesFound",
            "No opportunities found matching your criteria.",
          )}
        </div>
      )}

      {showApplicationForm && selectedOpportunity && (
        <VolunteerApplicationForm
          opportunityId={selectedOpportunity.id}
          opportunityTitle={selectedOpportunity.title}
          charityId={selectedOpportunity.charityId}
          onClose={handleApplicationClose}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
};

export default VolunteerOpportunities;
