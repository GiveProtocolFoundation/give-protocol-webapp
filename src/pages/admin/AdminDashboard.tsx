import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Users,
  Landmark,
  CheckCircle2,
  Heart,
  BarChart3,
  DollarSign,
  Activity,
  Wallet,
  ShieldCheck,
  SlidersHorizontal,
  FileSearch,
  Newspaper,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/sentry";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAdminDashboardStats,
  getAdminRecentActivity,
  getAdminAlerts,
} from "@/services/adminDashboardService";
import type {
  AdminDashboardStats,
  AdminActivityEvent,
  AdminAlert,
} from "@/types/adminDashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a number as a USD currency string. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Converts an ISO timestamp to a human-readable relative time string. */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)} days ago`;
}

/** Returns the absolute, localized date string for timestamp hover titles. */
function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type ChipTone = "success" | "warning" | "neutral" | "danger" | "info";

/** Tailwind classes for a small status chip by semantic tone. */
const CHIP_TONES: Record<ChipTone, string> = {
  success: "text-[#1b8a6b] bg-[#e6f4ef]",
  warning: "text-[#b06a12] bg-[#fbf0df]",
  neutral: "text-[#8a948f] bg-[#f1f3f2]",
  danger: "text-[#c8412b] bg-[#fbeae6]",
  info: "text-[#3a6bd0] bg-[#eaf0fb]",
};

/** Tinted icon tile + colour for an activity event type. */
function getActivityVisual(type: string): { tile: string; icon: LucideIcon } {
  switch (type) {
    case "donation":
      return { tile: "bg-[#e6f4ef] text-[#1b8a6b]", icon: DollarSign };
    case "registration":
      return { tile: "bg-[#eaf0fb] text-[#3a6bd0]", icon: Users };
    case "verification":
      return { tile: "bg-[#f3eafb] text-[#8a4bd0]", icon: CheckCircle2 };
    case "volunteer_hours":
      return { tile: "bg-[#fbf0df] text-[#b06a12]", icon: Activity };
    default:
      return { tile: "bg-[#e6f4ef] text-[#1b8a6b]", icon: LogIn };
  }
}

/** Maps an alert severity to its banner chip tone and label. */
function getSeverityChip(severity: string): {
  tone: ChipTone;
  key: string;
  fallback: string;
} {
  switch (severity) {
    case "critical":
    case "high":
      return {
        tone: "danger",
        key: "admin.dashboard.severityHigh",
        fallback: "High Priority",
      };
    case "medium":
      return {
        tone: "warning",
        key: "admin.dashboard.severityMedium",
        fallback: "Needs Attention",
      };
    default:
      return {
        tone: "info",
        key: "admin.dashboard.severityLow",
        fallback: "For Review",
      };
  }
}

/** Groups alerts by type into one summary per group. */
function groupAlerts(alerts: AdminAlert[]): Array<{
  alertType: string;
  severity: string;
  title: string;
  count: number;
  latestCreatedAt: string;
}> {
  const map = new Map<
    string,
    { severity: string; title: string; count: number; latestCreatedAt: string }
  >();
  for (const a of alerts) {
    const existing = map.get(a.alertType);
    if (existing !== undefined) {
      existing.count += 1;
      if (a.createdAt > existing.latestCreatedAt) {
        existing.latestCreatedAt = a.createdAt;
      }
      // A group is high priority as soon as any member has sat > 3 days
      if (a.severity === "high") {
        existing.severity = a.severity;
      }
    } else {
      map.set(a.alertType, {
        severity: a.severity,
        title: a.title,
        count: 1,
        latestCreatedAt: a.createdAt,
      });
    }
  }
  return Array.from(map.entries()).map(([alertType, v]) => ({
    alertType,
    ...v,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single KPI card: label + icon tile, mono value + delta chip, sub-line. */
function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta: string;
  deltaTone: ChipTone;
  sub: string;
}): React.ReactElement {
  return (
    <div className="rounded-[14px] border border-[#e4e8e6] bg-white px-[18px] pb-[15px] pt-[17px] shadow-[0_1px_2px_#0b1f1a07]">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[#6b7873]">
          {label}
        </span>
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#eef4f1]">
          <Icon size={15} strokeWidth={1.9} className="text-[#1b8a6b]" />
        </span>
      </div>
      <div className="mt-[13px] flex items-baseline gap-[9px]">
        <span className="font-mono-data text-[30px] font-semibold tracking-[-0.02em] text-[#16201c]">
          {value}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${CHIP_TONES[deltaTone]}`}
        >
          {delta}
        </span>
      </div>
      <div className="mt-[7px] text-[11.5px] text-[#8a948f]">{sub}</div>
    </div>
  );
}

/** Empty-state chart used until a donation time-series exists. */
function VolumeEmptyChart(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="relative mt-[14px] h-[150px]">
      <svg
        width="100%"
        height="150"
        viewBox="0 0 600 150"
        preserveAspectRatio="none"
        className="block"
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`grid-${i}`}
            x1={0}
            x2={600}
            y1={12 + i * 42}
            y2={12 + i * 42}
            stroke="#eef0ef"
            strokeWidth={1}
          />
        ))}
        <line
          x1={0}
          x2={600}
          y1={138}
          y2={138}
          stroke="#e0e4e2"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <div className="text-[13px] font-semibold text-[#6b7873]">
          {t("admin.dashboard.volumeEmptyTitle", "No donations recorded yet")}
        </div>
        <div className="text-[11.5px] text-[#9aa5a0]">
          {t(
            "admin.dashboard.volumeEmptySub",
            "Volume will chart here once the first gift settles",
          )}
        </div>
      </div>
    </div>
  );
}

/** Maps an alert type to the route its "Review" button should open. */
const ALERT_ROUTES: Record<string, string> = {
  pending_verification: "/admin/charities",
  expired_validation: "/admin/volunteer-validation",
  pending_validation: "/admin/volunteer-validation",
  removal_request: "/admin/donors",
  donation_flag: "/admin/donations",
};

/** One priority alert banner for a grouped alert. */
function AlertBanner({
  group,
}: {
  group: {
    alertType: string;
    severity: string;
    title: string;
    latestCreatedAt: string;
  };
}): React.ReactElement {
  const { t } = useTranslation();
  const chip = getSeverityChip(group.severity);
  return (
    <div className="flex items-center gap-4 rounded-[13px] border border-[#e4e8e6] border-l-[3px] border-l-[#e0533d] bg-white px-[18px] py-[15px] shadow-[0_1px_2px_#0b1f1a07]">
      <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-[#fbeae6]">
        <AlertTriangle size={19} strokeWidth={2} className="text-[#c8412b]" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-[9px]">
          <span
            className={`rounded-[5px] px-[7px] py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.06em] ${CHIP_TONES[chip.tone]}`}
          >
            {t(chip.key, chip.fallback)}
          </span>
          <span className="text-[14px] font-semibold text-[#16201c]">
            {group.title}
          </span>
        </div>
        <div
          className="mt-[3px] text-[12.5px] text-[#7c8884]"
          title={formatAbsoluteTime(group.latestCreatedAt)}
        >
          {t("admin.dashboard.alertOldest", "Oldest request submitted")}{" "}
          {formatRelativeTime(group.latestCreatedAt)} ·{" "}
          {t(
            "admin.dashboard.alertReviewHint",
            "review to keep onboarding moving",
          )}
        </div>
      </div>
      <Link
        to={ALERT_ROUTES[group.alertType] ?? "/admin/charities"}
        className="flex h-[34px] flex-none items-center rounded-[9px] bg-[#0e352c] px-[15px] text-[12.5px] font-semibold text-white no-underline"
      >
        {t("admin.dashboard.reviewQueue", "Review queue")}
      </Link>
    </div>
  );
}

/** A single figure in the donation-volume legend. */
function LegendItem({
  label,
  value,
  valueClassName,
  dotClass,
}: {
  label: string;
  value: string;
  valueClassName: string;
  dotClass?: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-[7px]">
      {dotClass !== undefined && (
        <span className={`h-[9px] w-[9px] rounded-sm ${dotClass}`} />
      )}
      <div>
        <div className="text-[11.5px] text-[#8a948f]">{label}</div>
        <div className={`font-mono-data font-semibold ${valueClassName}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/** Donation-volume panel with range toggle and an empty-state chart. */
function DonationVolumePanel({
  stats,
  range,
  rangeLabel,
  onRangeChange,
}: {
  stats: AdminDashboardStats;
  range: "30D" | "90D" | "YTD";
  rangeLabel: string;
  onRangeChange: (_e: React.MouseEvent<HTMLButtonElement>) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="rounded-[14px] border border-[#e4e8e6] bg-white p-5 shadow-[0_1px_2px_#0b1f1a07]">
      <div className="mb-1.5 flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold text-[#16201c]">
            {t("admin.dashboard.donationVolume", "Donation Volume")}
          </div>
          <div className="mt-0.5 text-[12px] text-[#8a948f]">
            {t(
              "admin.dashboard.donationVolumeSub",
              "{{range}} · crypto + fiat combined",
              { range: rangeLabel },
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {(["30D", "90D", "YTD"] as const).map((r) => (
            <button
              key={r}
              type="button"
              data-range={r}
              onClick={onRangeChange}
              className={
                range === r
                  ? "rounded-lg bg-[#0e352c] px-[11px] py-[5px] text-[11.5px] font-semibold text-white"
                  : "rounded-lg border border-[#e4e8e6] px-[11px] py-[5px] text-[11.5px] font-semibold text-[#6b7873]"
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <VolumeEmptyChart />

      <div className="mt-[14px] flex gap-6 border-t border-[#eef0ef] pt-[14px]">
        <LegendItem
          label={t("admin.dashboard.totalVolume", "Total volume")}
          value={formatCurrency(stats.totalVolumeUsd)}
          valueClassName="mt-[3px] text-[18px]"
        />
        <LegendItem
          label={t("admin.dashboard.crypto", "Crypto")}
          value={formatCurrency(stats.cryptoVolumeUsd)}
          valueClassName="mt-0.5 text-[15px]"
          dotClass="bg-[#1fae7f]"
        />
        <LegendItem
          label={t("admin.dashboard.fiat", "Fiat")}
          value={formatCurrency(stats.fiatVolumeUsd)}
          valueClassName="mt-0.5 text-[15px]"
          dotClass="bg-[#9fd9c4]"
        />
      </div>
    </div>
  );
}

/** A single recent-activity row. */
function ActivityRow({ evt }: { evt: AdminActivityEvent }): React.ReactElement {
  const visual = getActivityVisual(evt.eventType);
  const Icon = visual.icon;
  const hasActor = evt.actorName !== null && evt.actorName !== "";
  return (
    <div className="flex gap-[11px] border-b border-[#f1f3f2] py-[9px]">
      <span
        className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg ${visual.tile}`}
      >
        <Icon size={14} strokeWidth={1.9} />
      </span>
      <div className="flex-1 leading-[1.35]">
        <div className="text-[12.5px] text-[#2c3833]">
          {hasActor && (
            <strong className="font-semibold">{evt.actorName} </strong>
          )}
          {evt.description}
        </div>
        <div
          className="mt-0.5 text-[11px] text-[#9aa5a0]"
          title={formatAbsoluteTime(evt.eventTime)}
        >
          {formatRelativeTime(evt.eventTime)}
        </div>
      </div>
    </div>
  );
}

/** Recent-activity panel with up to five events and a footer link. */
function RecentActivityPanel({
  activity,
}: {
  activity: AdminActivityEvent[];
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col rounded-[14px] border border-[#e4e8e6] bg-white p-5 shadow-[0_1px_2px_#0b1f1a07]">
      <div className="mb-1 text-[14px] font-bold text-[#16201c]">
        {t("admin.dashboard.recentActivity", "Recent Activity")}
      </div>
      <div className="mb-[14px] text-[12px] text-[#8a948f]">
        {t(
          "admin.dashboard.activitySubtitle",
          "Platform events as they happen",
        )}
      </div>
      {activity.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center text-[12.5px] text-[#9aa5a0]">
          {t("admin.dashboard.noRecentActivity", "No recent activity.")}
        </div>
      ) : (
        activity
          .slice(0, 5)
          .map((evt) => <ActivityRow key={evt.id} evt={evt} />)
      )}
      <Link
        to="/admin/reports"
        className="mt-[13px] text-center text-[12.5px] font-semibold text-[#1b8a6b] no-underline"
      >
        {t("admin.dashboard.viewAllActivity", "View all activity")} →
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

interface QuickAction {
  to: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: "/admin/reports",
    titleKey: "admin.actions.viewReports",
    titleFallback: "View Reports",
    descKey: "admin.actions.viewReportsDesc",
    descFallback: "Generate detailed analytics",
    icon: BarChart3,
  },
  {
    to: "/admin/charities",
    titleKey: "admin.actions.manageCharities",
    titleFallback: "Manage Charities",
    descKey: "admin.actions.manageCharitiesDesc",
    descFallback: "Review and approve organizations",
    icon: Landmark,
  },
  {
    to: "/admin/donations",
    titleKey: "admin.actions.donationMonitoring",
    titleFallback: "Donation Monitoring",
    descKey: "admin.actions.donationMonitoringDesc",
    descFallback: "Monitor, flag, and report on donations",
    icon: DollarSign,
  },
  {
    to: "/admin/impact-metrics",
    titleKey: "admin.actions.manageImpactMetrics",
    titleFallback: "Manage Impact Metrics",
    descKey: "admin.actions.manageImpactMetricsDesc",
    descFallback: "Configure impact calculator data",
    icon: Activity,
  },
  {
    to: "/admin/portfolio-funds",
    titleKey: "admin.actions.portfolioFunds",
    titleFallback: "Portfolio Funds",
    descKey: "admin.actions.portfolioFundsDesc",
    descFallback: "Create and manage curated giving portfolios",
    icon: Wallet,
  },
  {
    to: "/admin/content-moderation",
    titleKey: "admin.actions.contentModeration",
    titleFallback: "Content Moderation",
    descKey: "admin.actions.contentModerationDesc",
    descFallback: "Hide, flag, and review opportunities and causes",
    icon: ShieldCheck,
  },
  {
    to: "/admin/charity-requests",
    titleKey: "admin.actions.charityRequests",
    titleFallback: "Charity Requests",
    descKey: "admin.actions.charityRequestsDesc",
    descFallback: "Review donor requests for unclaimed charities",
    icon: FileSearch,
  },
  {
    to: "/admin/settings",
    titleKey: "admin.actions.systemSettings",
    titleFallback: "System Settings",
    descKey: "admin.actions.systemSettingsDesc",
    descFallback: "Configure platform parameters",
    icon: SlidersHorizontal,
  },
  {
    to: "/admin/platform-news",
    titleKey: "admin.actions.platformNews",
    titleFallback: "Platform News",
    descKey: "admin.actions.platformNewsDesc",
    descFallback: "Manage news items on the browse page",
    icon: Newspaper,
  },
];

/** A single quick-action shortcut card. */
function QuickActionCard({
  action,
}: {
  action: QuickAction;
}): React.ReactElement {
  const { t } = useTranslation();
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      className="flex flex-col gap-[11px] rounded-[13px] border border-[#e4e8e6] bg-white p-4 text-inherit no-underline shadow-[0_1px_2px_#0b1f1a07] transition-colors hover:border-[#1fae7f]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eef4f1]">
        <Icon size={17} strokeWidth={1.9} className="text-[#1b8a6b]" />
      </span>
      <div>
        <div className="text-[13.5px] font-semibold text-[#16201c]">
          {t(action.titleKey, action.titleFallback)}
        </div>
        <div className="mt-[3px] text-[11.5px] leading-[1.35] text-[#8a948f]">
          {t(action.descKey, action.descFallback)}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/** Admin dashboard: platform health KPIs, activity feed, and quick actions. */
const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"30D" | "90D" | "YTD">("30D");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData, alertsData] = await Promise.all([
        getAdminDashboardStats(),
        getAdminRecentActivity(1, 10),
        getAdminAlerts(),
      ]);

      setStats(statsData);
      setActivity(activityData.events);
      setAlerts(alertsData);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard data.";
      setError(msg);
      trackEvent("admin_dashboard_error", { error: msg, userId: user?.id });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
    trackEvent("admin_dashboard_viewed", { userId: user?.id });
  }, [user?.id, fetchAll]);

  const handleRangeChange = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const value = e.currentTarget.dataset.range as "30D" | "90D" | "YTD";
      if (value) setRange(value);
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="max-w-md rounded-[14px] border border-[#e4e8e6] bg-white p-6 text-center shadow-[0_1px_2px_#0b1f1a07]">
          <h2 className="mb-3 text-[17px] font-bold text-[#c8412b]">
            {t("admin.dashboard.errorTitle", "Error Loading Dashboard")}
          </h2>
          <p className="mb-4 text-[13px] text-[#6b7873]">{error}</p>
          <button
            onClick={fetchAll}
            className="rounded-[9px] bg-[#0e352c] px-4 py-2 text-[13px] font-semibold text-white"
            aria-label={t("common.retry", "Retry")}
          >
            {t("common.retry", "Retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const newDonors = stats.trends.registrations30d;
  const verifiedPct =
    stats.totalCharities > 0
      ? Math.round((stats.verifiedCharities / stats.totalCharities) * 100)
      : 0;
  const alertGroups = groupAlerts(alerts);
  const rangeLabel =
    range === "30D"
      ? t("admin.dashboard.range30d", "Last 30 days")
      : range === "90D"
        ? t("admin.dashboard.range90d", "Last 90 days")
        : t("admin.dashboard.rangeYtd", "Year to date");

  return (
    <div className="flex w-full max-w-[1240px] flex-col gap-[22px] px-8 pb-12 pt-[26px]">
      {/* Priority alert banners — one per alert group, only when present */}
      {alertGroups.map((group) => (
        <AlertBanner key={group.alertType} group={group} />
      ))}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("admin.stats.totalDonors", "Total Donors")}
          value={stats.totalDonors.toLocaleString()}
          icon={Users}
          delta={newDonors > 0 ? `+${newDonors}` : "—"}
          deltaTone={newDonors > 0 ? "success" : "neutral"}
          sub={t(
            "admin.dashboard.kpiDonorsSub",
            "{{count}} new in last 30 days",
            {
              count: newDonors,
            },
          )}
        />
        <KpiCard
          label={t("admin.stats.charities", "Charities")}
          value={stats.totalCharities.toLocaleString()}
          icon={Landmark}
          delta={t("admin.dashboard.kpiPending", "{{count}} pending", {
            count: stats.pendingCharities,
          })}
          deltaTone={stats.pendingCharities > 0 ? "warning" : "neutral"}
          sub={t(
            "admin.dashboard.awaitingVerification",
            "Awaiting verification",
          )}
        />
        <KpiCard
          label={t("admin.stats.verifiedCharities", "Verified Charities")}
          value={stats.verifiedCharities.toLocaleString()}
          icon={CheckCircle2}
          delta={`${verifiedPct}%`}
          deltaTone={verifiedPct > 0 ? "success" : "neutral"}
          sub={t(
            "admin.dashboard.kpiVerifiedSub",
            "of {{total}} total approved",
            {
              total: stats.totalCharities,
            },
          )}
        />
        <KpiCard
          label={t("admin.stats.activeVolunteers", "Active Volunteers")}
          value={stats.totalVolunteers.toLocaleString()}
          icon={Heart}
          delta={stats.totalVolunteers > 0 ? `${stats.totalVolunteers}` : "—"}
          deltaTone="neutral"
          sub={
            stats.totalVolunteers > 0
              ? t("admin.dashboard.kpiVolunteersActive", "Active sign-ups")
              : t("admin.dashboard.kpiVolunteersSub", "No active sign-ups")
          }
        />
      </div>

      {/* Donation volume + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <DonationVolumePanel
          stats={stats}
          range={range}
          rangeLabel={rangeLabel}
          onRangeChange={handleRangeChange}
        />
        <RecentActivityPanel activity={activity} />
      </div>

      {/* Quick actions */}
      <div>
        <div className="mb-3 text-[14px] font-bold text-[#16201c]">
          {t("admin.dashboard.quickActions", "Quick Actions")}
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.to + action.titleKey}
              action={action}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
