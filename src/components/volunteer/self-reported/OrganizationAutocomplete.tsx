import React, { useCallback, useRef, useEffect, useState } from "react";
import { useOrganizationSearch } from "@/hooks/useOrganizationSearch";
import { OrganizationSearchResult } from "@/types/selfReportedHours";
import { Search, X, Building2, Loader2 } from "lucide-react";

interface OrganizationAutocompleteProps {
  onSelect: (_org: OrganizationSearchResult | null) => void;
  initialValue?: OrganizationSearchResult | null;
  error?: string;
  disabled?: boolean;
}

/**
 * Autocomplete component for searching and selecting verified organizations
 * @param props - Component props
 * @returns JSX element
 */
export const OrganizationAutocomplete: React.FC<
  OrganizationAutocompleteProps
> = ({ onSelect, initialValue, error, disabled = false }) => {
  const {
    query,
    setQuery,
    results,
    loading,
    selectedOrg,
    selectOrganization,
    clearSelection,
  } = useOrganizationSearch();

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with initial value
  useEffect(() => {
    if (initialValue) {
      selectOrganization(initialValue);
    }
  }, [initialValue, selectOrganization]);

  // Handle click outside to close dropdown
  useEffect(() => {
    /** Closes the dropdown when clicking outside the autocomplete wrapper. */
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
      setQuery(e.target.value);
      setIsOpen(true);
      if (selectedOrg) {
        selectOrganization(null);
        onSelect(null);
      }
    },
    [setQuery, selectedOrg, selectOrganization, onSelect],
  );

  const handleSelect = useCallback(
    (org: OrganizationSearchResult) => {
      selectOrganization(org);
      onSelect(org);
      setIsOpen(false);
    },
    [selectOrganization, onSelect],
  );

  const handleResultClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const orgId = e.currentTarget.dataset.orgId;
      const org = results.find((r) => r.id === orgId);
      if (org) {
        handleSelect(org);
      }
    },
    [results, handleSelect],
  );

  const handleClear = useCallback(() => {
    clearSelection();
    onSelect(null);
    inputRef.current?.focus();
  }, [clearSelection, onSelect]);

  const handleFocus = useCallback(() => {
    if (query.length >= 2 && !selectedOrg) {
      setIsOpen(true);
    }
  }, [query.length, selectedOrg]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [],
  );

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
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search for an organization..."
          disabled={disabled}
          className={`block w-full pl-10 pr-10 py-3 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            error ? "border-red-300" : "border-gray-300 dark:border-gray-600"
          } ${disabled ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : "bg-white dark:bg-gray-800"}`}
        />
        {(query || selectedOrg) && !disabled && (
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
            {selectedOrg.location && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {selectedOrg.location}
              </p>
            )}
          </div>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
            Verified
          </span>
        </div>
      )}

      {isOpen && results.length > 0 && !selectedOrg && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((org) => (
            <li key={org.id}>
              <button
                type="button"
                data-org-id={org.id}
                onClick={handleResultClick}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center gap-3"
              >
                <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {org.name}
                  </p>
                  {org.location && (
                    <p className="text-xs text-gray-500 truncate">
                      {org.location}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        query.length >= 2 &&
        results.length === 0 &&
        !loading &&
        !selectedOrg && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No organizations found matching &ldquo;{query}&rdquo;
          </div>
        )}
    </div>
  );
};

export default OrganizationAutocomplete;
