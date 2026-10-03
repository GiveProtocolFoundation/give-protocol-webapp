import React, { useCallback } from "react";
import { Search } from "lucide-react";

interface CarouselSearchProps {
  value: string;
  onChange: (_value: string) => void;
  placeholder: string;
}

/**
 * Compact search box shown above the Causes and Portfolio Funds carousels.
 * Filtering is done by the caller, client-side, over the loaded items.
 * @param props - Current value, change handler, and placeholder / accessible label
 * @returns The search input
 */
export const CarouselSearch: React.FC<CarouselSearchProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );

  return (
    <div className="relative mb-6">
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
      />
    </div>
  );
};
