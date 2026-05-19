import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface Country {
  id: string;
  name: string;
  code: string;
  flag?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

/** Active filter state for the charity search bar. */
export interface SearchFilters {
  country?: string;
  category?: string;
  status?: 'active' | 'completed' | 'all';
  sortBy?: 'name' | 'date' | 'popularity';
}

interface SearchBarProps {
  countries: Country[];
  categories: Category[];
  isLoading?: boolean;
  error?: Error | null;
  onSearch: (_query: string, _filters: SearchFilters) => void;
  onCountrySelect?: (_country: Country) => void;
  onCategorySelect?: (_category: Category) => void;
  defaultCountry?: Country;
  placeholder?: string;
  className?: string;
}

/** Charity search bar with filters for country, category, status, and sort order. */
export const SearchBar: React.FC<SearchBarProps> = ({
  countries,
  categories,
  isLoading = false,
  error,
  onSearch,
  onCountrySelect,
  onCategorySelect,
  defaultCountry,
  placeholder = 'Search charities...',
  className
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    country: defaultCountry?.code,
    status: 'active',
    sortBy: 'popularity'
  });
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(query, 300);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    onSearch(debouncedSearch, filtersRef.current);
  }, [debouncedSearch, onSearch]);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(query, newFilters);
  }, [filters, query, onSearch]);

  const handleCountryChange = useCallback((countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country && onCountrySelect) {
      onCountrySelect(country);
    }
    handleFilterChange('country', countryCode);
  }, [countries, handleFilterChange, onCountrySelect]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category && onCategorySelect) {
      onCategorySelect(category);
    }
    handleFilterChange('category', categoryId);
  }, [categories, handleFilterChange, onCategorySelect]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value);
  }, [handleSearch]);

  const handleCountrySelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleCountryChange(e.target.value);
  }, [handleCountryChange]);

  const handleCategorySelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleCategoryChange(e.target.value);
  }, [handleCategoryChange]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleFilterChange('status', e.target.value);
  }, [handleFilterChange]);

  const handleSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleFilterChange('sortBy', e.target.value);
  }, [handleFilterChange]);

  const toggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  /** Renders a single country option with optional flag emoji prefix. */
  const renderCountryOption = (country: Country) => {
    const flagEmoji = country.flag || '';
    return (
      <option key={country.code} value={country.code}>
        {flagEmoji && `${flagEmoji} `}{country.name}
      </option>
    );
  };

  return (
    <div 
      ref={searchRef}
      className={cn('relative space-y-4', className)}
    >
      <div className="relative flex items-center">
        <div className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              isLoading && 'bg-gray-50'
            )}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={toggleFilters}
          className="ml-2"
        >
          Filters
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error.message}
        </div>
      )}

      {showFilters && (
        <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 grid grid-cols-2 gap-4">
          <label htmlFor="country-filter" className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Country</span>
            <select
              id="country-filter"
              value={filters.country}
              onChange={handleCountrySelectChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">All Countries</option>
              {countries.map(renderCountryOption)}
            </select>
          </label>

          <label htmlFor="category-filter" className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Category</span>
            <select
              id="category-filter"
              value={filters.category}
              onChange={handleCategorySelectChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="status-filter" className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Status</span>
            <select
              id="status-filter"
              value={filters.status}
              onChange={handleStatusChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label htmlFor="sort-filter" className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Sort By</span>
            <select
              id="sort-filter"
              value={filters.sortBy}
              onChange={handleSortByChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="popularity">Popularity</option>
              <option value="date">Date</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
};