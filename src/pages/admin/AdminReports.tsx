import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getDonationSummary } from "@/services/adminDonationService";
import { getAdminAuditLog } from "@/services/adminAuditService";
import {
  getCharityGrowthReport,
  getDonorActivityReport,
  getVolunteerReport,
  getPlatformHealthSummary,
  charityGrowthToCsv,
  donorActivityToCsv,
  volunteerReportToCsv,
  platformHealthToCsv,
  auditLogToCsv,
  donationSummaryToCsv,
  downloadReport,
} from "@/services/adminReportsService";
import type {
  CharityGrowthRow,
  DonorActivityRow,
  VolunteerReportRow,
  PlatformHealthRow,
} from "@/types/adminReports";
import type {
  AdminAuditLogEntry,
  AdminAuditLogFilters,
} from "@/types/adminAudit";
import type {
  AdminDonationSummaryRow,
  DonationSummaryGroupBy,
} from "@/types/adminDonation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportTab =
  | "donations"
  | "charity-growth"
  | "donor-activity"
  | "volunteer-hours"
  | "audit-trail"
  | "platform-health";

type DatePreset = "7d" | "30d" | "90d" | "custom";

interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface PresetProps {
  preset: DatePreset;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Computes ISO date strings for a preset period ending today. */
function computeDateRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): DateRange {
  if (preset === "custom") {
    return {
      dateFrom: customFrom ? `${customFrom}T00:00:00Z` : "",
      dateTo: customTo ? `${customTo}T23:59:59Z` : "",
    };
  }
  let days: number;
  if (preset === "7d") {
    days = 7;
  } else if (preset === "30d") {
    days = 30;
  } else {
    days = 90;
  }
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    dateFrom: `${from.toISOString().slice(0, 10)}T00:00:00Z`,
    dateTo: `${to.toISOString().slice(0, 10)}T23:59:59Z`,
  };
}

/** Formats an ISO date string to a short locale date. */
function fmtDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────

/** Simple inline SVG bar chart for trend visualization. */
function MiniBarChart({
  data,
}: Readonly<{
  data: { label: string; value: number }[];
}>): React.ReactElement {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 36;
  const gap = 6;
  const chartH = 64;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg
      width={totalW}
      height={chartH + 18}
      className="overflow-visible"
      aria-label="Trend chart"
    >
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.value / max) * chartH));
        const x = i * (barW + gap);
        const y = chartH - barH;
        return (
          <g key={`${d.label}-${d.value}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="#10b981"
              rx={2}
            />
            <text
              x={x + barW / 2}
              y={chartH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

const TAB_LABELS: { id: ReportTab; label: string }[] = [
  { id: "donations", label: "Donations" },
  { id: "charity-growth", label: "Charity Growth" },
  { id: "donor-activity", label: "Donor Activity" },
  { id: "volunteer-hours", label: "Volunteer Hours" },
  { id: "audit-trail", label: "Audit Trail" },
  { id: "platform-health", label: "Platform Health" },
];

/** Tab navigation bar for switching between report types */
function TabBar({
  active,
  onSelect,
}: Readonly<{
  active: ReportTab;
  onSelect: (_tab: ReportTab) => void;
}>): React.ReactElement {
  const handleTabClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tab = e.currentTarget.dataset.tab as ReportTab;
      onSelect(tab);
    },
    [onSelect],
  );

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
      {TAB_LABELS.map(({ id, label }) => (
        <button
          key={id}
          data-tab={id}
          onClick={handleTabClick}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            active === id
              ? "bg-white border border-b-white border-gray-200 text-emerald-700 -mb-px"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── DateRangeSelector ────────────────────────────────────────────────────────

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
];

/** Date range selector with preset periods and custom date inputs */
function DateRangeSelector({
  preset,
  customFrom,
  customTo,
  onPreset,
  onCustomFrom,
  onCustomTo,
}: Readonly<{
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onPreset: (_p: DatePreset) => void;
  onCustomFrom: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onCustomTo: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}>): React.ReactElement {
  const handlePresetClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const preset = e.currentTarget.dataset.preset as DatePreset;
      onPreset(preset);
    },
    [onPreset],
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {PRESETS.map(({ id, label }) => (
        <button
          key={id}
          data-preset={id}
          onClick={handlePresetClick}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            preset === id
              ? "bg-emerald-600 text-white border-emerald-600"
              : "text-gray-600 border-gray-300 hover:border-emerald-400"
          }`}
        >
          {label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={customFrom}
            onChange={onCustomFrom}
            aria-label="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={customTo}
            onChange={onCustomTo}
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}

// ─── Shared: EmptyState + Pagination ─────────────────────────────────────────

/**
 * Renders a centered placeholder message for empty report tables.
 * @param props - Component props.
 * @param props.message - Message text to display.
 * @returns The placeholder paragraph element.
 */
function EmptyState({
  message,
}: Readonly<{ message: string }>): React.ReactElement {
  return <p className="text-center py-8 text-gray-500 text-sm">{message}</p>;
}

/** Pagination controls for paginated report tables */
function ReportPagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: Readonly<{
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}>): React.ReactElement {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

// ─── Donations Tab ────────────────────────────────────────────────────────────

/**
 * Renders the donations report tab with grouping controls (day/week/month) and a paginated table.
 * @param props - Date range bounds for the report.
 * @param props.dateFrom - ISO date string lower bound.
 * @param props.dateTo - ISO date string upper bound.
 * @returns The donations tab element.
 */
function DonationsTab({
  dateFrom,
  dateTo,
}: Readonly<DateRange>): React.ReactElement {
  const [rows, setRows] = useState<AdminDonationSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<DonationSummaryGroupBy>("month");

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    getDonationSummary(dateFrom, dateTo, groupBy).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [dateFrom, dateTo, groupBy]);

  const handleGroupByChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGroupBy(e.target.value as DonationSummaryGroupBy);
    },
    [],
  );

  const handleExport = useCallback(() => {
    downloadReport(
      donationSummaryToCsv(rows),
      `donation-summary-${dateFrom.slice(0, 10)}-to-${dateTo.slice(0, 10)}.csv`,
    );
  }, [rows, dateFrom, dateTo]);

  const chartData = rows.slice(0, 12).map((r) => ({
    label: r.groupKey.slice(0, 7),
    value: r.totalAmountUsd,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="group-by-select" className="text-sm text-gray-600">
          Group by:
        </label>
        <select
          id="group-by-select"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={groupBy}
          onChange={handleGroupByChange}
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="charity">Charity</option>
          <option value="payment_method">Payment Method</option>
        </select>
        {rows.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={handleExport}
          >
            Export CSV
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState message="No donation data for the selected period." />
      )}

      {!loading && rows.length > 0 && chartData.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <MiniBarChart data={chartData} />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="w-full text-left text-sm overflow-x-auto">
          <caption className="sr-only">Donation summary report</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Group
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Method
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total (USD)
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Count
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Charity
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.groupKey}-${row.paymentMethod}-${row.charityId}`}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-xs">{row.groupKey}</td>
                <td className="px-4 py-2">{row.paymentMethod}</td>
                <td className="px-4 py-2 font-medium">
                  ${row.totalAmountUsd.toFixed(2)}
                </td>
                <td className="px-4 py-2">{row.donationCount}</td>
                <td className="px-4 py-2 text-gray-600">
                  {row.charityName ?? row.charityId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Charity Growth Tab ───────────────────────────────────────────────────────

/**
 * Renders the charity growth report tab summarizing new charity onboarding over time.
 * @param props - Date range bounds for the report.
 * @param props.dateFrom - ISO date string lower bound.
 * @param props.dateTo - ISO date string upper bound.
 * @returns The charity growth tab element.
 */
function CharityGrowthTab({
  dateFrom,
  dateTo,
}: Readonly<DateRange>): React.ReactElement {
  const [rows, setRows] = useState<CharityGrowthRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    getCharityGrowthReport(dateFrom, dateTo).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const handleExport = useCallback(() => {
    downloadReport(
      charityGrowthToCsv(rows),
      `charity-growth-${dateFrom.slice(0, 10)}-to-${dateTo.slice(0, 10)}.csv`,
    );
  }, [rows, dateFrom, dateTo]);

  const chartData = rows.map((r) => ({
    label: r.period.slice(0, 7),
    value: r.newRegistrations,
  }));

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState message="No charity growth data for the selected period." />
      )}

      {!loading && rows.length > 0 && chartData.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <MiniBarChart data={chartData} />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="w-full text-left text-sm overflow-x-auto">
          <caption className="sr-only">Charity growth report</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Period
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Approved
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rejected
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Active
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Suspended
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.period}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-xs">{row.period}</td>
                <td className="px-4 py-2">{row.newRegistrations}</td>
                <td className="px-4 py-2 text-green-700">{row.approved}</td>
                <td className="px-4 py-2 text-red-700">{row.rejected}</td>
                <td className="px-4 py-2">{row.active}</td>
                <td className="px-4 py-2 text-gray-500">{row.suspended}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Donor Activity Tab ───────────────────────────────────────────────────────

/**
 * Renders the donor activity report tab summarizing donor engagement metrics over time.
 * @param props - Date range bounds for the report.
 * @param props.dateFrom - ISO date string lower bound.
 * @param props.dateTo - ISO date string upper bound.
 * @returns The donor activity tab element.
 */
function DonorActivityTab({
  dateFrom,
  dateTo,
}: Readonly<DateRange>): React.ReactElement {
  const [rows, setRows] = useState<DonorActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    getDonorActivityReport(dateFrom, dateTo).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const handleExport = useCallback(() => {
    downloadReport(
      donorActivityToCsv(rows),
      `donor-activity-${dateFrom.slice(0, 10)}-to-${dateTo.slice(0, 10)}.csv`,
    );
  }, [rows, dateFrom, dateTo]);

  const chartData = rows.map((r) => ({
    label: r.period.slice(0, 7),
    value: r.newDonors,
  }));

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState message="No donor activity data for the selected period." />
      )}

      {!loading && rows.length > 0 && chartData.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <MiniBarChart data={chartData} />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="w-full text-left text-sm overflow-x-auto">
          <caption className="sr-only">Donor activity report</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Period
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New Donors
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Active
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dormant
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Avg Donation
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Repeat Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.period}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-xs">{row.period}</td>
                <td className="px-4 py-2 font-medium">{row.newDonors}</td>
                <td className="px-4 py-2 text-green-700">{row.activeDonors}</td>
                <td className="px-4 py-2 text-gray-500">{row.dormantDonors}</td>
                <td className="px-4 py-2">${row.avgDonationUsd.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {(row.repeatDonorRate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Volunteer Hours Tab ──────────────────────────────────────────────────────

/**
 * Renders the volunteer hours report tab summarizing validated and pending hours over time.
 * @param props - Date range bounds for the report.
 * @param props.dateFrom - ISO date string lower bound.
 * @param props.dateTo - ISO date string upper bound.
 * @returns The volunteer hours tab element.
 */
function VolunteerHoursTab({
  dateFrom,
  dateTo,
}: Readonly<DateRange>): React.ReactElement {
  const [rows, setRows] = useState<VolunteerReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    getVolunteerReport(dateFrom, dateTo).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const handleExport = useCallback(() => {
    downloadReport(
      volunteerReportToCsv(rows),
      `volunteer-hours-${dateFrom.slice(0, 10)}-to-${dateTo.slice(0, 10)}.csv`,
    );
  }, [rows, dateFrom, dateTo]);

  const chartData = rows.map((r) => ({
    label: r.period.slice(0, 7),
    value: r.hoursValidated,
  }));

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState message="No volunteer data for the selected period." />
      )}

      {!loading && rows.length > 0 && chartData.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <MiniBarChart data={chartData} />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <table className="w-full text-left text-sm overflow-x-auto">
          <caption className="sr-only">Volunteer hours report</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Period
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Submitted
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Validated
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rejected
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rejection Rate
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Avg. Days
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.period}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-xs">{row.period}</td>
                <td className="px-4 py-2">{row.hoursSubmitted}</td>
                <td className="px-4 py-2 text-green-700">
                  {row.hoursValidated}
                </td>
                <td className="px-4 py-2 text-red-700">{row.hoursRejected}</td>
                <td className="px-4 py-2">
                  {(row.rejectionRate * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-2">
                  {row.avgValidationDays.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Audit Trail Tab ──────────────────────────────────────────────────────────

/**
 * Renders the audit trail report tab listing administrative actions within the date range.
 * @param props - Date range bounds for the report.
 * @param props.dateFrom - ISO date string lower bound.
 * @param props.dateTo - ISO date string upper bound.
 * @returns The audit trail tab element.
 */
function AuditTrailTab({
  dateFrom,
  dateTo,
}: Readonly<DateRange>): React.ReactElement {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchPage = useCallback((p: number, from: string, to: string) => {
    if (!from || !to) return;
    setLoading(true);
    const filters: AdminAuditLogFilters = {
      dateFrom: from,
      dateTo: to,
      page: p,
      limit: 50,
    };
    getAdminAuditLog(filters).then((result) => {
      setEntries(result.entries);
      setTotalPages(result.totalPages);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPage(1, dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchPage]);

  const handlePrev = useCallback(() => {
    const next = Math.max(1, page - 1);
    setPage(next);
    fetchPage(next, dateFrom, dateTo);
  }, [page, dateFrom, dateTo, fetchPage]);

  const handleNext = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, dateFrom, dateTo);
  }, [page, dateFrom, dateTo, fetchPage]);

  const handleExport = useCallback(() => {
    downloadReport(
      auditLogToCsv(entries),
      `audit-trail-${dateFrom.slice(0, 10)}-to-${dateTo.slice(0, 10)}.csv`,
    );
  }, [entries, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && entries.length === 0 && (
        <EmptyState message="No audit entries for the selected period." />
      )}

      {!loading && entries.length > 0 && (
        <table className="w-full text-left text-sm overflow-x-auto">
          <caption className="sr-only">Audit trail entries</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Action
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Entity
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Entity ID
              </th>
              <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Admin
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {fmtDate(entry.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {entry.actionType.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600 capitalize">
                  {entry.entityType.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  {entry.entityId.slice(0, 8)}…
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  {entry.adminUserId.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ReportPagination
        page={page}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}

// ─── Platform Health Tab ──────────────────────────────────────────────────────

/**
 * Renders the platform health report tab summarizing system-level metrics.
 * @param props - Component props.
 * @param props.preset - Active time-range preset that scopes the report query.
 * @returns The platform health tab element.
 */
function PlatformHealthTab({
  preset,
}: Readonly<PresetProps>): React.ReactElement {
  const [rows, setRows] = useState<PlatformHealthRow[]>([]);
  const [loading, setLoading] = useState(false);

  let period: string;
  if (preset === "7d") {
    period = "7d";
  } else if (preset === "30d") {
    period = "30d";
  } else {
    period = "90d";
  }

  useEffect(() => {
    setLoading(true);
    getPlatformHealthSummary(period).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [period]);

  const handleExport = useCallback(() => {
    downloadReport(platformHealthToCsv(rows), `platform-health-${period}.csv`);
  }, [rows, period]);

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState message="No platform health data available." />
      )}

      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <div
              key={row.metric}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {row.metric.replaceAll("_", " ")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {row.value.toLocaleString()}{" "}
                <span className="text-sm font-normal text-gray-500">
                  {row.unit}
                </span>
              </p>
              {(row.trend7d !== null || row.trend30d !== null) && (
                <p className="text-xs text-gray-400 mt-1">
                  {row.trend7d !== null &&
                    `7d: ${row.trend7d > 0 ? "+" : ""}${row.trend7d}`}
                  {row.trend7d !== null && row.trend30d !== null && " · "}
                  {row.trend30d !== null &&
                    `30d: ${row.trend30d > 0 ? "+" : ""}${row.trend30d}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AdminReports (main page) ─────────────────────────────────────────────────

/**
 * Admin reporting hub with six tabbed report types: Donations, Charity Growth,
 * Donor Activity, Volunteer Hours, Audit Trail, and Platform Health.
 * All tabs support date-range filtering and CSV export.
 *
 * @returns The AdminReports page element
 */
const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("donations");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { dateFrom, dateTo } = computeDateRange(
    datePreset,
    customFrom,
    customTo,
  );

  const handleTabSelect = useCallback((tab: ReportTab) => {
    setActiveTab(tab);
  }, []);

  const handlePreset = useCallback((p: DatePreset) => {
    setDatePreset(p);
  }, []);

  const handleCustomFrom = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomFrom(e.target.value);
    },
    [],
  );

  const handleCustomTo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomTo(e.target.value);
    },
    [],
  );

  const dateRange: DateRange = { dateFrom, dateTo };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        {dateFrom && dateTo && (
          <span className="text-sm text-gray-400">
            {fmtDate(dateFrom)} — {fmtDate(dateTo)}
          </span>
        )}
      </div>

      <Card className="p-6">
        <DateRangeSelector
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={handlePreset}
          onCustomFrom={handleCustomFrom}
          onCustomTo={handleCustomTo}
        />

        <TabBar active={activeTab} onSelect={handleTabSelect} />

        {activeTab === "donations" && <DonationsTab {...dateRange} />}
        {activeTab === "charity-growth" && <CharityGrowthTab {...dateRange} />}
        {activeTab === "donor-activity" && <DonorActivityTab {...dateRange} />}
        {activeTab === "volunteer-hours" && (
          <VolunteerHoursTab {...dateRange} />
        )}
        {activeTab === "audit-trail" && <AuditTrailTab {...dateRange} />}
        {activeTab === "platform-health" && (
          <PlatformHealthTab preset={datePreset} />
        )}
      </Card>
    </div>
  );
};

export default AdminReports;
