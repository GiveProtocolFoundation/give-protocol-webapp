import React, { useCallback, useRef, useEffect, useState } from "react";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import type { CharityOrganization } from "@/types/charityOrganization";
import { Search, X, Building2, Loader2, BadgeCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface CharityOrgAutocompleteProps {
  onSelect: (_org: CharityOrganization | null) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Autocomplete component for searching the charity_organizations registry.
 * Uses the search_charity_organizations RPC via useCharityOrganizationSearch.
 * On selection, passes the full CharityOrganization record to the parent.
 */
export const CharityOrgAutocomplete: React.FC<CharityOrgAutocompleteProps> = ({
  onSelect,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<CharityOrganization | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { organizations, loading } = useCharityOrganizationSearch({
    searchTerm: inputValue,
    filterState: "",
    filterCountry: "",
    onPlatformOnly: false,
  });

  // Close dropdown on outside click
  useEffect(() => {
    /** Closes the autocomplete dropdown when the user clicks outside the wrapper. */
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsOpen(true);
      if (selectedOrg) {
        setSelectedOrg(null);
        onSelect(null);
      }
    },
    [selectedOrg, onSelect],
  );

  const handleSelect = useCallback(
    (org: CharityOrganization) => {
      setSelectedOrg(org);
      setInputValue(org.name);
      setIsOpen(false);
      onSelect(org);
    },
    [onSelect],
  );

  const handleResultClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const ein = e.currentTarget.dataset.ein;
      const org = organizations.find((o) => o.ein === ein);
      if (org) handleSelect(org);
    },
    [organizations, handleSelect],
  );

  const handleClear = useCallback(() => {
    setSelectedOrg(null);
    setInputValue("");
    setIsOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2 && !selectedOrg) {
      setIsOpen(true);
    }
  }, [inputValue.length, selectedOrg]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") setIsOpen(false);
    },
    [],
  );

  /** Builds a "City, State" label from an organization record, or null if empty. */
  const locationLabel = (org: CharityOrganization): string | null => {
    const parts = [org.city, org.state].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={t("volunteer.searchRegistryPlaceholder", "Search charity registry by name or tax ID\u2026")}
          disabled={disabled}
          className={`block w-full pl-10 pr-10 py-3 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            error ? "border-red-300" : "border-gray-300 dark:border-gray-600"
          } ${disabled ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : "bg-white dark:bg-gray-800"}`}
        />
        {(inputValue || selectedOrg) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {selectedOrg && (
        <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
          <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200 truncate">
              {selectedOrg.name}
            </p>
            {locationLabel(selectedOrg) && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {locationLabel(selectedOrg)}
                {selectedOrg.ein ? ` · ${t("volunteer.registryTaxId", "Tax ID {{value}}", { value: selectedOrg.ein })}` : ""}
              </p>
            )}
          </div>
          {selectedOrg.is_on_platform && (
            <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded whitespace-nowrap">
              <BadgeCheck className="h-3.5 w-3.5" />
              On Platform
            </span>
          )}
        </div>
      )}

      {isOpen && organizations.length > 0 && !selectedOrg && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {organizations.map((org) => (
            <li key={org.ein}>
              <button
                type="button"
                data-ein={org.ein}
                onClick={handleResultClick}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center gap-3"
              >
                <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {org.name}
                  </p>
                  {locationLabel(org) && (
                    <p className="text-xs text-gray-500 truncate">
                      {locationLabel(org)}
                      {org.ein ? ` · ${t("volunteer.registryTaxId", "Tax ID {{value}}", { value: org.ein })}` : ""}
                    </p>
                  )}
                </div>
                {org.is_on_platform && (
                  <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        inputValue.length >= 2 &&
        organizations.length === 0 &&
        !loading &&
        !selectedOrg && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No registry matches for &ldquo;{inputValue}&rdquo;
          </div>
        )}
    </div>
  );
};

export default CharityOrgAutocomplete;
