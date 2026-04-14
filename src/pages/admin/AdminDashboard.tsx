import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/sentry";
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
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Converts an ISO timestamp to a human-readable relative time string. */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Returns a display label and colour class for a given activity event type. */
function getActivityMeta(type: string): { label: string; colourClass: string } {
  switch (type) {
    case "donation":
      return { label: "Donation", colourClass: "text-green-700 bg-green-100" };
    case "registration":
      return {
        label: "Registration",
        colourClass: "text-blue-700 bg-blue-100",
      };
    case "verification":
      return {
        label: "Verification",
        colourClass: "text-purple-700 bg-purple-100",
      };
    case "volunteer_hours":
      return {
        label: "Volunteer Hours",
        colourClass: "text-orange-700 bg-orange-100",
      };
    default:
      return { label: "Activity", colourClass: "text-gray-700 bg-gray-100" };
  }
}

/** Returns colour class for alert severity. */
function getAlertSeverityClass(severity: string): string {
  switch (severity) {
    case "high":
      return "border-l-red-500 bg-red-50";
    case "medium":
      return "border-l-yellow-500 bg-yellow-50";
    default:
      return "border-l-blue-500 bg-blue-50";
  }
}

/** Returns text colour class for alert severity badge. */
function getAlertBadgeClass(severity: string): string {
  switch (severity) {
    case "high":
      return "text-red-700 bg-red-100";
    case "medium":
      return "text-yellow-700 bg-yellow-100";
    default:
      return "text-blue-700 bg-blue-100";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** KPI card showing a stat with an optional 7d / 30d trend. */
function StatCard({
  label,
  value,
  trend7d,
  trend30d,
  trendLabel,
}: {
  label: string;
  value: string | number;
  trend7d?: number;
  trend30d?: number;
  trendLabel?: string;
}): React.ReactElement {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {(trend7d !== undefined || trend30d !== undefined) && (
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          {trend7d !== undefined && (
            <span>
              <span className="font-semibold text-gray-700">
                {trend7d.toLocaleString()}
              </span>{" "}
              last 7d
            </span>
          )}
          {trend30d !== undefined && (
            <span>
              <span className="font-semibold text-gray-700">
                {trend30d.toLocaleString()}
              </span>{" "}
              last 30d
            </span>
          )}
          {trendLabel && <span className="text-gray-400">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}

/** Single activity entry row. */
function ActivityItem({
  activity,
}: {
  activity: AdminActivityEvent;
}): React.ReactElement {
  const meta = getActivityMeta(activity.eventType);
  return (
    <div className="flex items-center justify-between p-4 mb-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${meta.colourClass}`}
        >
          {meta.label}
        </span>
        <p className="font-medium text-gray-900 mt-1 truncate">
          {activity.description}
        </p>
        <p className="text-sm text-gray-500">
          {formatRelativeTime(activity.eventTime)}
        </p>
      </div>
      {activity.amountUsd != null && (
        <p className="font-semibold text-green-600 text-right ml-4 shrink-0">
          {formatCurrency(activity.amountUsd)}
        </p>
      )}
    </div>
  );
}

/** Single alert row. */
function AlertItem({ alert }: { alert: AdminAlert }): React.ReactElement {
  return (
    <div
      className={`flex items-start gap-3 p-4 mb-3 border-l-4 rounded-lg ${getAlertSeverityClass(alert.severity)}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${getAlertBadgeClass(alert.severity)}`}
          >
            {alert.severity}
          </span>
          <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
        </div>
        <p className="text-sm text-gray-600 truncate">{alert.description}</p>
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(alert.createdAt)}
        </p>
      </div>
    </div>
  );
}

/** Quick action button with title and description text. */
function QuickActionButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick?: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="p-4 border rounded-lg hover:bg-gray-50 text-left"
    >
      <span className="font-medium block mb-1">{title}</span>
      <span className="text-sm text-gray-500 block">{description}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/** Admin dashboard page displaying real KPIs, recent activity, and alerts. */
const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData, alertsData] = await Promise.all([
        getAdminDashboardStats(),
        getAdminRecentActivity(1, 10),
        getAdminAlerts(),
      ]);

      if (!statsData) {
        throw new Error("Failed to load dashboard statistics from Supabase.");
      }

      setStats(statsData);
      setActivity(activityData.events);
      setAlerts(alertsData);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard data.";
      setError(msg);
      trackEvent("admin_dashboard_error", {
        error: msg,
        userId: user?.id,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
    trackEvent("admin_dashboard_viewed", { userId: user?.id });
  }, [user?.id, fetchAll]);

  const handleNavigateImpactMetrics = useCallback(() => {
    navigate("/admin/impact-metrics");
  }, [navigate]);

  const handleNavigateCharities = useCallback(() => {
    navigate("/admin/charities");
  }, [navigate]);

  const handleNavigateDonations = useCallback(() => {
    navigate("/admin/donations");
  }, [navigate]);

  const handleNavigateReports = useCallback(() => {
    navigate("/admin/reports");
  }, [navigate]);

  const handleNavigateSettings = useCallback(() => {
    navigate("/admin/settings");
  }, [navigate]);

  const handleNavigateContentModeration = useCallback(() => {
    navigate("/admin/content-moderation");
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAll}
            className="bg-blue-600 text-gray-900 px-4 py-2 rounded hover:bg-blue-700"
            aria-label="Retry loading dashboard data"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={fetchAll}
          className="bg-blue-600 text-gray-900 px-4 py-2 rounded hover:bg-blue-700"
          aria-label="Refresh dashboard data"
        >
          Refresh
        </button>
      </div>

      {/* Alerts panel */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Alerts
            <span className="ml-2 text-sm font-normal text-red-600">
              ({alerts.length} pending)
            </span>
          </h2>
          {alerts.map((alert) => (
            <AlertItem
              key={`${alert.alertType}-${alert.entityId}-${alert.createdAt}`}
              alert={alert}
            />
          ))}
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Donors"
          value={stats.totalDonors.toLocaleString()}
          trend7d={stats.trends.registrations7d}
          trend30d={stats.trends.registrations30d}
          trendLabel="new registrations"
        />

        <StatCard
          label="Charities"
          value={stats.totalCharities.toLocaleString()}
          trend7d={stats.pendingCharities}
          trendLabel="pending verification"
        />

        <StatCard
          label="Verified Charities"
          value={stats.verifiedCharities.toLocaleString()}
        />

        <StatCard
          label="Active Volunteers"
          value={stats.totalVolunteers.toLocaleString()}
        />

        <StatCard
          label="Total Donation Volume"
          value={formatCurrency(stats.totalVolumeUsd)}
          trend7d={stats.trends.donations7d}
          trend30d={stats.trends.donations30d}
          trendLabel="donations"
        />

        <StatCard
          label="Crypto Volume"
          value={formatCurrency(stats.cryptoVolumeUsd)}
        />

        <StatCard
          label="Fiat Volume"
          value={formatCurrency(stats.fiatVolumeUsd)}
        />
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity.</p>
        ) : (
          activity.map((evt) => <ActivityItem key={evt.id} activity={evt} />)
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            title="View Reports"
            description="Generate detailed analytics"
            onClick={handleNavigateReports}
          />
          <QuickActionButton
            title="Manage Charities"
            description="Review and approve organizations"
            onClick={handleNavigateCharities}
          />
          <QuickActionButton
            title="System Settings"
            description="Configure platform parameters"
            onClick={handleNavigateSettings}
          />
          <QuickActionButton
            title="Manage Impact Metrics"
            description="Configure impact calculator data"
            onClick={handleNavigateImpactMetrics}
          />
          <QuickActionButton
            title="Donation Monitoring"
            description="Monitor, flag, and report on donations"
            onClick={handleNavigateDonations}
          />
          <QuickActionButton
            title="Content Moderation"
            description="Hide, flag, and review opportunities and causes"
            onClick={handleNavigateContentModeration}
          />
        </div>
      </Card>
    </main>
  );
};

export default AdminDashboard;
