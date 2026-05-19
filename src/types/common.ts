// Basic Types
/** Universally unique identifier string. */
export type UUID = string;
/** Unix timestamp in milliseconds. */
export type Timestamp = number;
/** ISO 8601 date string (e.g. "2024-01-15"). */
export type ISO8601Date = string;
/** URL string. */
export type URL = string;

// Utility Types
/** A value that may be T or null. */
export type Nullable<T> = T | null;
/** A value that may be T or undefined. */
export type Optional<T> = T | undefined;
/** Recursively marks all properties of T as readonly. */
export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: ReadonlyDeep<T[P]>;
};

// Validation Types
/** Result of a validation check, including any errors. */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/** A single validation error with field, message, and error code. */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Common Response Types
/** Standard API response wrapper with data, error, and optional metadata. */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  metadata?: ResponseMetadata;
}

/** Structured API error with a code, human-readable message, and optional details. */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Metadata attached to API responses, including timestamp and optional pagination. */
export interface ResponseMetadata {
  timestamp: Timestamp;
  requestId: string;
  pagination?: PaginationMeta;
}

/** Pagination state returned by list endpoints. */
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Common Query Types
/** Options for paginated and sorted list queries. */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

/** A start/end timestamp pair used to filter data by date range. */
export interface DateRange {
  startDate: Timestamp;
  endDate: Timestamp;
}
