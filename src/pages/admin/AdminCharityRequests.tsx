import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";
import { listCharityRequests } from "@/services/adminCharityRequestsService";
import type { AdminCharityRequestItem } from "@/types/adminCharityRequests";

/**
 * Formats an ISO date string to a localized short date.
 * @param iso - ISO 8601 date string
 * @returns Formatted date string (e.g. "Mar 15, 2026")
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a 9-digit EIN with a hyphen (e.g. "12-3456789").
 * @param ein - Employer Identification Number string
 * @returns Formatted EIN or original string if not 9 digits
 */
function formatEin(ein: string): string {
  if (ein.length === 9) {
    return `${ein.slice(0, 2)}-${ein.slice(2)}`;
  }
  return ein;
}

/** Single charity request row in the admin requests table. */
function RequestRow({
  request,
}: {
  request: AdminCharityRequestItem;
}): React.ReactElement {
  return (
    <tr className="border-b last:border-b-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-mono text-gray-900">
        {formatEin(request.ein)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          {request.requestCount}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {request.latestRequesterEmail ?? (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDate(request.latestRequestedAt)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDate(request.firstRequestedAt)}
      </td>
    </tr>
  );
}

/**
 * Admin page listing donor-submitted charity requests aggregated by EIN.
 * Surfaces unclaimed-charity outreach work for admins.
 * @returns The rendered admin charity requests page
 */
const AdminCharityRequests: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<AdminCharityRequestItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listCharityRequests();
      setRequests(result.requests);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load charity requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            {t(
              "admin.charityRequests.errorTitle",
              "Error Loading Charity Requests",
            )}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRequests}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            aria-label="Retry loading charity requests"
          >
            {t("common.retry", "Retry")}
          </button>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t("admin.charityRequests.title", "Charity Requests")}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t(
            "admin.charityRequests.subtitle",
            "Donor-submitted requests for unclaimed charities, grouped by EIN. Highest-interest organizations should be prioritized for outreach.",
          )}
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">
            {t(
              "admin.charityRequests.empty",
              "No charity requests have been submitted yet.",
            )}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Charity requests by EIN</caption>
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {t("admin.charityRequests.ein", "EIN")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {t("admin.charityRequests.requests", "Requests")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {t(
                    "admin.charityRequests.latestRequester",
                    "Latest Requester",
                  )}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {t("admin.charityRequests.latestRequest", "Latest Request")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {t("admin.charityRequests.firstRequest", "First Request")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {requests.map((request) => (
                <RequestRow key={request.ein} request={request} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalCount > requests.length && (
        <p className="text-xs text-gray-500">
          {t(
            "admin.charityRequests.showing",
            "Showing {{shown}} of {{total}} unique EINs.",
            {
              shown: requests.length,
              total: totalCount,
            },
          )}
        </p>
      )}
    </main>
  );
};

export default AdminCharityRequests;
