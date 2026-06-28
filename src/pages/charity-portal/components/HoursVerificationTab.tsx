import React, { useState, useCallback, useMemo } from "react";
import { Clock, Download, CheckCircle, X, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/utils/date";
import { useTranslation } from "@/hooks/useTranslation";
import { ValidationQueueDashboard } from "@/components/charity/validation";

interface VolunteerHours {
  id: string;
  volunteer_id: string;
  volunteerName: string;
  hours: number;
  date_performed: string;
  description: string;
}

interface HoursVerificationTabProps {
  pendingHours: VolunteerHours[];
  profileId: string;
  onVerify: (_hoursId: string) => void;
  onReject: (_hoursId: string) => void;
  onExport: () => void;
}

type ViewMode = "all" | "formal" | "self-reported";

interface VolunteerHourCardProps {
  hours: VolunteerHours;
  hoursLabel: string;
  verifyLabel: string;
  rejectLabel: string;
  onVerify: (_hoursId: string) => void;
  onReject: (_hoursId: string) => void;
}

/**
 * Card component for displaying a single volunteer hour entry
 */
const VolunteerHourCard: React.FC<VolunteerHourCardProps> = ({
  hours,
  hoursLabel,
  verifyLabel,
  rejectLabel,
  onVerify,
  onReject,
}) => {
  const handleVerify = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const hoursId = e.currentTarget.dataset.id;
      if (hoursId) onVerify(hoursId);
    },
    [onVerify],
  );

  const handleReject = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const hoursId = e.currentTarget.dataset.id;
      if (hoursId) onReject(hoursId);
    },
    [onReject],
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-5 flex justify-between items-start hover:shadow-sm transition-shadow">
      <div className="flex-grow pr-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {hours.volunteerName}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span className="font-medium">
            {hours.hours} {hoursLabel}
          </span>
          <span className="text-gray-400">|</span>
          {formatDate(hours.date_performed)}
        </p>
        {Boolean(hours.description) && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 rounded-lg p-3 mt-2">
            {hours.description}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          className="flex items-center gap-2"
          data-id={hours.id}
          onClick={handleVerify}
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          {verifyLabel}
        </Button>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          data-id={hours.id}
          onClick={handleReject}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {rejectLabel}
        </Button>
      </div>
    </div>
  );
};

/**
 * Unified tab for verifying both formal volunteer hours and self-reported hours
 */
export const HoursVerificationTab: React.FC<HoursVerificationTabProps> = ({
  pendingHours,
  profileId,
  onVerify,
  onReject,
  onExport,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const handleViewAll = useCallback(() => setViewMode("all"), []);
  const handleViewFormal = useCallback(() => setViewMode("formal"), []);
  const handleViewSelfReported = useCallback(
    () => setViewMode("self-reported"),
    [],
  );

  const filterButtonClass = useCallback(
    (mode: ViewMode) =>
      `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        viewMode === mode
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
      }`,
    [viewMode],
  );

  const totalPending = useMemo(
    () => pendingHours.length,
    [pendingHours.length],
  );

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("volunteer.hoursVerification", "Hours Verification")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              "volunteer.hoursVerificationDescription",
              "Review and verify volunteer hour submissions",
            )}
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={handleViewAll}
            className={filterButtonClass("all")}
          >
            {t("common.all", "All")}
          </button>
          <button
            type="button"
            onClick={handleViewFormal}
            className={filterButtonClass("formal")}
          >
            {t("volunteer.formalHours", "Logged Hours")}
            {totalPending > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                {totalPending}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleViewSelfReported}
            className={filterButtonClass("self-reported")}
          >
            {t("volunteer.selfReported", "Self-Reported")}
          </button>
        </div>
      </div>

      {/* Formal Volunteer Hours Section */}
      {(viewMode === "all" || viewMode === "formal") && (
        <section>
          {viewMode === "all" && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              {t("volunteer.loggedHours", "Logged Volunteer Hours")}
            </h3>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(
                  "volunteer.loggedHoursDescription",
                  "Hours logged by volunteers through your opportunities",
                )}
              </p>
              <Button
                variant="secondary"
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 transition-all"
                onClick={onExport}
              >
                <Download className="h-4 w-4 text-emerald-600" />
                {t("contributions.export", "Export")}
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {pendingHours.length > 0 ? (
                pendingHours.map((hours) => (
                  <VolunteerHourCard
                    key={hours.id}
                    hours={hours}
                    hoursLabel={t("volunteer.hours", "hours")}
                    verifyLabel={t("volunteer.verify", "Verify")}
                    rejectLabel={t("volunteer.reject", "Reject")}
                    onVerify={onVerify}
                    onReject={onReject}
                  />
                ))
              ) : (
                <div className="py-12 text-center">
                  <span className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-4">
                    <Clock
                      className="h-7 w-7 text-emerald-400"
                      aria-hidden="true"
                    />
                  </span>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t("volunteer.allCaughtUp", "All caught up!")}
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    {t(
                      "volunteer.noPendingLoggedHours",
                      "No pending logged hours to verify.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Self-Reported Hours Section */}
      {(viewMode === "all" || viewMode === "self-reported") && (
        <section>
          {viewMode === "all" && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <ClipboardCheck
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
              {t("volunteer.selfReportedHours", "Self-Reported Hours")}
            </h3>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <ValidationQueueDashboard organizationId={profileId} />
          </div>
        </section>
      )}
    </div>
  );
};

export default HoursVerificationTab;
