/** Aggregated charity request row returned by admin_list_charity_requests RPC */
export interface AdminCharityRequestRow {
  ein: string;
  request_count: number;
  first_requested_at: string;
  latest_requested_at: string;
  latest_requester_email: string | null;
  total_count: number;
}

/** Aggregated charity request item exposed to UI components (camelCase) */
export interface AdminCharityRequestItem {
  ein: string;
  requestCount: number;
  firstRequestedAt: string;
  latestRequestedAt: string;
  latestRequesterEmail: string | null;
}

/** Paginated result set returned by the admin charity requests query. */
export interface AdminCharityRequestsResult {
  requests: AdminCharityRequestItem[];
  totalCount: number;
}
