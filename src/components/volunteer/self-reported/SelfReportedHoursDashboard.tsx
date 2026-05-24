import React, { useState, useCallback } from "react";
import { useSelfReportedHours } from "@/hooks/useSelfReportedHours";
import { SelfReportedHoursStats } from "./SelfReportedHoursStats";
import { SelfReportedHoursList } from "./SelfReportedHoursList";
import { SelfReportedHoursForm } from "./SelfReportedHoursForm";
import {
  SelfReportedHoursInput,
  SelfReportedHoursDisplay,
} from "@/types/selfReportedHours";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Plus, X, Info } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SelfReportedHoursDashboardProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

type ViewMode = "list" | "create" | "edit" | "view";

/**
 * Main dashboard component for managing self-reported volunteer hours
 * @param props - Component props
 * @returns JSX element
 */
export const SelfReportedHoursDashboard: React.FC<
  SelfReportedHoursDashboardProps
> = ({ collapsed = false, onToggle }) => {
  const {
    hours,
    stats,
    loading,
    error,
    filters,
    setFilters,
    createHours,
    updateHours,
    deleteHours,
    getHoursById,
  } = useSelfReportedHours();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedRecord, setSelectedRecord] =
    useState<SelfReportedHoursDisplay | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const { t } = useTranslation();

  const toggleInfo = useCallback(() => {
    setShowInfo((prev) => !prev);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedRecord(null);
    setViewMode("create");
  }, []);

  const handleView = useCallback(
    async (id: string) => {
      const record = await getHoursById(id);
      if (record) {
        setSelectedRecord(record);
        setViewMode("view");
      }
    },
    [getHoursById],
  );

  const handleEdit = useCallback(
    async (id: string) => {
      const record = await getHoursById(id);
      if (record) {
        setSelectedRecord(record);
        setViewMode("edit");
      }
    },
    [getHoursById],
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirm(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteConfirm) {
      const success = await deleteHours(deleteConfirm);
      if (success) {
        setDeleteConfirm(null);
      }
    }
  }, [deleteConfirm, deleteHours]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: SelfReportedHoursInput) => {
      setIsFormLoading(true);
      try {
        if (viewMode === "edit" && selectedRecord) {
          const success = await updateHours(selectedRecord.id, data);
          if (success) {
            setViewMode("list");
            setSelectedRecord(null);
          }
        } else {
          const success = await createHours(data);
          if (success) {
            setViewMode("list");
          }
        }
      } finally {
        setIsFormLoading(false);
      }
    },
    [viewMode, selectedRecord, createHours, updateHours],
  );

  const handleCancel = useCallback(() => {
    setViewMode("list");
    setSelectedRecord(null);
  }, []);

  if (collapsed) {
    return null;
  }

  if (loading && !hours.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("volunteer.volunteerHoursTitle", "Volunteer Hours")}
          </h2>
          <button
            type="button"
            onClick={toggleInfo}
            className={`p-1 rounded-full transition-colors ${
              showInfo
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title={t(
              "volunteer.aboutSelfReported",
              "About Self-Reported Hours",
            )}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === "list" && (
            <Button onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
              {t("volunteer.logHoursButton", "Log Hours")}
            </Button>
          )}
          {onToggle && (
            <Button
              variant="ghost"
              onClick={onToggle}
              icon={<X className="h-4 w-4" />}
            >
              {t("common.close", "Close")}
            </Button>
          )}
        </div>

        {/* Info banner - toggled by (i) button */}
        {showInfo && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  {t(
                    "volunteer.aboutSelfReported",
                    "About Self-Reported Hours",
                  )}
                </p>
                <p className="mt-1">
                  {t(
                    "volunteer.selfReportedInfo",
                    "Only hours validated by verified organizations count toward the Global Impact Rankings. Hours for organizations not on our platform can be tracked but will be marked as \u201cUnvalidated\u201d until validation is received.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleInfo}
                className="text-blue-400 hover:text-blue-600 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === "list" && (
          <>
            {/* Stats */}
            {stats?.recordCount > 0 && (
              <div className="mb-6">
                <SelfReportedHoursStats stats={stats} />
              </div>
            )}

            {/* List */}
            <SelfReportedHoursList
              records={hours}
              loading={loading}
              filters={filters}
              onFilterChange={setFilters}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        {(viewMode === "create" || viewMode === "edit") && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {viewMode === "create"
                ? t("volunteer.logVolunteerHours", "Log Volunteer Hours")
                : t("volunteer.editRecord", "Edit Record")}
            </h3>
            <SelfReportedHoursForm
              initialData={
                selectedRecord
                  ? {
                      activityDate: selectedRecord.activityDate,
                      hours: selectedRecord.hours,
                      activityType: selectedRecord.activityType,
                      description: selectedRecord.description,
                      location: selectedRecord.location,
                      organizationId: selectedRecord.organizationId,
                      organizationName: selectedRecord.organizationName,
                      organizationContactEmail:
                        selectedRecord.organizationContactEmail,
                    }
                  : undefined
              }
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              isEdit={viewMode === "edit"}
              isLoading={isFormLoading}
            />
          </div>
        )}

        {viewMode === "view" && selectedRecord && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("volunteer.recordDetails", "Record Details")}
              </h3>
              <Button variant="ghost" onClick={handleCancel}>
                {t("volunteer.backToList", "Back to List")}
              </Button>
            </div>
            {/* View details - simplified for now */}
            <div className="space-y-4">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(selectedRecord, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("volunteer.deleteRecord", "Delete Record?")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t(
                "volunteer.deleteConfirmation",
                "Are you sure you want to delete this volunteer hours record? This action cannot be undone.",
              )}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={cancelDelete}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                {t("common.delete", "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfReportedHoursDashboard;
