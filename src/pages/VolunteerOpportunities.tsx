import React, { useState, useCallback, useMemo } from "react";
import { Search, Award, Clock, MapPin, Globe, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { VolunteerApplicationForm } from "../components/volunteer/VolunteerApplicationForm";
import { useTranslation } from "@/hooks/useTranslation";
import { WorkLanguage } from "@/types/volunteer";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/utils/cn";

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  skills: string[];
  commitment: string;
  location: string;
  type: "onsite" | "remote" | "hybrid";
  workLanguage: WorkLanguage;
  image: string;
}

const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Web Development for Education Platform",
    organization: "Global Education Initiative",
    description:
      "Help build an educational platform for underprivileged students. Looking for React and Node.js developers.",
    skills: ["React", "Node.js", "TypeScript"],
    commitment: "5-10 hours/week",
    location: "Remote",
    type: "remote",
    workLanguage: WorkLanguage.ENGLISH,
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Environmental Data Analysis",
    organization: "EcoWatch Foundation",
    description:
      "Analyze environmental data to help track climate change impact. Need experience with data analysis and visualization.",
    skills: ["Python", "Data Analysis", "Visualization"],
    commitment: "8 hours/week",
    location: "Hybrid - New York",
    type: "hybrid",
    workLanguage: WorkLanguage.ENGLISH,
    image:
      "https://images.unsplash.com/photo-1527474305487-b87b222841cc?auto=format&fit=crop&w=800",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    title: "Community Health App Development",
    organization: "HealthBridge NGO",
    description:
      "Create a mobile app for community health workers. Seeking mobile developers with React Native experience.",
    skills: ["React Native", "Mobile Development"],
    commitment: "15 hours/week",
    location: "Remote",
    type: "remote",
    workLanguage: WorkLanguage.SPANISH,
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    title: "Translation Services for Medical Documents",
    organization: "Doctors Without Borders",
    description:
      "Help translate medical documents and patient information. Fluency in both English and Spanish required.",
    skills: ["Translation", "Medical Terminology", "Spanish"],
    commitment: "10 hours/week",
    location: "Remote",
    type: "remote",
    workLanguage: WorkLanguage.SPANISH,
    image:
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    title: "Disaster Relief Coordination",
    organization: "Global Relief Initiative",
    description:
      "Assist in coordinating disaster relief efforts. German language skills needed for communication with local teams.",
    skills: ["Project Management", "Coordination", "German"],
    commitment: "20 hours/week",
    location: "Onsite - Berlin",
    type: "onsite",
    workLanguage: WorkLanguage.GERMAN,
    image:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    title: "Educational Content Creation in Japanese",
    organization: "Global Learning Foundation",
    description:
      "Create educational content for children in Japanese. Teaching experience preferred.",
    skills: ["Content Creation", "Education", "Japanese"],
    commitment: "8 hours/week",
    location: "Remote",
    type: "remote",
    workLanguage: WorkLanguage.JAPANESE,
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800",
  },
];

const SKILLS = [
  "React",
  "Node.js",
  "Python",
  "Data Analysis",
  "Mobile Development",
  "UI/UX",
  "Project Management",
  "Translation",
  "Content Creation",
  "Japanese",
  "Spanish",
  "German",
];

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
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      {filter.label}
      <button
        type="button"
        onClick={filter.onRemove}
        aria-label={`Remove ${filter.label} filter`}
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
        src={opportunity.image}
        alt={opportunity.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {opportunity.title}
        </h3>
        <p className="text-sm font-medium text-emerald-600 mb-2">
          {opportunity.organization}
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
          onClick={onApply}
          className="w-full bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
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
      <div className="flex gap-3 items-center">
        <SearchField
          icon={Search}
          wrapperClass="relative flex-[3]"
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
          wrapperClass="relative flex-[2]"
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
          {SKILLS.map((skill) => (
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

  const filteredOpportunities = useMemo(() => {
    const locationTerm = locationSearch.trim().toLowerCase();
    return SAMPLE_OPPORTUNITIES.filter((opportunity) => {
      const matchesSearch =
        opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opportunity.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
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
        label: `Skill: ${selectedSkill}`,
        onRemove: clearSkill,
      });
    }
    if (selectedType) {
      const typeKey = `volunteer.type.${selectedType}`;
      filters.push({
        key: "type",
        label: `Type: ${t(typeKey, selectedType)}`,
        onRemove: clearType,
      });
    }
    if (selectedLanguage) {
      const langKey = `language.${selectedLanguage}`;
      filters.push({
        key: "language",
        label: `Lang: ${t(langKey, formatLanguageName(selectedLanguage))}`,
        onRemove: clearLanguage,
      });
    }
    if (locationSearch.trim()) {
      filters.push({
        key: "location",
        label: `Location: ${locationSearch.trim()}`,
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
        onSearchChange={handleSearchChange}
        onLocationChange={handleLocationChange}
        onSkillChange={handleSkillChange}
        onRemoteClick={handleRemoteClick}
        onOnsiteClick={handleOnsiteClick}
        onHybridClick={handleHybridClick}
        onLanguageChange={handleLanguageChange}
      />

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

      {filteredOpportunities.length === 0 && (
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
          charityId="550e8400-e29b-41d4-a716-446655440000"
          onClose={handleApplicationClose}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
};

export default VolunteerOpportunities;
