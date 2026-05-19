import React from "react";
import { Charity, Campaign, CharityCategory } from "./charity";
import { TokenAmount, TransactionHash } from "./blockchain";
import { ApiError, QueryOptions } from "./common";

// Data Fetching Hooks
/** Return value of useCharity — includes the fetched charity and loading/error state. */
export interface UseCharityResult {
  charity?: Charity;
  loading: boolean;
  error?: ApiError;
  refetch: () => Promise<void>;
}

/** Return value of useCampaign — includes the fetched campaign and loading/error state. */
export interface UseCampaignResult {
  campaign?: Campaign;
  loading: boolean;
  error?: ApiError;
  refetch: () => Promise<void>;
}

/** Configuration options for hooks that support infinite/paginated data loading. */
export interface UseInfiniteDataOptions<T> extends QueryOptions {
  fetchFn: (_options: QueryOptions) => Promise<T[]>; // Prefixed as unused
  pageSize?: number;
  initialData?: T[];
}

/** Return value of hooks that support infinite/paginated data loading. */
export interface UseInfiniteDataResult<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Web3 Hooks
/** Return value of useWallet — wallet connection state and control functions. */
export interface UseWalletResult {
  address?: string;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error?: Error;
}

/** Return value of useDonation — donation submission function and state. */
export interface UseDonationResult {
  donate: (
    _amount: TokenAmount,
    _charityId: string,
  ) => Promise<TransactionHash>; // Prefixed as unused
  loading: boolean;
  error?: Error;
}

/** Return value of useTransaction — transaction hash, status, and loading state. */
export interface UseTransactionResult {
  hash?: TransactionHash;
  status: "pending" | "confirmed" | "failed";
  loading: boolean;
  error?: Error;
}

// Form Hooks
/** Return value of useForm — field values, errors, and submission handlers. */
export interface UseFormResult<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  handleChange: (_field: keyof T, _value: T[keyof T]) => void; // Prefixed as unused
  handleBlur: (_field: keyof T) => void; // Prefixed as unused
  handleSubmit: (_e: React.FormEvent) => void; // Prefixed as unused
  isValid: boolean;
  isDirty: boolean;
  resetForm: () => void;
}

// Filter Hooks
/** Return value of useFilters — active filter values and update functions. */
export interface UseFiltersResult {
  filters: {
    search: string;
    categories: CharityCategory[];
    verifiedOnly: boolean;
  };
  setSearch: (_search: string) => void; // Prefixed as unused
  setCategories: (_categories: CharityCategory[]) => void; // Prefixed as unused
  setVerifiedOnly: (_verified: boolean) => void; // Prefixed as unused
  resetFilters: () => void;
}
