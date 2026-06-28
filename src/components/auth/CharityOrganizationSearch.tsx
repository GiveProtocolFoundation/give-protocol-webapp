import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CharityOrganizationCard } from "@/components/charity/CharityOrganizationCard";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import type { CharityOrganization } from "@/types/charityOrganization";

interface CharityOrganizationSearchProps {
  onOrganizationSelect: (_organization: CharityOrganization) => void;
  onSkip: () => void;
}

const COUNTRY_VALUES = [
  { value: "", labelKey: "auth.orgSearch.allCountries" as const },
  { value: "US", label: "United States" },
  { value: "MX", label: "Mexico" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
];

/**
 * Charity organization search step for charity registration.
 * Allows users to search the charity database and select their organization.
 * @param props - Component props
 * @param props.onOrganizationSelect - Called when user selects an organization
 * @param props.onSkip - Called when user chooses to register manually
 * @returns The rendered search component
 */
export const CharityOrganizationSearch: React.FC<
  CharityOrganizationSearchProps
> = ({ onOrganizationSelect, onSkip }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  const { organizations, loading, hasMore, loadMore } =
    useCharityOrganizationSearch({
      searchTerm,
      filterState: "",
      filterCountry,
      onPlatformOnly: false,
    });

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilterCountry(e.target.value);
    },
    [],
  );

  const hasSearchTerm = searchTerm.trim().length >= 2;
  const showNoResults =
    (hasSearchTerm || filterCountry !== "") &&
    !loading &&
    organizations.length === 0;

  return (
    <div className="space-y-4">
      <Input
        label={t("auth.orgSearch.orgNameLabel")}
        placeholder={t("auth.orgSearch.searchPlaceholder")}
        variant="fintech"
        value={searchTerm}
        onChange={handleSearchChange}
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="country-filter"
          className="text-sm font-medium text-gray-700"
        >
          {t("auth.orgSearch.countryLabel")}
        </label>
        <select
          id="country-filter"
          value={filterCountry}
          onChange={handleCountryChange}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {COUNTRY_VALUES.map((option) => (
            <option key={option.value} value={option.value}>
              {"labelKey" in option ? t(option.labelKey) : option.label}
            </option>
          ))}
        </select>
      </div>

      {!hasSearchTerm && filterCountry === "" && !loading && (
        <p className="text-sm text-gray-500 text-center py-4">
          {t("auth.orgSearch.searchPrompt")}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      )}

      {showNoResults && (
        <p className="text-sm text-gray-500 text-center py-4">
          {t("auth.orgSearch.noResults")}
        </p>
      )}

      {organizations.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {organizations.map((org) => (
            <CharityOrganizationCard
              key={org.ein}
              organization={org}
              onSelect={onOrganizationSelect}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore}>
            {t("auth.orgSearch.loadMore")}
          </Button>
        </div>
      )}

      <p className="text-sm text-center text-gray-500 pt-2">
        {t("auth.orgSearch.cantFind")}{" "}
        <button
          type="button"
          onClick={onSkip}
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          {t("auth.orgSearch.registerManually")}
        </button>
      </p>
    </div>
  );
};
